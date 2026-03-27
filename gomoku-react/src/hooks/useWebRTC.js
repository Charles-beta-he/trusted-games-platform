import { useState, useRef, useCallback, useEffect } from 'react'
import {
  createPeerConnection, encodeOffer, decodeOffer,
  encodeAnswer, decodeAnswer, waitForICE,
} from '../lib/webrtc.js'

/**
 * Serverless WebRTC P2P state machine — manual SDP exchange.
 *
 * Host flow:  idle → creating → waiting_for_answer → connected
 * Guest flow: idle → joining → connected
 *
 * Message protocol:
 *   ROOM_INIT  { gameId }               host→guest on channel open
 *   MOVE       { r, c, hash }           sender→peer each move
 *   RESIGN     {}                        sender→peer on resign
 *   NEW_GAME   { gameId }               host→guest on new game
 */
export function useWebRTC({ onMove, onResign, onNewGame, onRoomInit } = {}) {
  const [role, setRole] = useState(null)      // 'host' | 'guest'
  const [step, setStep] = useState('idle')    // see flows above
  const [offerCode, setOfferCode] = useState('')
  const [answerCode, setAnswerCode] = useState('')
  const [error, setError] = useState('')

  const pcRef = useRef(null)
  const channelRef = useRef(null)
  const roleRef = useRef(role)
  roleRef.current = role

  const sendMessage = useCallback((msg) => {
    if (channelRef.current?.readyState === 'open') {
      channelRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const handleChannelMessage = useCallback((e) => {
    try {
      const msg = JSON.parse(e.data)
      if      (msg.type === 'MOVE')      onMove?.(msg.r, msg.c, msg.hash)
      else if (msg.type === 'RESIGN')    onResign?.()
      else if (msg.type === 'NEW_GAME')  onNewGame?.(msg.gameId)
      else if (msg.type === 'ROOM_INIT') onRoomInit?.(msg.gameId)
    } catch(e) { console.warn('[WebRTC] invalid message:', e) }
  }, [onMove, onResign, onNewGame, onRoomInit])

  const setupChannel = useCallback((channel) => {
    channelRef.current = channel
    channel.onmessage = handleChannelMessage
    channel.onopen = () => setStep('connected')
    channel.onclose = () => setStep('idle')
    channel.onerror = () => setStep('error')
  }, [handleChannelMessage])

  /** HOST: generate offer code */
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

  /** HOST: accept guest's answer code */
  const acceptAnswer = useCallback(async (answerStr) => {
    setError('')
    try {
      const pc = pcRef.current
      if (!pc) throw new Error('No active peer connection')
      const data = decodeAnswer(answerStr)
      if (!data?.sdp) throw new Error('Invalid answer code')
      await pc.setRemoteDescription(data.sdp)
    } catch (err) {
      setError(err.message)
      setStep('error')
    }
  }, [])

  /** GUEST: paste host's offer, return answer code string */
  const joinRoom = useCallback(async (offerStr) => {
    setStep('joining')
    setError('')
    try {
      const data = decodeOffer(offerStr)
      if (!data?.sdp) throw new Error('Invalid offer code')

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
      setStep('error')
      return null
    }
  }, [setupChannel])

  const disconnect = useCallback(() => {
    channelRef.current?.close()
    pcRef.current?.close()
    pcRef.current = null
    channelRef.current = null
    setStep('idle')
    setRole(null)
    setOfferCode('')
    setAnswerCode('')
    setError('')
  }, [])

  // Cleanup on unmount
  useEffect(() => () => { pcRef.current?.close() }, [])

  return {
    role, step, offerCode, answerCode, error,
    setRole,
    createRoom, acceptAnswer, joinRoom, disconnect,
    sendMove:     (r, c, hash) => sendMessage({ type: 'MOVE', r, c, hash }),
    sendResign:   ()           => sendMessage({ type: 'RESIGN' }),
    sendNewGame:  (gameId)     => sendMessage({ type: 'NEW_GAME', gameId }),
    sendRoomInit: (gameId)     => sendMessage({ type: 'ROOM_INIT', gameId }),
    isConnected: step === 'connected',
  }
}
