import { useNavigate } from 'react-router-dom'
import GameLobby from '../components/GameLobby.jsx'

export default function LobbyPage() {
  const navigate = useNavigate()

  function looksLikeRoomCode(s) {
    return /^[A-HJ-NP-Z2-9]{6}$/i.test(s.trim())
  }

  const handleQuickJoin = (input) => {
    if (looksLikeRoomCode(input)) {
      navigate('/play/gomoku', { state: { autoJoinRoomCode: input.trim().toUpperCase() } })
    } else {
      let offerCode = input
      if (input.includes('#join=')) {
        try {
          const fakeUrl = new URL(input.startsWith('http') ? input : `https://x.invalid/${input}`)
          const encoded = fakeUrl.hash.slice('#join='.length)
          offerCode = decodeURIComponent(encoded)
        } catch {
          offerCode = input
        }
      }
      navigate('/play/gomoku', { state: { autoJoinOffer: offerCode } })
    }
  }

  return (
    <GameLobby
      onSelectGame={(gameId) => navigate(`/play/${gameId}`)}
      onQuickJoin={handleQuickJoin}
      onOpenPlatform={() => navigate('/platform')}
    />
  )
}
