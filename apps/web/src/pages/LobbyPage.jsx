import { useNavigate } from 'react-router-dom'
import GameLobby from '../components/GameLobby.jsx'
import { P2P_GAME_ID } from '../plugins/index.js'

export default function LobbyPage() {
  const navigate = useNavigate()

  function looksLikeRoomCode(s) {
    return /^[A-HJ-NP-Z2-9]{6}$/i.test(s.trim())
  }

  const handleQuickJoin = (input) => {
    if (looksLikeRoomCode(input)) {
      navigate(`/play/${P2P_GAME_ID}`, { state: { autoJoinRoomCode: input.trim().toUpperCase() } })
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
      navigate(`/play/${P2P_GAME_ID}`, { state: { autoJoinOffer: offerCode } })
    }
  }

  const handleImportGomoku = async (file) => {
    try {
      const text = await file.text()
      const record = JSON.parse(text)
      if (!Array.isArray(record?.moves)) throw new Error('无效的 JSON 棋谱')
      navigate(`/play/${P2P_GAME_ID}`, { state: { gomokuImport: record } })
    } catch (e) {
      alert('导入失败: ' + (e.message || String(e)))
    }
  }

  return (
    <GameLobby
      onSelectGame={(gameId) => navigate(`/play/${gameId}`)}
      onQuickJoin={handleQuickJoin}
      onOpenPlatform={() => navigate('/platform')}
      onImportGomoku={handleImportGomoku}
    />
  )
}
