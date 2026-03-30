/**
 * Trusted Games — Cloudflare Workers Signaling + Platform Server
 *
 * Architecture:
 *   Worker (HTTP/WS entry) → GameServer Durable Object (single instance "main")
 *
 * The Durable Object holds all state:
 *   - rooms (Map): WebRTC signaling rooms
 *   - sessions (Map): per-WS session data
 *   - queues: matchmaking queues
 *   - users: persisted via DO storage API
 */

import {
  validateRankedReport,
  witnessProcessRoomInit,
  witnessProcessMove,
  witnessProcessUndoPop,
  witnessProcessResign,
} from './witnessLogic.js'

// ─── Worker entry ─────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // ── TURN credentials (Worker-level, no DO needed) ──────────────────────
    if (url.pathname === '/api/turn') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS })
      }
      return handleTurn(env)
    }

    // Route everything else to the single GameServer DO instance
    const id = env.GAME_SERVER.idFromName('main')
    const stub = env.GAME_SERVER.get(id)
    return stub.fetch(request)
  }
}

/**
 * Generate Cloudflare TURN credentials.
 * Requires secrets: CF_TURN_KEY_ID, CF_TURN_API_TOKEN
 * Falls back to empty list (STUN-only) if secrets are missing.
 */
async function handleTurn(env) {
  if (!env.CF_TURN_KEY_ID || !env.CF_TURN_API_TOKEN) {
    return Response.json({ iceServers: [] }, { headers: CORS })
  }
  try {
    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${env.CF_TURN_KEY_ID}/credentials/generate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.CF_TURN_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: 86400 }),
      }
    )
    if (!res.ok) return Response.json({ iceServers: [] }, { headers: CORS })
    const data = await res.json()
    return Response.json({ iceServers: data.iceServers ?? [] }, { headers: CORS })
  } catch {
    return Response.json({ iceServers: [] }, { headers: CORS })
  }
}

// ─── GameServer Durable Object ─────────────────────────────────────────────────

const ROOM_CODE_LEN   = 6
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ROOM_TTL_MS     = 10 * 60 * 1000
const ELO_INITIAL     = 1200
const ELO_K           = 32
const ELO_FLOOR       = 800

export class GameServer {
  constructor(state, env) {
    this.state = state
    // In-memory ephemeral state (rebuilt on cold start)
    this.rooms    = new Map()  // code → { host, guest, timer, isPublic, title, hostNickname, isMatched, mode, playerA_userId, playerB_userId, resultReported }
    this.sessions = new Map()  // ws → { userId, inQueue, queueMode }
    this.queues   = { ranked: [], casual: [] }
    // Users loaded lazily from DO storage
    this.users    = null  // { [userId]: { token, nickname, elo, wins, losses, draws } }
    this.usersLoaded = false
  }

  // ── DO fetch handler ────────────────────────────────────────────────────────

  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      await this.ensureUsersLoaded()
      return Response.json({
        status: 'ok',
        rooms: this.rooms.size,
        users: Object.keys(this.users).length,
        queues: { ranked: this.queues.ranked.length, casual: this.queues.casual.length },
        clients: this.sessions.size,
      })
    }

    const upgradeHeader = request.headers.get('Upgrade') ?? ''
    if (upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    // Accept WebSocket using hibernatable API
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    this.state.acceptWebSocket(server)
    this.sessions.set(server, { userId: null, inQueue: false, queueMode: null, queuedAt: null })
    return new Response(null, { status: 101, webSocket: client })
  }

  // ── Attachment & session helpers ────────────────────────────────────────────

  _att(ws) { return ws.deserializeAttachment() ?? {} }

  _session(ws) {
    if (!this.sessions.has(ws)) {
      this.sessions.set(ws, { userId: null, inQueue: false, queueMode: null, queuedAt: null })
    }
    const s = this.sessions.get(ws)
    if (s.queuedAt === undefined) s.queuedAt = null
    return s
  }

  // ── WebSocket lifecycle ──────────────────────────────────────────────────────

  async webSocketMessage(ws, message) {
    await this.ensureUsersLoaded()
    let msg
    try { msg = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message)) }
    catch { this.send(ws, { type: 'error', message: 'Invalid JSON' }); return }

    switch (msg.type) {

      // ── Identity ─────────────────────────────────────────────────────────
      case 'register': {
        const nickname = String(msg.nickname ?? '').trim().slice(0, 24) || 'Player'
        const userId = crypto.randomUUID()
        const token  = crypto.randomUUID()
        this.users[userId] = { token, nickname, elo: ELO_INITIAL, wins: 0, losses: 0, draws: 0 }
        await this.persistUsers()
        const session = this._session(ws)
        session.userId = userId
        this.send(ws, { type: 'registered', userId, token, nickname, elo: ELO_INITIAL })
        this.broadcastOnlineCount()
        break
      }

      case 'identify': {
        const u = this.users[msg.userId]
        if (!u || u.token !== msg.token) {
          this.send(ws, { type: 'error', message: '身份验证失败' })
          return
        }
        const session = this._session(ws)
        session.userId = msg.userId
        this.send(ws, {
          type: 'identified',
          userId: msg.userId,
          nickname: u.nickname,
          elo: u.elo,
          rank: getRank(u.elo),
          wins: u.wins,
          losses: u.losses,
          draws: u.draws,
        })
        this.broadcastOnlineCount()
        break
      }

      // ── Matchmaking ──────────────────────────────────────────────────────
      case 'join_queue': {
        const mode = msg.mode === 'casual' ? 'casual' : 'ranked'
        const session = this._session(ws)
        if (session?.inQueue) { this.send(ws, { type: 'error', message: 'Already in queue' }); return }
        if (session) {
          session.inQueue = true
          session.queueMode = mode
          session.queuedAt = Date.now()
        }
        this.queues[mode].push(ws)
        this.tryMatch(mode)
        break
      }

      case 'leave_queue': {
        this.removeFromQueue(ws)
        this.send(ws, { type: 'queue_left' })
        break
      }

      case 'queue_status': {
        const session = this._session(ws)
        const mode = session?.queueMode ?? 'ranked'
        this.send(ws, {
          type: 'queue_info',
          inQueue: session?.inQueue ?? false,
          mode,
          waitingCount: this.queues[mode].length,
        })
        break
      }

      // ── Rooms ────────────────────────────────────────────────────────────
      case 'create_room': {
        this.pruneStaleRooms()
        if (this._att(ws).roomCode) { this.send(ws, { type: 'error', message: 'Already in a room' }); return }
        const code = this.genRoomCode()
        const isPublic = Boolean(msg.isPublic)
        const title = String(msg.title ?? '').trim().slice(0, 40)
        const session = this._session(ws)
        const hostUser = session?.userId ? this.users[session.userId] : null
        const timer = this.makeRoomTimer(code)
        this.rooms.set(code, {
          host: ws, guest: null, timer,
          isPublic, title, hostNickname: hostUser?.nickname ?? '匿名',
          createdAt: Date.now(),
          isMatched: false, mode: null, playerA_userId: null, playerB_userId: null,
          resultReported: false,
        })
        ws.serializeAttachment({ roomCode: code, role: 'host' })
        this.send(ws, { type: 'room_created', room: code })
        if (isPublic) this.broadcastRoomsUpdated()
        console.log(`[room] created ${code}`)
        break
      }

      case 'join_room': {
        this.pruneStaleRooms()
        const code = String(msg.room ?? '').toUpperCase()
        const room = this.rooms.get(code)
        if (!room) { this.send(ws, { type: 'error', message: `Room ${code} not found` }); return }
        if (room.guest) { this.send(ws, { type: 'error', message: `Room ${code} is full` }); return }
        room.guest = ws
        ws.serializeAttachment({ roomCode: code, role: 'guest' })
        this.resetRoomTimer(code)
        this.send(room.host, { type: 'peer_joined' })
        this.send(ws, { type: 'room_joined', room: code })
        if (room.isPublic) this.broadcastRoomsUpdated()
        console.log(`[room] guest joined ${code}`)
        break
      }

      case 'signal': {
        const code = this._att(ws).roomCode
        const room = code ? this.rooms.get(code) : null
        if (!room) { this.send(ws, { type: 'error', message: 'Not in a room' }); return }
        this.resetRoomTimer(code)
        const peer = this._att(ws).role === 'host' ? room.guest : room.host
        if (!peer) { this.send(ws, { type: 'error', message: 'Peer not connected yet' }); return }
        this.send(peer, { type: 'signal', data: msg.data })
        break
      }

      case 'list_rooms': {
        this.pruneStaleRooms()
        const list = []
        for (const [code, room] of this.rooms) {
          if (room.isPublic && !room.guest) {
            list.push({ code, title: room.title, hostNickname: room.hostNickname, createdAt: room.createdAt, waiting: true })
          }
        }
        this.send(ws, { type: 'rooms_list', rooms: list })
        break
      }

      case 'report_result': {
        const att = this._att(ws)
        const code = att.roomCode
        const room = code ? this.rooms.get(code) : null
        if (!room || room.resultReported) return

        const result = msg.result  // 'win' | 'lose' | 'draw'
        const session = this._session(ws)
        const myUserId = session?.userId
        const peerWs = att.role === 'host' ? room.guest : room.host
        const peerSession = peerWs ? this._session(peerWs) : null
        const peerUserId = peerSession?.userId

        // 休闲 / 好友房 / 未标记 ranked：不计分，只 ack
        if (room.mode !== 'ranked') {
          room.resultReported = true
          this.send(ws, { type: 'result_recorded', ranked: false })
          if (peerWs) this.send(peerWs, { type: 'result_recorded', ranked: false })
          break
        }

        // 天梯：必须与见证链尖哈希 + 终局状态一致，否则不计分
        const reportGameId = String(msg.gameId ?? '')
        const chainHash = String(msg.chainHash ?? '')
        const v = validateRankedReport(room.witness, att.role, result, reportGameId, chainHash)
        if (!v.ok) {
          this.send(ws, {
            type: 'result_recorded',
            ranked: false,
            witnessRejected: true,
            message: v.message,
          })
          break
        }

        room.resultReported = true

        if (myUserId && this.users[myUserId] && peerUserId && this.users[peerUserId]) {
          const me = this.users[myUserId]
          const peer = this.users[peerUserId]
          const myResult = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0
          const peerResult = 1 - myResult
          const myElo   = calcElo(me.elo, peer.elo, myResult)
          const peerElo = calcElo(peer.elo, me.elo, peerResult)
          me.elo   = myElo.newElo
          peer.elo = peerElo.newElo
          if (result === 'win')  { me.wins++;   peer.losses++ }
          if (result === 'lose') { me.losses++; peer.wins++ }
          if (result === 'draw') { me.draws++;  peer.draws++ }
          await this.persistUsers()
          this.send(ws, {
            type: 'result_recorded',
            ranked: true,
            elo: me.elo,
            eloChange: myElo.delta,
            rank: getRank(me.elo),
          })
          if (peerWs) {
            this.send(peerWs, {
              type: 'result_recorded',
              ranked: true,
              elo: peer.elo,
              eloChange: peerElo.delta,
              rank: getRank(peer.elo),
            })
          }
        } else {
          const bare = { type: 'result_recorded', ranked: true, elo: null, eloChange: null, rank: null }
          this.send(ws, bare)
          if (peerWs) this.send(peerWs, bare)
        }
        break
      }

      case 'get_leaderboard': {
        const limit = Math.min(Number(msg.limit ?? 20), 100)
        const entries = Object.entries(this.users)
          .map(([, u]) => ({
            nickname: u.nickname,
            elo: u.elo,
            rank: getRank(u.elo),
            wins: u.wins,
            losses: u.losses,
            draws: u.draws,
            winRate: (u.wins + u.losses + u.draws) > 0
              ? Math.round(u.wins / (u.wins + u.losses + u.draws) * 100)
              : 0,
          }))
          .sort((a, b) => b.elo - a.elo)
          .slice(0, limit)
          .map((e, i) => ({ ...e, rank: i + 1, tier: getRank(e.elo) }))
        this.send(ws, { type: 'leaderboard', entries })
        break
      }

      case 'witness_room_init': {
        const att = this._att(ws)
        const code = att.roomCode
        const room = code ? this.rooms.get(code) : null
        if (code) this.resetRoomTimer(code)
        const out = await witnessProcessRoomInit(room, att.role, msg)
        this.send(ws, out)
        break
      }

      case 'move_witness': {
        const att = this._att(ws)
        const code = att.roomCode
        const room = code ? this.rooms.get(code) : null
        if (code) this.resetRoomTimer(code)
        const out = await witnessProcessMove(room, att.role, msg)
        this.send(ws, out)
        break
      }

      case 'witness_undo_pop': {
        const att = this._att(ws)
        const code = att.roomCode
        const room = code ? this.rooms.get(code) : null
        if (code) this.resetRoomTimer(code)
        const out = witnessProcessUndoPop(room, att.role, msg)
        if (out) this.send(ws, out)
        break
      }

      case 'witness_resign': {
        const att = this._att(ws)
        const code = att.roomCode
        const room = code ? this.rooms.get(code) : null
        if (code) this.resetRoomTimer(code)
        const out = witnessProcessResign(room, att.role, msg)
        this.send(ws, out)
        break
      }

      default:
        this.send(ws, { type: 'error', message: `Unknown type: ${msg.type}` })
    }
  }

  async webSocketClose(ws) {
    const { roomCode: code, role } = this._att(ws)
    this.removeFromQueue(ws)
    this.sessions.delete(ws)
    this.broadcastOnlineCount()

    if (!code) return
    const room = this.rooms.get(code)
    if (!room) return

    const peer = role === 'host' ? room.guest : room.host
    if (peer) this.send(peer, { type: 'peer_left' })

    if (role === 'host') {
      this.destroyRoom(code)
      if (room.isPublic) this.broadcastRoomsUpdated()
    } else {
      room.guest = null
      this.resetRoomTimer(code)
      if (room.isPublic) this.broadcastRoomsUpdated()
    }
  }

  async webSocketError(ws, error) {
    console.warn('[ws] error', error)
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  send(ws, payload) {
    try {
      if (ws?.readyState === WebSocket.OPEN || ws?.readyState === 1) {
        ws.send(JSON.stringify(payload))
      }
    } catch {}
  }

  genRoomCode() {
    let code
    do {
      code = Array.from({ length: ROOM_CODE_LEN }, () =>
        ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
      ).join('')
    } while (this.rooms.has(code))
    return code
  }

  makeRoomTimer(code) {
    // Durable Objects don't support setTimeout in hibernation mode
    // Use DO alarm instead, or just track createdAt and check on access
    // For simplicity: track lastActivity and prune on list/join
    return null
  }

  pruneStaleRooms() {
    const now = Date.now()
    for (const [code, room] of this.rooms) {
      const age = now - (room.lastActivity ?? room.createdAt ?? 0)
      if (age > 10 * 60 * 1000) {  // 10 min
        // notify host/guest if still connected
        if (room.host) this.send(room.host, { type: 'peer_left' })
        if (room.guest) this.send(room.guest, { type: 'peer_left' })
        this.rooms.delete(code)
      }
    }
  }

  resetRoomTimer(code) {
    const room = this.rooms.get(code)
    if (room) room.lastActivity = Date.now()
  }

  destroyRoom(code) {
    this.rooms.delete(code)
  }

  removeFromQueue(ws) {
    const session = this.sessions.get(ws)
    if (session?.inQueue) {
      session.inQueue = false
      session.queuedAt = null
      const mode = session.queueMode ?? 'ranked'
      this.queues[mode] = this.queues[mode].filter(w => w !== ws)
    }
  }

  _eloForWs(ws) {
    const uid = this._session(ws)?.userId
    if (!uid || !this.users?.[uid]) return ELO_INITIAL
    return this.users[uid].elo ?? ELO_INITIAL
  }

  /** 段位队列最长等待（用于超时回退 FIFO，避免饿死） */
  _rankedQueueMaxWaitMs() {
    const now = Date.now()
    let max = 0
    for (const ws of this.queues.ranked) {
      const qAt = this._session(ws)?.queuedAt
      const wait = qAt != null ? now - qAt : 0
      max = Math.max(max, wait)
    }
    return max
  }

  /**
   * 段位：在 Elo 允许的「扩圈带」内选 |ΔElo| 最小的一对；否则不配。
   * 休闲：严格 FIFO，最快开局。
   */
  tryMatch(mode) {
    if (mode === 'casual') {
      while (this.queues.casual.length >= 2) this._tryMatchFIFO('casual')
      return
    }
    while (this.queues.ranked.length >= 2) {
      if (this._tryPairRankedByElo()) continue
      if (this._rankedQueueMaxWaitMs() > 90_000) {
        this._tryMatchFIFO('ranked')
        continue
      }
      break
    }
  }

  _tryMatchFIFO(mode) {
    const q = this.queues[mode]
    if (q.length < 2) return
    const wsA = q.shift()
    const wsB = q.shift()
    this._finalizePair(wsA, wsB, mode)
  }

  _tryPairRankedByElo() {
    const q = this.queues.ranked
    if (q.length < 2) return false
    const now = Date.now()
    const BAND0 = 120
    const GROW_PER_SEC = 22
    const BAND_MAX = 700
    let bestI = -1
    let bestJ = -1
    let bestDiff = Infinity
    for (let i = 0; i < q.length; i++) {
      const wsA = q[i]
      const eloA = this._eloForWs(wsA)
      const sA = this._session(wsA)
      const waitA = sA?.queuedAt != null ? now - sA.queuedAt : 0
      for (let j = i + 1; j < q.length; j++) {
        const wsB = q[j]
        const eloB = this._eloForWs(wsB)
        const sB = this._session(wsB)
        const waitB = sB?.queuedAt != null ? now - sB.queuedAt : 0
        const wait = Math.min(waitA, waitB)
        const band = Math.min(BAND_MAX, BAND0 + Math.floor(wait / 1000) * GROW_PER_SEC)
        const diff = Math.abs(eloA - eloB)
        if (diff <= band && diff < bestDiff) {
          bestDiff = diff
          bestI = i
          bestJ = j
        }
      }
    }
    if (bestI < 0) return false
    const hi = Math.max(bestI, bestJ)
    const lo = Math.min(bestI, bestJ)
    const wsB = q.splice(hi, 1)[0]
    const wsA = q.splice(lo, 1)[0]
    this._finalizePair(wsA, wsB, 'ranked')
    return true
  }

  _finalizePair(wsA, wsB, mode) {
    const sA = this.sessions.get(wsA)
    const sB = this.sessions.get(wsB)
    if (sA) { sA.inQueue = false; sA.queuedAt = null }
    if (sB) { sB.inQueue = false; sB.queuedAt = null }

    const code = this.genRoomCode()
    const userA = sA?.userId ? this.users[sA.userId] : null
    const userB = sB?.userId ? this.users[sB.userId] : null
    this.rooms.set(code, {
      host: wsA, guest: wsB, timer: null, lastActivity: Date.now(),
      isPublic: false, title: '', hostNickname: userA?.nickname ?? '匿名',
      createdAt: Date.now(), isMatched: true, mode,
      playerA_userId: sA?.userId ?? null, playerB_userId: sB?.userId ?? null,
      resultReported: false,
    })
    wsA.serializeAttachment({ roomCode: code, role: 'host' })
    wsB.serializeAttachment({ roomCode: code, role: 'guest' })

    this.send(wsA, { type: 'match_found', roomCode: code, youAre: 'host', mode, opponentNickname: userB?.nickname ?? '匿名', opponentElo: userB?.elo ?? ELO_INITIAL })
    this.send(wsB, { type: 'match_found', roomCode: code, youAre: 'guest', mode, opponentNickname: userA?.nickname ?? '匿名', opponentElo: userA?.elo ?? ELO_INITIAL })
    console.log(`[match] paired ${code} mode=${mode}`)
  }

  broadcastRoomsUpdated() {
    const list = []
    for (const [code, room] of this.rooms) {
      if (room.isPublic && !room.guest) {
        list.push({ code, title: room.title, hostNickname: room.hostNickname, createdAt: room.createdAt, waiting: true })
      }
    }
    const msg = JSON.stringify({ type: 'rooms_updated', rooms: list })
    for (const [ws] of this.sessions) {
      try { ws.send(msg) } catch {}
    }
  }

  broadcastOnlineCount() {
    const count = this.sessions.size
    const msg = JSON.stringify({ type: 'online_count', count })
    for (const [ws] of this.sessions) {
      try { ws.send(msg) } catch {}
    }
  }

  async ensureUsersLoaded() {
    if (this.usersLoaded) return
    this.usersLoaded = true
    const stored = await this.state.storage.get('users')
    this.users = stored ?? {}
  }

  async persistUsers() {
    await this.state.storage.put('users', this.users)
  }
}

// ── ELO & Rank helpers ────────────────────────────────────────────────────────

function calcElo(myElo, opponentElo, result) {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - myElo) / 400))
  const delta    = Math.round(ELO_K * (result - expected))
  return { newElo: Math.max(ELO_FLOOR, myElo + delta), delta }
}

function getRank(elo) {
  if (elo >= 8000) return '九段'
  if (elo >= 6000) return '七段'
  if (elo >= 4000) return '五段'
  if (elo >= 2000) return '三段'
  return '初段'
}
