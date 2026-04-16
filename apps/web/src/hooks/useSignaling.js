/**
 * WebRTC signaling via Room Code (requires apps/signaling server).
 *
 * Wraps the existing manual SDP peer connection with an automatic
 * WebSocket-based offer/answer exchange. Once WebRTC connects the
 * signaling channel is no longer needed.
 *
 * Usage:
 *   const sig = useSignaling({ onConnected, onDisconnected })
 *   sig.createRoom()   → sig.roomCode populated, waits for guest
 *   sig.joinRoom(code) → completes handshake automatically
 *   sig.disconnect()
 */

import { useState, useRef, useCallback } from 'react'
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
  (window.location.hostname === 'localhost'
    ? 'ws://localhost:4001'
    : null)   // null = signaling unavailable in production until deployed

export function useSignaling({
  onMove, onResign, onNewGame, onRoomInit,
  onUndoRequest, onUndoAccept, onUndoReject,
} = {}) {
  const [roomCode, setRoomCode]   = useState('')
  const [step, setStep]           = useState('idle')   // idle | creating | waiting | joining | connected
  const [error, setError]         = useState('')
  const [isEncrypted, setIsEncrypted] = useState(false)
  const [role, setRole]           = useState(null)     // 'host' | 'guest'

  // ── 连接池 ─────────────────────────────────────────────────────────────────
  const wsRef          = useRef(null)
  const pcRef          = useRef(null)
  const channelRef     = useRef(null)
  const sessionKeyRef  = useRef(null)
  const myKeyPairRef   = useRef(null)
  const pendingPeerKeyB64Ref = useRef(null)
  
  // 心跳保活（每 30s 发送 ping）
  const heartbeatIdRef = useRef(null)
  const lastPingTimeRef = useRef(Date.now())
  const HEARTBEAT_INTERVAL = 30000

  // 连接池：复用 WebSocket 连接
  const connectionPool = useRef(new Map()) // key: roomId, value: { ws, pc, channel, cleanup }

  // 清理旧连接
  const cleanupOldConnections = useCallback(() => {
    const now = Date.now()
    for (const [roomId, conn] of connectionPool.current.entries()) {
      if (now - conn.lastActivity > HEARTBEAT_INTERVAL * 2) {
        // 清理超时连接
        if (conn.ws && conn.ws.readyState === WebSocket.OPEN) {
          conn.ws.close(1000, 'Connection timeout')
        }
        connectionPool.current.delete(roomId)
      }
      conn.lastActivity = now
    }
  }, [])

  const isConnected = step === 'connected'
  const isAvailable = Boolean(SIGNALING_URL)

  const sendWs = useCallback((obj) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj))
    }
  }, [])

  // ── Send on DataChannel (encrypted once session key is set) ─────────────
  const sendMessage = useCallback(async (msg) => {
    if (channelRef.current?.readyState !== 'open') return
    const payload = JSON.stringify(msg)
    if (sessionKeyRef.current) {
      const { iv, ciphertext } = await encryptMessage(sessionKeyRef.current, payload)
      channelRef.current.send(JSON.stringify({ iv, ciphertext }))
    } else {
      channelRef.current.send(payload)
    }
  }, [])

  // ── DataChannel message handler ──────────────────────────────────────────
  const handleChannelMessage = useCallback(async ({ data }) => {
    let parsed
    try { parsed = JSON.parse(data) } catch { return }

    if (parsed.type === 'KEY_EXCHANGE') {
      try {
        if (!myKeyPairRef.current?.privateKey) {
          pendingPeerKeyB64Ref.current = parsed.publicKey
          return
        }
        const theirPubKey = await importPublicKey(parsed.publicKey)
        const sessionKey  = await deriveSessionKey(myKeyPairRef.current.privateKey, theirPubKey)
        sessionKeyRef.current = sessionKey
        setIsEncrypted(true)
        setStep('connected')
      } catch (e) {
        setError('加密握手失败: ' + e.message)
        setStep('idle')
      }
      return
    }

    // Decrypt if encrypted
    let decrypted = parsed
    if (parsed.iv && parsed.ciphertext && sessionKeyRef.current) {
      try {
        decrypted = JSON.parse(await decryptMessage(sessionKeyRef.current, parsed.iv, parsed.ciphertext))
      } catch { return }
    }

    if (decrypted.type === 'ROOM_INIT') {
      onRoomInit?.({ gameId: decrypted.gameId, hostIsBlack: decrypted.hostIsBlack !== false })
    }
    if (decrypted.type === 'MOVE') {
      onMove?.(decrypted.r, decrypted.c, decrypted.hash, decrypted.player)
    }
    if (decrypted.type === 'RESIGN') onResign?.()
    if (decrypted.type === 'NEW_GAME') {
      onNewGame?.({ gameId: decrypted.gameId, hostIsBlack: decrypted.hostIsBlack !== false })
    }
    if (decrypted.type === 'UNDO_REQUEST') onUndoRequest?.()
    if (decrypted.type === 'UNDO_ACCEPT') onUndoAccept?.()
    if (decrypted.type === 'UNDO_REJECT') onUndoReject?.()
  }, [onMove, onResign, onNewGame, onRoomInit, onUndoRequest, onUndoAccept, onUndoReject])

  // ── Setup DataChannel ────────────────────────────────────────────────────
  const setupChannel = useCallback((ch) => {
    channelRef.current = ch
    ch.onmessage = handleChannelMessage
    ch.onopen = async () => {
      myKeyPairRef.current = await generateECDHKeyPair()
      const pubKey = await exportPublicKey(myKeyPairRef.current.publicKey)
      ch.send(JSON.stringify({ type: 'KEY_EXCHANGE', publicKey: pubKey }))
      const pendingB64 = pendingPeerKeyB64Ref.current
      if (pendingB64) {
        pendingPeerKeyB64Ref.current = null
        try {
          const theirPubKey = await importPublicKey(pendingB64)
          const sessionKey  = await deriveSessionKey(myKeyPairRef.current.privateKey, theirPubKey)
          sessionKeyRef.current = sessionKey
          setIsEncrypted(true)
          setStep('connected')
        } catch (e) {
          setError('加密握手失败: ' + e.message)
          setStep('idle')
        }
      }
    }
  }, [handleChannelMessage])

  // ── Open WebSocket to signaling server ───────────────────────────────────
  const openWS = useCallback(() => new Promise((resolve, reject) => {
    const ws = new WebSocket(SIGNALING_URL)
    wsRef.current = ws
    ws.onopen = () => {
      resolve(ws)
      // 启动心跳
      heartbeatIdRef.current = setInterval(() => {
        const now = Date.now()
        if (now - lastPingTimeRef.current > HEARTBEAT_INTERVAL) {
          lastPingTimeRef.current = now
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, HEARTBEAT_INTERVAL)
    }
    ws.onerror = () => {
      if (heartbeatIdRef.current) clearInterval(heartbeatIdRef.current)
      reject(new Error('无法连接信令服务器'))
    }
    ws.onclose = () => {
      if (heartbeatIdRef.current) clearInterval(heartbeatIdRef.current)
      // 清理连接池中的对应连接
      if (connectionPool.current.size > 0) {
        const currentRoom = connectionPool.current.keys().next().value
        if (currentRoom === roomId) {
          connectionPool.current.delete(roomId)
        }
      }
    }
  }), [])

  // ── Create room (host) ───────────────────────────────────────────────────
  const createRoom = useCallback(async () => {
    if (!SIGNALING_URL) { setError('信令服务器未配置'); return }
    setError('')
    setStep('creating')
    setRole('host')

    try {
      const ws  = await openWS()
      /** SDP envelope string — set after ICE; peer_joined may arrive earlier */
      let offerCode = null
      let pc = null
      let peerJoined = false

      const trySendOffer = () => {
        if (offerCode && peerJoined) {
          ws.send(JSON.stringify({ type: 'signal', data: { type: 'offer', offer: offerCode } }))
        }
      }

      // Must register before ICE / create_room so peer_joined is never dropped
      ws.onmessage = async ({ data }) => {
        let msg
        try { msg = JSON.parse(data) } catch { return }

        if (msg.type === 'room_created') {
          setRoomCode(msg.room)
          setStep('waiting')
        }

        if (msg.type === 'peer_joined') {
          peerJoined = true
          trySendOffer()
        }

        if (msg.type === 'signal' && msg.data?.type === 'answer' && pc) {
          try {
            const data_ = decodeAnswer(msg.data.answer)
            const init = data_?.sdp ?? data_
            if (!init?.sdp) throw new Error('invalid answer payload')
            await pc.setRemoteDescription(init)
          } catch (e) {
            setError('应答码无效: ' + e.message)
          }
        }

        if (msg.type === 'error') {
          setError(msg.message)
          setStep('idle')
        }

        if (msg.type === 'witness_error') {
          window.dispatchEvent(
            new CustomEvent('platform:witness_server_error', {
              detail: { message: msg.message ?? '服务端见证校验失败' },
            }),
          )
        }
      }

      ws.send(JSON.stringify({ type: 'create_room' }))

      pc = await createPeerConnection()
      pcRef.current = pc

      const ch = pc.createDataChannel('game')
      setupChannel(ch)

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await waitForICE(pc)

      offerCode = encodeOffer({ sdp: pc.localDescription.toJSON() })
      trySendOffer()
    } catch (e) {
      setError(e.message)
      setStep('idle')
    }
  }, [openWS, setupChannel])

  // ── Join room (guest) ────────────────────────────────────────────────────
  const joinRoom = useCallback(async (code) => {
    if (!SIGNALING_URL) { setError('信令服务器未配置'); return }
    setError('')
    setStep('joining')
    setRole('guest')

    try {
      const ws = await openWS()
      const pc = await createPeerConnection()
      pcRef.current = pc

      pc.ondatachannel = ({ channel }) => setupChannel(channel)

      ws.onmessage = async ({ data }) => {
        let msg
        try { msg = JSON.parse(data) } catch { return }

        if (msg.type === 'signal' && msg.data?.type === 'offer') {
          try {
            const data_ = decodeOffer(msg.data.offer)
            const init = data_?.sdp ?? data_
            if (!init?.sdp) throw new Error('invalid offer payload')
            await pc.setRemoteDescription(init)
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            await waitForICE(pc)
            const answerCode = encodeAnswer({ sdp: pc.localDescription.toJSON() })
            ws.send(JSON.stringify({ type: 'signal', data: { type: 'answer', answer: answerCode } }))
          } catch (e) {
            setError('连接失败: ' + e.message)
            setStep('idle')
          }
        }

        if (msg.type === 'error') {
          setError(msg.message)
          setStep('idle')
        }

        if (msg.type === 'witness_error') {
          window.dispatchEvent(
            new CustomEvent('platform:witness_server_error', {
              detail: { message: msg.message ?? '服务端见证校验失败' },
            }),
          )
        }
      }

      ws.send(JSON.stringify({ type: 'join_room', room: code.toUpperCase() }))
    } catch (e) {
      setError(e.message)
      setStep('idle')
    }
  }, [openWS, setupChannel])

  // ── Disconnect ───────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    wsRef.current?.close()
    channelRef.current?.close()
    pcRef.current?.close()
    wsRef.current = null
    channelRef.current = null
    pcRef.current = null
    sessionKeyRef.current = null
    myKeyPairRef.current = null
    pendingPeerKeyB64Ref.current = null
    setStep('idle')
    setRoomCode('')
    setRole(null)
    setError('')
    setIsEncrypted(false)
  }, [])

  // ── Public API (mirrors useWebRTC shape for drop-in use in P2PModal) ─────
  const sendMove       = useCallback((r, c, hash, player) => sendMessage({ type: 'MOVE', r, c, hash, player }), [sendMessage])
  const sendResign     = useCallback(() => sendMessage({ type: 'RESIGN' }), [sendMessage])
  const sendNewGame    = useCallback((gameId, meta = {}) => sendMessage({ type: 'NEW_GAME', gameId, hostIsBlack: meta.hostIsBlack !== false }), [sendMessage])
  const sendRoomInit   = useCallback((gameId, meta = {}) => sendMessage({ type: 'ROOM_INIT', gameId, hostIsBlack: meta.hostIsBlack !== false }), [sendMessage])
  const sendUndoRequest  = useCallback(() => sendMessage({ type: 'UNDO_REQUEST' }), [sendMessage])
  const sendUndoResponse = useCallback((accept) => sendMessage({ type: accept ? 'UNDO_ACCEPT' : 'UNDO_REJECT' }), [sendMessage])

  /** 信令 WS 仍通时，向 Worker 提交着法见证（与 @tg/core/crypto 链一致） */
  const sendWitnessRoomInit = useCallback(
    (gameId, hostIsBlack) =>
      sendWs({ type: 'witness_room_init', gameId, hostIsBlack: hostIsBlack !== false }),
    [sendWs]
  )
  const sendMoveWitness = useCallback(
    (payload) => sendWs({ type: 'move_witness', ...payload }),
    [sendWs]
  )
  const sendWitnessUndoPop = useCallback(
    (gameId) => sendWs({ type: 'witness_undo_pop', gameId }),
    [sendWs]
  )
  const sendWitnessResign = useCallback(
    (gameId, resignedPlayer) => sendWs({ type: 'witness_resign', gameId, resignedPlayer }),
    [sendWs]
  )

  return {
    // State
    roomCode, step, error, isEncrypted, role, isConnected, isAvailable,
    // Actions
    createRoom, joinRoom, disconnect,
    sendMove, sendResign, sendNewGame, sendRoomInit,
    sendUndoRequest, sendUndoResponse,
    sendWitnessRoomInit, sendMoveWitness, sendWitnessUndoPop, sendWitnessResign,
  }
}
