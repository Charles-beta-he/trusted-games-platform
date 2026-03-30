/**
 * 路由配置
 *
 * 策略：MPA 按需加载 + SPA 客户端切换
 *   - 每个页面通过 React.lazy + Vite 动态 import 拆成独立 chunk
 *   - 首次访问某路由时浏览器按需下载对应 chunk（MPA 效果）
 *   - 后续页面间跳转由 React Router 拦截，无完整页面刷新（SPA 体验）
 *   - Suspense fallback 期间显示统一的 PageLoader
 *
 * 新增页面步骤：
 *   1. 在 src/pages/ 下创建组件文件
 *   2. 在下方 ROUTES 数组里添加一条记录
 */

import React, { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PlatformShell } from '../contexts/PlatformConnContext.jsx'

// ── 按需加载的页面 chunk ───────────────────────────────────────────────────────
const LobbyPage       = lazy(() => import('../pages/LobbyPage.jsx'))
const PlayPage        = lazy(() => import('../pages/PlayPage.jsx'))
const PlatformPage    = lazy(() => import('../pages/PlatformPage.jsx'))
const StyleCenterPage = lazy(() => import('../pages/StyleCenterPage.jsx'))

// ── 路由表 ────────────────────────────────────────────────────────────────────
const ROUTES = [
  {
    path: '/',
    label: 'Lobby',
    element: <LobbyPage />,
  },
  {
    path: '/play/:gameId',
    label: 'Play',
    element: <PlayPage />,
  },
  {
    path: '/platform',
    label: 'Platform',
    element: <PlatformPage />,
  },
  {
    path: '/styles',
    label: 'StyleCenter',
    element: <StyleCenterPage />,
  },
]

// ── 导出路由实例 ──────────────────────────────────────────────────────────────
// 根布局 PlatformShell：保持平台 WS + P2P 在页面切换时不被卸载
export const router = createBrowserRouter([
  {
    path: '/',
    element: <PlatformShell />,
    children: ROUTES.map(({ path: p, element }) =>
      p === '/'
        ? { index: true, element }
        : { path: p.replace(/^\//, ''), element },
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

// 供外部读取路由元数据（如面包屑、导航高亮）
export { ROUTES }
