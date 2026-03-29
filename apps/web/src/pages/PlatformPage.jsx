import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlatformConn } from '../hooks/usePlatformConn.js'
import { useSignaling } from '../hooks/useSignaling.js'
import PlatformView from '../components/PlatformView.jsx'

// p2p callbacks are no-op stubs here — the actual game lives in PlayPage.
// When a match is found, we navigate there carrying connection state.
const noop = () => {}

export default function PlatformPage() {
  const navigate = useNavigate()

  const handleMatchReady = useCallback(({ conn, matchInfo, roomCode, youAre }) => {
    if (conn) {
      navigate('/play/gomoku', { state: { matchConn: conn } })
      return
    }
    const code = roomCode ?? matchInfo?.roomCode
    navigate('/play/gomoku', { state: { autoJoinRoomCode: code, youAre } })
  }, [navigate])

  const platform = usePlatformConn({
    onMatchReady: handleMatchReady,
    onMove:     noop,
    onResign:   noop,
    onNewGame:  noop,
    onRoomInit: noop,
  })

  return (
    <PlatformView
      onBack={() => navigate('/')}
      platform={platform}
      onMatchReady={handleMatchReady}
    />
  )
}
