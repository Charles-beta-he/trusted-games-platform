import { useState, useRef, useCallback, useEffect } from 'react'
import {
  createPeerConnection, encodeOffer, decodeOffer,
  encodeAnswer, decodeAnswer, waitForICE,
} from '../lib/webrtc.js'
import {
  generateECDHKeyPair, exportPublicKey, importPublicKey,
  deriveSessionKey, encryptMessage, decryptMessage,
} from '../lib/p2pCrypto.js'

/**
 * Serverless WebRTC P2P state machine — manual SDP exchange.
 *
 * Host flow:  idle → creating → waiting_for_answer → connected
 * Guest flow: idle → joining → connected
 *
 * Message protocol (all post-handshake messages are AES-GCM encrypted):
 *   ROOM_INIT  { gameId }               host→guest on channel open
 *   MOVE       { r, c, hash }           sender→peer each move
 *   RESIGN     {}                        sender→peer on resign
 *   NEW_GAME   { gameId }               host→guest on new game
 *
 * Encryption handshake (happens immediately after DataChannel opens):
 *   1. Both peers generate an ECDH (P-256) key pair.
 *   2. Each sends { type: 'KEY_EXCHANGE', publicKey: <base64> } in plaintext.
 *   3. On receiving KEY_EXCHANGE, each peer derives a shared AES-GCM-256
 *      session key and marks step as 'connected'.
 *   4. All subsequent messages are encrypted: { iv, ciphertext } (base64).
 */
export function useWebRTC({ onMove, onResign, onNewGame, onRoomInit } = {}) {
  const [role, setRole] = useState(null)      // 'host' | 'guest'
  const [step, setStep] = useState('idle')    // see flows above
  const [offerCode, setOfferCode] = useState('')
  const [answerCode, setAnswerCode] = useState('')
  const [error, setError] = useState('')
  const [isEncrypted, setIsEncrypted] = useState(false)

  const pcRef = useRef(null)
  const channelRef = useRef(null)
  const roleRef = useRef(role)
  roleRef.current = role

  // ─── Encryption state (in-memory only, never persisted) ───────────────────
  const sessionKeyRef = useRef(null)   // AES-GCM CryptoKey, set after handshake
  const myKeyPairRef  = useRef(null)   // ECDH { publicKey, privateKey }

  // ─── Send (with transparent encryption once session key is established) ───

  const sendMessage = useCallback(async (msg) => {
    if (channelRef.current?.readyState !== 'open') return
    const payload = JSON.stringify(msg)
    if (sessionKeyRef.current) {
      try {
        const { iv, ciphertext } = await encryptMessage(sessionKeyRef.current, payload)
        channelRef.current.send(JSON.stringify({ iv, ciphertext }))
      } catch (e) {
        console.warn('[WebRTC] encrypt failed', e)
      }
    } else {
      // Fallback — used only during key-exchange window or if peer is legacy
      console.warn('[WebRTC] sending plaintext (no session key yet)')
      channelRef.current.send(payload)
    }
  }, [])

  // ─── Message handler ──────────────────────────────────────────────────────

  const handleChannelMessage = useCallback(async ({ data }) => {
    let parsed
    try { parsed = JSON.parse(data) } catch (e) { console.warn('[WebRTC] invalid msg', e); return }

    // ── KEY_EXCHANGE — plaintext, part of the encryption handshake ──────────
    if (parsed.type === 'KEY_EXCHANGE') {
      try {
        const theirPubKey = await importPublicKey(parsed.publicKey)
        const sessionKey  = await deriveSessionKey(myKeyPairRef.current.privateKey, theirPubKey)
        sessionKeyRef.current = sessionKey
        setIsEncrypted(true)
        setStep('connected')
      } catch (e) {
        console.warn('[WebRTC] key exchange failed', e)
        setError('Encryption handshake failed')
        setStep('error')
      }
      return
    }

    // ── Encrypted envelope ───────────────────────────────────────────────────
    if (parsed.iv && parsed.ciphertext) {
      if (!sessionKeyRef.current) {
        console.warn('[WebRTC] received encrypted message but no session key — dropping')
        return
      }
      try {
        const plaintext = await decryptMessage(sessionKeyRef.current, parsed.iv, parsed.ciphertext)
        parsed = JSON.parse(plaintext)
      } catch (e) {
        console.warn('[WebRTC] decrypt failed', e)
        return
      }
    }

    // ── Application message routing ──────────────────────────────────────────
    if      (parsed.type === 'MOVE')      onMove?.(parsed.r, parsed.c, parsed.hash)
    else if (parsed.type === 'RESIGN')    onResign?.()
    else if (parsed.type === 'NEW_GAME')  onNewGame?.(parsed.gameId)
    else if (parsed.type === 'ROOM_INIT') onRoomInit?.(parsed.gameId)
  }, [onMove, onResign, onNewGame, onRoomInit])

  // ─── Channel setup ────────────────────────────────────────────────────────

  const setupChannel = useCallback((channel) => {
    channelRef.current = channel

    channel.onopen = async () => {
      // Reset encryption state for this session
      sessionKeyRef.current = null
      myKeyPairRef.current  = null
      setIsEncrypted(false)

      try {
        const keyPair  = await generateECDHKeyPair()
        myKeyPairRef.current = keyPair
        const pubKeyB64 = await exportPublicKey(keyPair.publicKey)
        // Send public key in plaintext — safe: ECDH public keys carry no secret
        channel.send(JSON.stringify({ type: 'KEY_EXCHANGE', publicKey: pubKeyB64 }))
        // step stays at its current value ('creating'/'joining') until KEY_EXCHANGE
        // is received and session key is derived — then we move to 'connected'.
      } catch (e) {
        console.warn('[WebRTC] key generation failed', e)
        setError('Failed to generate encryption keys')
        setStep('error')
      }
    }

    channel.onmessage = handleChannelMessage
    channel.onclose   = () => {
      sessionKeyRef.current = null
      myKeyPairRef.current  = null
      setIsEncrypted(false)
      setStep('idle')
    }
    channel.onerror = () => setStep('error')
  }, [handleChannelMessage])

  // ─── HOST: generate offer code ────────────────────────────────────────────

  const createRoom = useCallback(async () => {
    setStep('creating')
    setError('')
    try {
      const pc = createPeerConnection()
      pcRef.current = pc

      const channel = pc.createDataChannel('gomoku')
      setupChannel(channel)

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await waitForICE(pc)

      const code = encodeOffer({ sdp: pc.localDescription.toJSON() })
      setOfferCode(code)
      setStep('waiting_for_answer')
    } catch (err) {
      setError(err.message)
      setStep('error')
    }
  }, [setupChannel])

  // ─── HOST: accept guest's answer code ────────────────────────────────────

  const acceptAnswer = useCallback(async (answerStr) => {
    setError('')
    try {
      const pc = pcRef.current
      if (!pc) throw new Error('No active peer connection')
      const data = decodeAnswer(answerStr)
      if (!data?.sdp) throw new Error('Invalid answer code — please check and retry')
      await pc.setRemoteDescription(data.sdp)
    } catch (err) {
      setError(err.message)
      // Don't change step — host stays in waiting_for_answer so they can correct and retry
    }
  }, [])

  // ─── GUEST: paste host's offer, return answer code string ────────────────

  const joinRoom = useCallback(async (offerStr) => {
    // Close any stale PC from a previous failed attempt
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    setStep('joining')
    setError('')
    setAnswerCode('')
    try {
      const data = decodeOffer(offerStr)
      if (!data?.sdp) throw new Error('Invalid offer code — please check and retry')

      const pc = createPeerConnection()
      pcRef.current = pc
      pc.ondatachannel = (e) => setupChannel(e.channel)

      await pc.setRemoteDescription(data.sdp)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await waitForICE(pc)

      const code = encodeAnswer({ sdp: pc.localDescription.toJSON() })
      setAnswerCode(code)
      return code
    } catch (err) {
      setError(err.message)
      // Reset to idle (but keep role='guest') so the input remains visible for retry
      setStep('idle')
      return null
    }
  }, [setupChannel])

  // ─── Disconnect ───────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    channelRef.current?.close()
    pcRef.current?.close()
    pcRef.current    = null
    channelRef.current = null
    sessionKeyRef.current = null
    myKeyPairRef.current  = null
    setStep('idle')
    setRole(null)
    setOfferCode('')
    setAnswerCode('')
    setError('')
    setIsEncrypted(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => () => { pcRef.current?.close() }, [])

  return {
    role, step, offerCode, answerCode, error,
    isEncrypted,
    setRole,
    createRoom, acceptAnswer, joinRoom, disconnect,
    sendMove:     (r, c, hash) => sendMessage({ type: 'MOVE', r, c, hash }),
    sendResign:   ()           => sendMessage({ type: 'RESIGN' }),
    sendNewGame:  (gameId)     => sendMessage({ type: 'NEW_GAME', gameId }),
    sendRoomInit: (gameId)     => sendMessage({ type: 'ROOM_INIT', gameId }),
    isConnected: step === 'connected',
  }
}
