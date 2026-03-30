import { useParams } from 'react-router-dom'
import GomokuPlayPage from './GomokuPlayPage.jsx'
import XiangqiPlayPage from './XiangqiPlayPage.jsx'

/**
 * 对弈入口：按路由 gameId 分发，各游戏独立 hooks，避免条件调用违反 Rules of Hooks。
 */
export default function PlayPage() {
  const { gameId = 'gomoku' } = useParams()
  if (gameId === 'xiangqi') return <XiangqiPlayPage />
  return <GomokuPlayPage />
}
