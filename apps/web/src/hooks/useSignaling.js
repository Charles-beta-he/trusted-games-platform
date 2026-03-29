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
  (window.location.hostname === 'localhost'
    ? 'ws://localhost:4001'
    : null)   // null = signaling unavailable in production until deployed

export function useSignaling({ onMove, onResign, onNewGame, onRoomInit } = {}) {
  const [roomCode, setRoomCode]   = useState('')
  const [step, setStep]           = useState('idle')   // idle | creating | waiting | joining | connected
  const [error, setError]         = useState('')
  const [isEncrypted, setIsEncrypted] = useState(false)
  const [role, setRole]           = useState(null)     // 'host' | 'guest'

  const wsRef          = useRef(null)
  const pcRef          = useRef(null)
  const channelRef     = useRef(null)
  const sessionKeyRef  = useRef(null)
  const myKeyPairRef   = useRef(null)

  const isConnected = step === 'connected'
  const isAvailable = Boolean(SIGNALING_URL)

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
        const theirPubKey = await importPublicKey(parsed.publicKey)
        const sessionKey  = await deriveSessionKey(myKeyPairRef.current.privateKey, theirPubKey)
        sessionKeyRef.current = sessionKey
        setIsEncrypted(true)
        setStep('connected')
      } catch (e) {
        setError('加密握手失败: ' + e.message)
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

    if (decrypted.type === 'ROOM_INIT')  onRoomInit?.(decrypted.gameId)
    if (decrypted.type === 'MOVE')       onMove?.(decrypted.r, decrypted.c, decrypted.hash)
    if (decrypted.type === 'RESIGN')     onResign?.()
    if (decrypted.type === 'NEW_GAME')   onNewGame?.(decrypted.gameId)
  }, [onMove, onResign, onNewGame, onRoomInit])

  // ── Setup DataChannel ────────────────────────────────────────────────────
  const setupChannel = useCallback((ch) => {
    channelRef.current = ch
    ch.onmessage = handleChannelMessage
    ch.onopen = async () => {
      // Start ECDH key exchange
      myKeyPairRef.current = await generateECDHKeyPair()
      const pubKey = await exportPublicKey(myKeyPairRef.current.publicKey)
      ch.send(JSON.stringify({ type: 'KEY_EXCHANGE', publicKey: pubKey }))
    }
  }, [handleChannelMessage])

  // ── Open WebSocket to signaling server ───────────────────────────────────
  const openWS = useCallback(() => new Promise((resolve, reject) => {
    const ws = new WebSocket(SIGNALING_URL)
    wsRef.current = ws
    ws.onopen = () => resolve(ws)
    ws.onerror = (e) => reject(new Error('无法连接信令服务器'))
    ws.onclose = () => {
      // If signaling WS closes, game may still continue via DataChannel
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
      const pc  = await createPeerConnection()
      pcRef.current = pc

      const ch = pc.createDataChannel('game')
      setupChannel(ch)

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await waitForICE(pc)

      const offerCode = encodeOffer(pc.localDescription)

      // Tell signaling server to open a room
      ws.send(JSON.stringify({ type: 'create_room' }))

      ws.onmessage = async ({ data }) => {
        let msg
        try { msg = JSON.parse(data) } catch { return }

        if (msg.type === 'room_created') {
          setRoomCode(msg.room)
          setStep('waiting')
        }

        if (msg.type === 'peer_joined') {
          // Send our offer to guest via signaling
          ws.send(JSON.stringify({ type: 'signal', data: { type: 'offer', offer: offerCode } }))
        }

        if (msg.type === 'signal' && msg.data?.type === 'answer') {
          try {
            const answerDesc = decodeAnswer(msg.data.answer)
            await pc.setRemoteDescription(answerDesc)
          } catch (e) {
            setError('应答码无效: ' + e.message)
          }
        }

        if (msg.type === 'error') {
          setError(msg.message)
          setStep('idle')
        }
      }
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

      ws.send(JSON.stringify({ type: 'join_room', room: code.toUpperCase() }))

      ws.onmessage = async ({ data }) => {
        let msg
        try { msg = JSON.parse(data) } catch { return }

        if (msg.type === 'signal' && msg.data?.type === 'offer') {
          try {
            const offerDesc = decodeOffer(msg.data.offer)
            await pc.setRemoteDescription(offerDesc)
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            await waitForICE(pc)
            const answerCode = encodeAnswer(pc.localDescription)
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
      }
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
    setStep('idle')
    setRoomCode('')
    setRole(null)
    setError('')
    setIsEncrypted(false)
  }, [])

  // ── Public API (mirrors useWebRTC shape for drop-in use in P2PModal) ─────
  const sendMove       = useCallback((r, c, hash) => sendMessage({ type: 'MOVE', r, c, hash }), [sendMessage])
  const sendResign     = useCallback(()           => sendMessage({ type: 'RESIGN' }),             [sendMessage])
  const sendNewGame    = useCallback((gameId)     => sendMessage({ type: 'NEW_GAME', gameId }),   [sendMessage])
  const sendRoomInit   = useCallback((gameId)     => sendMessage({ type: 'ROOM_INIT', gameId }),  [sendMessage])

  return {
    // State
    roomCode, step, error, isEncrypted, role, isConnected, isAvailable,
    // Actions
    createRoom, joinRoom, disconnect,
    sendMove, sendResign, sendNewGame, sendRoomInit,
  }
}
