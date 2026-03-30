import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlatformGame } from '../contexts/PlatformConnContext.jsx'
import PlatformView from '../components/PlatformView.jsx'

export default function PlatformPage() {
  const navigate = useNavigate()
  const { platform } = usePlatformGame()

  const handleManualContinueToPlay = useCallback(
    ({ roomCode, youAre, matchInfo, mode }) => {
      const code = roomCode ?? matchInfo?.roomCode
      const gameKind = matchInfo?.gameKind ?? 'gomoku'
      navigate(`/play/${gameKind}`, {
        state: {
          autoJoinRoomCode: code,
          youAre,
          platformRoomMode: mode ?? matchInfo?.mode ?? 'casual',
        },
      })
    },
    [navigate],
  )

  return (
    <PlatformView
      onBack={() => navigate('/')}
      platform={platform}
      onMatchReady={handleManualContinueToPlay}
    />
  )
}
