/**
 * usePlatformConn — Platform connection hook for online matchmaking.
 *
 * Manages:
 *  - User identity (localStorage persist)
 *  - Persistent WebSocket to signaling server
 *  - Queue, rooms, leaderboard
 *  - Matchmaking P2P: when match_found arrives, performs WebRTC handshake
 *    on the same WS and calls onMatchReady({ conn, matchInfo, role })
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  createPeerConnection, encodeOffer, decodeOffer,
  encodeAnswer, decodeAnswer, waitForICE,
} from '../lib/webrtc.js'
import {
  generateECDHKeyPair, exportPublicKey, importPublicKey,
  deriveSessionKey, encryptMessage, decryptMessage,
} from '../lib/p2pCrypto.js'

const SIGNALING_URL =
  import.meta.env.VITE_SIGNALING_URL ??
  (window.location.hostname === 'localhost' ? 'ws://localhost:4001' : null)

const LS_KEY = 'tg_user'

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveUser(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

export function usePlatformConn({ onMatchReady, onMove, onResign, onNewGame, onRoomInit } = {}) {
  const isAvailable = Boolean(SIGNALING_URL)

  // ── User identity ──────────────────────────────────────────────────────────
  const [user, setUser] = useState(() => loadStoredUser())
  const [isOnline, setIsOnline] = useState(false)
  const [onlineCount, setOnlineCount] = useState(0)

  // ── Queue state ────────────────────────────────────────────────────────────
  const [queueState, setQueueState] = useState('idle') // 'idle' | 'queuing' | 'matched'
  const [queueMode, setQueueMode] = useState(null)
  const [matchInfo, setMatchInfo] = useState(null)

  // ── Rooms ──────────────────────────────────────────────────────────────────
  const [rooms, setRooms] = useState([])
  const [roomsLoading, setRoomsLoading] = useState(false)

  // ── Leaderboard ────────────────────────────────────────────────────────────
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

  // ── Refs ───────────────────────────────────────────────────────────────────
  const wsRef          = useRef(null)
  const reconnectTimer = useRef(null)
  const mountedRef     = useRef(true)
  const userRef        = useRef(user)
  const onMatchReadyRef = useRef(onMatchReady)
  const onMoveRef      = useRef(onMove)
  const onResignRef    = useRef(onResign)
  const onNewGameRef   = useRef(onNewGame)
  const onRoomInitRef  = useRef(onRoomInit)

  // P2P refs (for matched game)
  const pcRef          = useRef(null)
  const channelRef     = useRef(null)
  const sessionKeyRef  = useRef(null)
  const myKeyPairRef   = useRef(null)
  const p2pRoleRef     = useRef(null) // 'host' | 'guest'
  const matchInfoRef   = useRef(null)

  useEffect(() => { userRef.current = user }, [user])
  useEffect(() => { onMatchReadyRef.current = onMatchReady }, [onMatchReady])
  useEffect(() => { onMoveRef.current     = onMove     }, [onMove])
  useEffect(() => { onResignRef.current   = onResign   }, [onResign])
  useEffect(() => { onNewGameRef.current  = onNewGame  }, [onNewGame])
  useEffect(() => { onRoomInitRef.current = onRoomInit }, [onRoomInit])

  // ── WebSocket send helper ──────────────────────────────────────────────────
  const wsSend = useCallback((obj) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj))
    }
  }, [])

  // ── DataChannel send (encrypted) ──────────────────────────────────────────
  const dcSend = useCallback(async (msg) => {
    const ch = channelRef.current
    if (!ch || ch.readyState !== 'open') return
    const payload = JSON.stringify(msg)
    if (sessionKeyRef.current) {
      const { iv, ciphertext } = await encryptMessage(sessionKeyRef.current, payload)
      ch.send(JSON.stringify({ iv, ciphertext }))
    } else {
      ch.send(payload)
    }
  }, [])

  // ── Build external conn interface ──────────────────────────────────────────
  const buildConnInterface = useCallback((role) => ({
    isConnected: true,
    isEncrypted: Boolean(sessionKeyRef.current),
    role,
    sendMove:    (r, c, hash) => dcSend({ type: 'MOVE', r, c, hash }),
    sendResign:  ()           => dcSend({ type: 'RESIGN' }),
    sendNewGame: (gameId)     => dcSend({ type: 'NEW_GAME', gameId }),
    sendRoomInit:(gameId)     => dcSend({ type: 'ROOM_INIT', gameId }),
  }), [dcSend])

  // ── DataChannel message handler ────────────────────────────────────────────
  const handleChannelMessage = useCallback(async ({ data }) => {
    let parsed
    try { parsed = JSON.parse(data) } catch { return }

    if (parsed.type === 'KEY_EXCHANGE') {
      try {
        const theirPubKey = await importPublicKey(parsed.publicKey)
        const sessionKey  = await deriveSessionKey(myKeyPairRef.current.privateKey, theirPubKey)
        sessionKeyRef.current = sessionKey
        // Channel is now encrypted — call onMatchReady
        const role = p2pRoleRef.current
        const mi   = matchInfoRef.current
        onMatchReadyRef.current?.({
          conn: buildConnInterface(role),
          matchInfo: mi,
          role,
        })
      } catch (e) {
        console.error('[platform] ECDH handshake failed:', e)
      }
      return
    }

    // Decrypt if session key is established
    let decrypted = parsed
    if (parsed.iv && parsed.ciphertext && sessionKeyRef.current) {
      try {
        decrypted = JSON.parse(
          await decryptMessage(sessionKeyRef.current, parsed.iv, parsed.ciphertext)
        )
      } catch { return }
    }

    // Route incoming game messages to the registered callbacks
    if (decrypted.type === 'ROOM_INIT') onRoomInitRef.current?.(decrypted.gameId)
    if (decrypted.type === 'MOVE')      onMoveRef.current?.(decrypted.r, decrypted.c, decrypted.hash)
    if (decrypted.type === 'RESIGN')    onResignRef.current?.()
    if (decrypted.type === 'NEW_GAME')  onNewGameRef.current?.(decrypted.gameId)
  }, [buildConnInterface])

  // ── Setup DataChannel ──────────────────────────────────────────────────────
  const setupChannel = useCallback((ch) => {
    channelRef.current = ch
    ch.onmessage = handleChannelMessage
    ch.onopen = async () => {
      myKeyPairRef.current = await generateECDHKeyPair()
      const pubKey = await exportPublicKey(myKeyPairRef.current.publicKey)
      ch.send(JSON.stringify({ type: 'KEY_EXCHANGE', publicKey: pubKey }))
    }
  }, [handleChannelMessage])

  // ── P2P setup for HOST ─────────────────────────────────────────────────────
  const setupAsHost = useCallback(async () => {
    const pc = createPeerConnection()
    pcRef.current = pc
    p2pRoleRef.current = 'host'

    const ch = pc.createDataChannel('game')
    setupChannel(ch)

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await waitForICE(pc)

    wsSend({ type: 'signal', data: { type: 'offer', offer: encodeOffer(pc.localDescription) } })
  }, [setupChannel, wsSend])

  // ── P2P setup for GUEST (triggered on signal/offer) ───────────────────────
  const handleGuestOffer = useCallback(async (offerCode) => {
    const pc = createPeerConnection()
    pcRef.current = pc
    p2pRoleRef.current = 'guest'

    pc.ondatachannel = ({ channel }) => setupChannel(channel)

    const offerDesc = decodeOffer(offerCode)
    if (!offerDesc) { console.error('[platform] bad offer code'); return }
    await pc.setRemoteDescription(offerDesc)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    await waitForICE(pc)

    wsSend({ type: 'signal', data: { type: 'answer', answer: encodeAnswer(pc.localDescription) } })
  }, [setupChannel, wsSend])

  // ── WS message dispatch ────────────────────────────────────────────────────
  const handleWsMessage = useCallback(async (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }

    switch (msg.type) {
      case 'registered': {
        const u = {
          userId:   msg.userId,
          token:    msg.token,
          nickname: msg.nickname,
          elo:      msg.elo ?? 1200,
          rank:     msg.rank ?? null,
          wins:     msg.wins ?? 0,
          losses:   msg.losses ?? 0,
          draws:    msg.draws ?? 0,
        }
        saveUser({ userId: u.userId, token: u.token, nickname: u.nickname })
        if (mountedRef.current) {
          setUser(u)
          setIsOnline(true)
        }
        break
      }

      case 'identified': {
        if (mountedRef.current) {
          setUser(prev => ({
            ...prev,
            nickname: msg.nickname,
            elo:      msg.elo ?? prev?.elo ?? 1200,
            rank:     msg.rank ?? null,
            wins:     msg.wins ?? 0,
            losses:   msg.losses ?? 0,
            draws:    msg.draws ?? 0,
          }))
          setIsOnline(true)
        }
        break
      }

      case 'online_count':
        if (mountedRef.current) setOnlineCount(msg.count)
        break

      case 'queue_info':
        if (mountedRef.current) {
          if (!msg.inQueue && queueState === 'queuing') setQueueState('idle')
        }
        break

      case 'queue_left':
        if (mountedRef.current) {
          setQueueState('idle')
          setQueueMode(null)
        }
        break

      case 'match_found': {
        const mi = {
          roomCode:        msg.roomCode,
          youAre:          msg.youAre,
          mode:            msg.mode,
          opponentNickname: msg.opponentNickname,
          opponentElo:     msg.opponentElo,
        }
        matchInfoRef.current = mi
        if (mountedRef.current) {
          setMatchInfo(mi)
          setQueueState('matched')
        }
        // Kick off WebRTC based on role
        if (msg.youAre === 'host') {
          try { await setupAsHost() } catch (e) { console.error('[platform] host P2P setup:', e) }
        }
        // Guest waits for the 'signal' message with the offer
        break
      }

      case 'signal': {
        // P2P signaling messages
        if (msg.data?.type === 'offer' && p2pRoleRef.current === null) {
          // We are guest and received offer
          p2pRoleRef.current = 'guest'
          try { await handleGuestOffer(msg.data.offer) } catch (e) { console.error('[platform] guest offer:', e) }
        } else if (msg.data?.type === 'answer' && p2pRoleRef.current === 'host' && pcRef.current) {
          // Host received answer
          try {
            const answerDesc = decodeAnswer(msg.data.answer)
            await pcRef.current.setRemoteDescription(answerDesc)
          } catch (e) { console.error('[platform] answer:', e) }
        }
        break
      }

      case 'peer_joined':
        // Server notifies host that guest has joined the room — no action needed,
        // host already sent offer immediately after match_found
        break

      case 'rooms_list':
        if (mountedRef.current) {
          setRooms(msg.rooms ?? [])
          setRoomsLoading(false)
        }
        break

      case 'rooms_updated':
        if (mountedRef.current) setRooms(msg.rooms ?? [])
        break

      case 'room_created':
        if (mountedRef.current) {
          // Room code returned — caller handles via joinPublicRoom / createPublicRoom flow
          // Emit as a custom event for UI to pick up
          if (mountedRef.current) {
            const event = new CustomEvent('platform:room_created', { detail: msg })
            window.dispatchEvent(event)
          }
        }
        break

      case 'leaderboard':
        if (mountedRef.current) {
          setLeaderboard(msg.entries ?? [])
          setLeaderboardLoading(false)
        }
        break

      case 'result_recorded':
        if (mountedRef.current) {
          setUser(prev => prev ? {
            ...prev,
            elo:  msg.elo  ?? prev.elo,
            rank: msg.rank ?? prev.rank,
          } : prev)
        }
        break

      case 'error':
        console.warn('[platform] server error:', msg.message)
        break

      default:
        break
    }
  }, [queueState, setupAsHost, handleGuestOffer])

  // ── Connect WebSocket ──────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!SIGNALING_URL) return
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return

    const ws = new WebSocket(SIGNALING_URL)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      setIsOnline(true)   // WS is connected regardless of auth state
      const u = userRef.current
      if (u?.userId && u?.token) {
        ws.send(JSON.stringify({ type: 'identify', userId: u.userId, token: u.token }))
      }
      // unidentified users can still see online count, public rooms, etc.
    }

    ws.onmessage = ({ data }) => handleWsMessage(data)

    ws.onerror = () => {
      // Will trigger onclose
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setIsOnline(false)
      // Reconnect after delay
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, 3000)
    }
  }, [handleWsMessage])

  // ── Mount / unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    if (isAvailable) connect()

    return () => {
      mountedRef.current = false
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
      channelRef.current?.close()
      pcRef.current?.close()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ────────────────────────────────────────────────────────────────

  const setNickname = useCallback(async (name) => {
    // Always register (server upserts)
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // Try to connect first then register
      connect()
      setTimeout(() => {
        wsSend({ type: 'register', nickname: name })
      }, 1500)
      return
    }
    wsSend({ type: 'register', nickname: name })
  }, [connect, wsSend])

  const joinQueue = useCallback((mode) => {
    setQueueMode(mode)
    setQueueState('queuing')
    wsSend({ type: 'join_queue', mode })
  }, [wsSend])

  const leaveQueue = useCallback(() => {
    wsSend({ type: 'leave_queue' })
    setQueueState('idle')
    setQueueMode(null)
  }, [wsSend])

  const refreshRooms = useCallback(() => {
    setRoomsLoading(true)
    wsSend({ type: 'list_rooms' })
  }, [wsSend])

  const createPublicRoom = useCallback((title) => {
    wsSend({ type: 'create_room', isPublic: true, title })
  }, [wsSend])

  const joinPublicRoom = useCallback((code) => {
    onMatchReadyRef.current?.({ roomCode: code, youAre: 'guest', mode: 'casual' })
  }, [])

  const fetchLeaderboard = useCallback(() => {
    setLeaderboardLoading(true)
    wsSend({ type: 'get_leaderboard', limit: 20 })
  }, [wsSend])

  const reportResult = useCallback((result) => {
    wsSend({ type: 'report_result', result })
  }, [wsSend])

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimer.current)
    wsRef.current?.close()
    wsRef.current = null
    setIsOnline(false)
  }, [])

  return {
    // Identity
    user,
    isOnline,
    isAvailable,
    onlineCount,
    // Queue
    queueState,
    queueMode,
    matchInfo,
    // Rooms
    rooms,
    roomsLoading,
    // Leaderboard
    leaderboard,
    leaderboardLoading,
    // Actions
    setNickname,
    joinQueue,
    leaveQueue,
    refreshRooms,
    createPublicRoom,
    joinPublicRoom,
    fetchLeaderboard,
    reportResult,
    disconnect,
  }
}
