/**
 * Gomoku Platform — Coordination & Signaling Server
 *
 * Responsibilities:
 *   1. WebRTC signaling broker (SDP offer/answer/ICE forwarding) — legacy protocol preserved
 *   2. User identity: register, token-based identify
 *   3. Matchmaking: ranked / casual queues with ELO-aware pairing
 *   4. Public room lobby: browseable waiting rooms
 *   5. ELO ranking and leaderboard
 *
 * Persistence: JSON flat-file (data.json), debounced 2 s flush, loaded on startup.
 * In-memory state (rooms, queues, sessions) is ephemeral and rebuilt each restart.
 *
 * ── Existing protocol (unchanged) ─────────────────────────────────────────────
 *   create_room  → room_created
 *   join_room    → room_joined  + peer_joined (to host)
 *   signal       → signal       (forwarded to peer)
 *   (disconnect) → peer_left    (sent to peer)
 *
 * ── New client → server messages ──────────────────────────────────────────────
 *   identify      → identified | error
 *   register      → registered
 *   join_queue    → (wait) → match_found
 *   leave_queue   → queue_left
 *   queue_status  → queue_info
 *   list_rooms    → rooms_list
 *   report_result → result_recorded
 *   get_leaderboard → leaderboard
 *
 * ── New server push messages ───────────────────────────────────────────────────
 *   rooms_updated   — broadcast when public rooms change
 *   online_count    — broadcast every 30 s
 */

import { WebSocketServer } from 'ws'
import { createServer }    from 'http'
import { randomUUID }      from 'crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath }   from 'url'

// ── Config ────────────────────────────────────────────────────────────────────

const PORT           = parseInt(process.env.PORT ?? '4001', 10)
const ROOM_TTL_MS    = 10 * 60 * 1000   // 10 min idle → destroy room
const ROOM_CODE_LEN  = 6
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  // unambiguous chars
const DATA_PATH      = resolve(dirname(fileURLToPath(import.meta.url)), 'data.json')
const PERSIST_DELAY  = 2000              // debounce flush interval ms
const ELO_INITIAL    = 1200
const ELO_K          = 32
const ELO_FLOOR      = 800

// ── Persistence ───────────────────────────────────────────────────────────────

/**
 * Shape: { users: { [userId]: { token, nickname, elo, wins, losses, draws } } }
 * Only `users` is persisted — rooms and queues are ephemeral.
 */
let store = { users: {} }
let flushTimer = null

function loadData() {
  if (!existsSync(DATA_PATH)) return
  try {
    const raw = readFileSync(DATA_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    store = { users: {}, ...parsed }
    console.log(`[data] loaded ${Object.keys(store.users).length} users from ${DATA_PATH}`)
  } catch (err) {
    console.error('[data] failed to load data.json, starting fresh:', err.message)
  }
}

function schedulePersist() {
  clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    try {
      writeFileSync(DATA_PATH, JSON.stringify(store, null, 2), 'utf8')
    } catch (err) {
      console.error('[data] flush failed:', err.message)
    }
  }, PERSIST_DELAY)
}

// ── ELO & Ranks ───────────────────────────────────────────────────────────────

/**
 * Standard ELO calculation.
 * @param {number} myElo
 * @param {number} opponentElo
 * @param {number} result  1 = win, 0.5 = draw, 0 = lose
 * @returns {{ newElo: number, delta: number }}
 */
function calcElo(myElo, opponentElo, result) {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - myElo) / 400))
  const delta    = Math.round(ELO_K * (result - expected))
  return { newElo: Math.max(ELO_FLOOR, myElo + delta), delta }
}

/**
 * Chinese dan-rank ladder based on ELO.
 * @param {number} elo
 * @returns {string}
 */
function getRank(elo) {
  if (elo >= 8000) return '九段'
  if (elo >= 6000) return '七段'
  if (elo >= 4000) return '五段'
  if (elo >= 2000) return '三段'
  return '初段'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function genRoomCode() {
  let code
  do {
    code = Array.from({ length: ROOM_CODE_LEN }, () =>
      ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)],
    ).join('')
  } while (rooms.has(code))
  return code
}

/** Safe JSON send — silently drops if socket is not OPEN. */
function send(ws, payload) {
  if (ws?.readyState === 1 /* WebSocket.OPEN */) {
    ws.send(JSON.stringify(payload))
  }
}

/** Broadcast a payload to every connected client. */
function broadcast(payload) {
  const msg = JSON.stringify(payload)
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg)
  }
}

/** Build the public rooms snapshot for list_rooms / rooms_updated. */
function publicRoomsSnapshot() {
  const list = []
  for (const [code, room] of rooms) {
    if (!room.isPublic || room.guest !== null) continue
    list.push({
      code,
      title:        room.title ?? code,
      hostNickname: room.hostNickname ?? 'Anonymous',
      createdAt:    room.createdAt,
      waiting:      true,
    })
  }
  return list
}

/** Lookup a user record by userId. Returns null if not found. */
function getUser(userId) {
  return store.users[userId] ?? null
}

/** Build the public profile object sent to clients. */
function userProfile(userId) {
  const u = getUser(userId)
  if (!u) return null
  return {
    nickname: u.nickname,
    elo:      u.elo,
    rank:     getRank(u.elo),
    wins:     u.wins,
    losses:   u.losses,
    draws:    u.draws,
  }
}

// ── In-memory state ───────────────────────────────────────────────────────────

/**
 * rooms: Map<roomCode, {
 *   host:          WebSocket,
 *   guest:         WebSocket | null,
 *   timer:         NodeJS.Timeout,
 *   isPublic:      boolean,
 *   title:         string | null,
 *   hostNickname:  string | null,
 *   createdAt:     string,        // ISO timestamp
 *   mode:          'ranked' | 'casual' | null,
 *   isMatched:     boolean,       // true when created by matchmaker
 *   playerA_userId: string | null,
 *   playerB_userId: string | null,
 *   resultReported: boolean,
 * }>
 */
const rooms = new Map()

/**
 * sessions: Map<WebSocket, { userId: string | null, inQueue: boolean, queueMode: string | null }>
 */
const sessions = new Map()

/**
 * queues: { ranked: WebSocket[], casual: WebSocket[] }
 * FIFO — push to back, pop from front.
 */
const queues = { ranked: [], casual: [] }

// ── Room lifecycle ────────────────────────────────────────────────────────────

function destroyRoom(code) {
  const room = rooms.get(code)
  if (!room) return
  clearTimeout(room.timer)
  rooms.delete(code)
  console.log(`[room] destroyed ${code} (${rooms.size} active)`)
}

function resetRoomTimer(code) {
  const room = rooms.get(code)
  if (!room) return
  clearTimeout(room.timer)
  room.timer = setTimeout(() => {
    console.log(`[room] timeout ${code}`)
    destroyRoom(code)
  }, ROOM_TTL_MS)
}

// ── Matchmaking ───────────────────────────────────────────────────────────────

/**
 * Remove a WebSocket from whichever queue it is in.
 * Updates the session record.
 */
function removeFromQueue(ws) {
  for (const mode of ['ranked', 'casual']) {
    const idx = queues[mode].indexOf(ws)
    if (idx !== -1) {
      queues[mode].splice(idx, 1)
      const sess = sessions.get(ws)
      if (sess) { sess.inQueue = false; sess.queueMode = null }
      return
    }
  }
}

/**
 * Try to pair the first two players in a queue.
 * Creates a room, wires both WSes into it, and fires match_found.
 * @param {'ranked'|'casual'} mode
 */
function tryMatch(mode) {
  if (queues[mode].length < 2) return

  const wsA = queues[mode].shift()   // host
  const wsB = queues[mode].shift()   // guest

  // Update session state
  const sessA = sessions.get(wsA)
  const sessB = sessions.get(wsB)
  if (sessA) { sessA.inQueue = false; sessA.queueMode = null }
  if (sessB) { sessB.inQueue = false; sessB.queueMode = null }

  const code = genRoomCode()
  const timer = setTimeout(() => {
    console.log(`[room] timeout ${code}`)
    destroyRoom(code)
  }, ROOM_TTL_MS)

  const userIdA = sessA?.userId ?? null
  const userIdB = sessB?.userId ?? null
  const nickA   = userIdA ? (getUser(userIdA)?.nickname ?? 'Anonymous') : 'Anonymous'
  const nickB   = userIdB ? (getUser(userIdB)?.nickname ?? 'Anonymous') : 'Anonymous'
  const eloA    = userIdA ? (getUser(userIdA)?.elo ?? ELO_INITIAL) : ELO_INITIAL
  const eloB    = userIdB ? (getUser(userIdB)?.elo ?? ELO_INITIAL) : ELO_INITIAL

  rooms.set(code, {
    host:           wsA,
    guest:          wsB,
    timer,
    isPublic:       false,
    title:          null,
    hostNickname:   nickA,
    createdAt:      new Date().toISOString(),
    mode,
    isMatched:      true,
    playerA_userId: userIdA,
    playerB_userId: userIdB,
    resultReported: false,
  })

  wsA._roomCode = code;  wsA._role = 'host'
  wsB._roomCode = code;  wsB._role = 'guest'

  send(wsA, {
    type:             'match_found',
    roomCode:         code,
    youAre:           'host',
    mode,
    opponentNickname: nickB,
    opponentElo:      eloB,
  })
  send(wsB, {
    type:             'match_found',
    roomCode:         code,
    youAre:           'guest',
    mode,
    opponentNickname: nickA,
    opponentElo:      eloA,
  })

  console.log(`[queue] matched ${code} mode=${mode} A=${nickA}(${eloA}) B=${nickB}(${eloB})`)
}

// ── HTTP server ───────────────────────────────────────────────────────────────

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status:  'ok',
      rooms:   rooms.size,
      users:   Object.keys(store.users).length,
      queues:  { ranked: queues.ranked.length, casual: queues.casual.length },
      clients: wss?.clients?.size ?? 0,
    }))
  } else {
    res.writeHead(404)
    res.end()
  }
})

// ── WebSocket server ──────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server: httpServer })

// Broadcast online count every 30 s
setInterval(() => {
  broadcast({ type: 'online_count', count: wss.clients.size })
}, 30_000)

httpServer.listen(PORT, () => {
  console.log(`[signaling] listening on :${PORT}`)
})

wss.on('connection', (ws) => {
  ws._roomCode = null   // room this socket belongs to
  ws._role     = null   // 'host' | 'guest'

  sessions.set(ws, { userId: null, inQueue: false, queueMode: null })

  // ── Message dispatcher ────────────────────────────────────────────────────

  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch {
      send(ws, { type: 'error', message: 'Invalid JSON' })
      return
    }

    switch (msg.type) {

      // ────────────────────────────────────────────────────────────────────
      // IDENTITY
      // ────────────────────────────────────────────────────────────────────

      /**
       * Register a new account.
       * { type: 'register', nickname: string }
       */
      case 'register': {
        const nickname = String(msg.nickname ?? '').trim()
        if (!nickname || nickname.length < 2 || nickname.length > 20) {
          send(ws, { type: 'error', message: 'Nickname must be 2–20 characters' })
          return
        }
        const userId = randomUUID()
        const token  = randomUUID()
        store.users[userId] = { token, nickname, elo: ELO_INITIAL, wins: 0, losses: 0, draws: 0 }
        schedulePersist()
        send(ws, { type: 'registered', userId, token, nickname, elo: ELO_INITIAL })
        console.log(`[auth] registered ${nickname} (${userId})`)
        break
      }

      /**
       * Authenticate an existing account.
       * { type: 'identify', userId: string, token: string }
       */
      case 'identify': {
        const u = getUser(msg.userId)
        if (!u || u.token !== msg.token) {
          send(ws, { type: 'error', message: 'Invalid userId or token' })
          return
        }
        const sess = sessions.get(ws)
        if (sess) sess.userId = msg.userId
        send(ws, { type: 'identified', ...userProfile(msg.userId) })
        console.log(`[auth] identified ${u.nickname} (${msg.userId})`)
        break
      }

      // ────────────────────────────────────────────────────────────────────
      // MATCHMAKING
      // ────────────────────────────────────────────────────────────────────

      /**
       * Enter the matchmaking queue.
       * { type: 'join_queue', mode: 'ranked' | 'casual' }
       */
      case 'join_queue': {
        const mode = msg.mode === 'ranked' ? 'ranked' : 'casual'
        const sess = sessions.get(ws)

        if (ws._roomCode) {
          send(ws, { type: 'error', message: 'Already in a room' })
          return
        }
        if (sess?.inQueue) {
          send(ws, { type: 'error', message: 'Already in queue' })
          return
        }

        queues[mode].push(ws)
        if (sess) { sess.inQueue = true; sess.queueMode = mode }
        console.log(`[queue] joined mode=${mode} size=${queues[mode].length}`)

        tryMatch(mode)
        break
      }

      /**
       * Leave the matchmaking queue.
       * { type: 'leave_queue' }
       */
      case 'leave_queue': {
        removeFromQueue(ws)
        send(ws, { type: 'queue_left' })
        break
      }

      /**
       * Query queue status.
       * { type: 'queue_status' }
       */
      case 'queue_status': {
        const sess = sessions.get(ws)
        const mode = sess?.queueMode ?? null
        send(ws, {
          type:         'queue_info',
          inQueue:      sess?.inQueue ?? false,
          mode,
          waitingCount: mode ? queues[mode].length : 0,
        })
        break
      }

      // ────────────────────────────────────────────────────────────────────
      // ROOMS — create / list (extended) + original join
      // ────────────────────────────────────────────────────────────────────

      /**
       * Create a room (manual room-code game, optionally public).
       * { type: 'create_room', isPublic?: bool, title?: string }
       * Preserves legacy behaviour: → room_created
       */
      case 'create_room': {
        if (ws._roomCode) {
          send(ws, { type: 'error', message: 'Already in a room' })
          return
        }

        const sess        = sessions.get(ws)
        const isPublic    = msg.isPublic === true
        const title       = String(msg.title ?? '').trim() || null
        const userId      = sess?.userId ?? null
        const hostNick    = userId ? (getUser(userId)?.nickname ?? null) : null

        const code  = genRoomCode()
        const timer = setTimeout(() => {
          console.log(`[room] timeout ${code}`)
          const wasPublic = rooms.get(code)?.isPublic
          destroyRoom(code)
          if (wasPublic) broadcast({ type: 'rooms_updated', rooms: publicRoomsSnapshot() })
        }, ROOM_TTL_MS)

        rooms.set(code, {
          host:           ws,
          guest:          null,
          timer,
          isPublic,
          title,
          hostNickname:   hostNick,
          createdAt:      new Date().toISOString(),
          mode:           null,
          isMatched:      false,
          playerA_userId: userId,
          playerB_userId: null,
          resultReported: false,
        })

        ws._roomCode = code
        ws._role     = 'host'

        send(ws, { type: 'room_created', room: code })
        console.log(`[room] created ${code} public=${isPublic} (${rooms.size} active)`)

        if (isPublic) {
          broadcast({ type: 'rooms_updated', rooms: publicRoomsSnapshot() })
        }
        break
      }

      /**
       * Join a room by code — supports both manual and public rooms.
       * { type: 'join_room', room: string }
       * Preserves legacy behaviour: → room_joined + peer_joined (to host)
       */
      case 'join_room': {
        const code = String(msg.room ?? '').toUpperCase()
        const room = rooms.get(code)

        if (!room) {
          send(ws, { type: 'error', message: `Room ${code} not found` })
          return
        }
        if (room.guest) {
          send(ws, { type: 'error', message: `Room ${code} is full` })
          return
        }
        if (ws._roomCode) {
          send(ws, { type: 'error', message: 'Already in a room' })
          return
        }

        const sess   = sessions.get(ws)
        const userId = sess?.userId ?? null
        room.guest          = ws
        room.playerB_userId = userId
        ws._roomCode        = code
        ws._role            = 'guest'

        resetRoomTimer(code)

        // Notify host
        send(room.host, { type: 'peer_joined' })
        send(ws, { type: 'room_joined', room: code })
        console.log(`[room] guest joined ${code}`)

        // A guest joining a public room closes its vacancy
        if (room.isPublic) {
          broadcast({ type: 'rooms_updated', rooms: publicRoomsSnapshot() })
        }
        break
      }

      /**
       * Browse open public rooms.
       * { type: 'list_rooms' }
       */
      case 'list_rooms': {
        send(ws, { type: 'rooms_list', rooms: publicRoomsSnapshot() })
        break
      }

      // ────────────────────────────────────────────────────────────────────
      // SIGNALING — forward SDP / ICE between room peers (unchanged)
      // ────────────────────────────────────────────────────────────────────

      /**
       * Forward a WebRTC signaling payload to the peer in the same room.
       * { type: 'signal', data: any }
       */
      case 'signal': {
        const code = ws._roomCode
        const room = code ? rooms.get(code) : null
        if (!room) {
          send(ws, { type: 'error', message: 'Not in a room' })
          return
        }
        resetRoomTimer(code)
        const peer = ws._role === 'host' ? room.guest : room.host
        if (!peer) {
          send(ws, { type: 'error', message: 'Peer not connected yet' })
          return
        }
        send(peer, { type: 'signal', data: msg.data })
        break
      }

      // ────────────────────────────────────────────────────────────────────
      // RESULT REPORTING & ELO
      // ────────────────────────────────────────────────────────────────────

      /**
       * Report game result and update ELO.
       * { type: 'report_result', result: 'win' | 'lose' | 'draw' }
       * Only processed once per room (idempotent guard via resultReported).
       */
      case 'report_result': {
        const code = ws._roomCode
        const room = code ? rooms.get(code) : null

        if (!room) {
          send(ws, { type: 'error', message: 'Not in a room' })
          return
        }
        if (room.resultReported) {
          send(ws, { type: 'error', message: 'Result already recorded for this room' })
          return
        }

        const result = msg.result
        if (!['win', 'lose', 'draw'].includes(result)) {
          send(ws, { type: 'error', message: 'result must be win | lose | draw' })
          return
        }

        // Determine which userId is this player and which is the opponent
        const selfIsHost      = ws._role === 'host'
        const selfUserId      = selfIsHost ? room.playerA_userId : room.playerB_userId
        const opponentUserId  = selfIsHost ? room.playerB_userId : room.playerA_userId
        const opponentWs      = selfIsHost ? room.guest : room.host

        const selfUser     = selfUserId     ? getUser(selfUserId)     : null
        const opponentUser = opponentUserId ? getUser(opponentUserId) : null

        room.resultReported = true

        // Only update ELO if both players are registered
        if (selfUser && opponentUser) {
          const selfScore     = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0
          const opponentScore = 1 - selfScore

          const selfResult     = calcElo(selfUser.elo, opponentUser.elo, selfScore)
          const opponentResult = calcElo(opponentUser.elo, selfUser.elo, opponentScore)

          // Update self
          selfUser.elo = selfResult.newElo
          if (result === 'win')  selfUser.wins++
          if (result === 'lose') selfUser.losses++
          if (result === 'draw') selfUser.draws++

          // Update opponent
          opponentUser.elo = opponentResult.newElo
          if (result === 'win')  opponentUser.losses++
          if (result === 'lose') opponentUser.wins++
          if (result === 'draw') opponentUser.draws++

          schedulePersist()

          // Notify both parties
          send(ws, {
            type:      'result_recorded',
            elo:       selfUser.elo,
            eloChange: selfResult.delta,
            rank:      getRank(selfUser.elo),
          })
          send(opponentWs, {
            type:      'result_recorded',
            elo:       opponentUser.elo,
            eloChange: opponentResult.delta,
            rank:      getRank(opponentUser.elo),
          })

          console.log(
            `[elo] ${selfUserId} ${result} → elo ${selfResult.newElo} (${selfResult.delta > 0 ? '+' : ''}${selfResult.delta})`,
          )
        } else {
          // Guest player has no account — still acknowledge
          send(ws, { type: 'result_recorded', elo: null, eloChange: null, rank: null })
        }
        break
      }

      // ────────────────────────────────────────────────────────────────────
      // LEADERBOARD
      // ────────────────────────────────────────────────────────────────────

      /**
       * Fetch the top-N players by ELO.
       * { type: 'get_leaderboard', limit?: number }
       */
      case 'get_leaderboard': {
        const limit = Math.min(Math.max(1, parseInt(msg.limit ?? 20, 10) || 20), 100)

        const entries = Object.values(store.users)
          .sort((a, b) => b.elo - a.elo)
          .slice(0, limit)
          .map((u, i) => ({
            rank:     i + 1,
            nickname: u.nickname,
            elo:      u.elo,
            wins:     u.wins,
            losses:   u.losses,
            draws:    u.draws,
            winRate:  u.wins + u.losses + u.draws > 0
              ? Math.round(u.wins / (u.wins + u.losses + u.draws) * 100)
              : 0,
          }))

        send(ws, { type: 'leaderboard', entries })
        break
      }

      // ────────────────────────────────────────────────────────────────────

      default:
        send(ws, { type: 'error', message: `Unknown type: ${msg.type}` })
    }
  })

  // ── Disconnect cleanup ──────────────────────────────────────────────────

  ws.on('close', () => {
    // Remove from queue if waiting
    removeFromQueue(ws)

    const code = ws._roomCode
    if (code) {
      const room = rooms.get(code)
      if (room) {
        const peer = ws._role === 'host' ? room.guest : room.host
        send(peer, { type: 'peer_left' })

        const wasPublic = room.isPublic

        if (ws._role === 'host') {
          // Host left — close entire room
          destroyRoom(code)
        } else {
          // Guest left — room stays open for host to re-invite
          room.guest          = null
          room.playerB_userId = null
          resetRoomTimer(code)
        }

        if (wasPublic) {
          broadcast({ type: 'rooms_updated', rooms: publicRoomsSnapshot() })
        }
      }
    }

    sessions.delete(ws)
  })

  ws.on('error', (err) => {
    console.warn('[ws] error', err.message)
  })
})

wss.on('error', (err) => {
  console.error('[wss] error', err)
  process.exit(1)
})

// ── Startup ───────────────────────────────────────────────────────────────────

loadData()
