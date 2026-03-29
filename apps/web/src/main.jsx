import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext.jsx'

const LobbyPage    = lazy(() => import('./pages/LobbyPage.jsx'))
const PlayPage     = lazy(() => import('./pages/PlayPage.jsx'))
const PlatformPage = lazy(() => import('./pages/PlatformPage.jsx'))

function PageLoader() {
  return (
    <div style={{
      minHeight: '100svh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-muted)',
      fontFamily: 'monospace',
      fontSize: 12,
      letterSpacing: '0.2em',
    }}>
      LOADING...
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Suspense fallback={<PageLoader />}><LobbyPage /></Suspense>,
  },
  {
    path: '/play/:gameId',
    element: <Suspense fallback={<PageLoader />}><PlayPage /></Suspense>,
  },
  {
    path: '/platform',
    element: <Suspense fallback={<PageLoader />}><PlatformPage /></Suspense>,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>
)
