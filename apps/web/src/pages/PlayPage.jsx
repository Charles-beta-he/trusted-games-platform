import { lazy, Suspense } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { getGameById } from '../plugins/index.js'

/**
 * 对弈入口：通过注册表分发，各游戏独立 hooks（避免条件调用违反 Rules of Hooks）。
 *
 * 接入新游戏步骤：
 *   1. 在 plugins/index.js 注册描述符（status: 'installed'）
 *   2. 创建对应页面组件
 *   3. 在下方 GAME_PAGES 加一行 lazy import
 */
const GAME_PAGES = {
  gomoku:  lazy(() => import('./GomokuPlayPage.jsx')),
  xiangqi: lazy(() => import('./XiangqiPlayPage.jsx')),
}

export default function PlayPage() {
  const { gameId = 'gomoku' } = useParams()
  const desc = getGameById(gameId)

  if (!desc || desc.status !== 'installed') return <Navigate to="/" replace />

  const Page = GAME_PAGES[gameId]
  if (!Page) return <Navigate to="/" replace />

  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  )
}
