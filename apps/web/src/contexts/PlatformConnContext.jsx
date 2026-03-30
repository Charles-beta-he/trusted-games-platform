import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  Suspense,
} from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { usePlatformConn } from '../hooks/usePlatformConn.js'
import PageLoader from '../router/PageLoader.jsx'

const PlatformGameContext = createContext(null)

/**
 * 平台连接根布局：全局挂载 usePlatformConn，避免 /platform → /play 卸载后信令与 P2P 被关掉；
 * 棋局页通过 registerP2PHandlers 把对局回调接到同一套 DataChannel。
 */
export function PlatformShell() {
  const navigate = useNavigate()
  const [matchConn, setMatchConn] = useState(null)
  const [matchMode, setMatchMode] = useState(null)
  const handlersRef = useRef({})

  const registerP2PHandlers = useCallback((h) => {
    handlersRef.current = h || {}
  }, [])

  const clearPlatformMatch = useCallback(() => {
    setMatchConn(null)
    setMatchMode(null)
  }, [])

  const platform = usePlatformConn({
    onMatchReady: useCallback(
      (payload) => {
        const { conn, matchInfo, roomCode, youAre, mode: payloadMode } = payload
        if (conn) {
          setMatchConn(conn)
          setMatchMode(matchInfo?.mode ?? 'casual')
          const gameKind = matchInfo?.gameKind ?? conn?.gameKind ?? 'gomoku'
          navigate(`/play/${gameKind}`, { state: { fromPlatformP2P: true } })
          return
        }
        const code = roomCode ?? matchInfo?.roomCode
        setMatchMode(payloadMode ?? matchInfo?.mode ?? 'casual')
        const gameKind2 = matchInfo?.gameKind ?? 'gomoku'
        navigate(`/play/${gameKind2}`, { state: { autoJoinRoomCode: code, youAre } })
      },
      [navigate],
    ),
    onMove:        (...a) => handlersRef.current.onMove?.(...a),
    onResign:      () => handlersRef.current.onResign?.(),
    onNewGame:     (p) => handlersRef.current.onNewGame?.(p),
    onRoomInit:    (p) => handlersRef.current.onRoomInit?.(p),
    onUndoRequest: () => handlersRef.current.onUndoRequest?.(),
    onUndoAccept:  () => handlersRef.current.onUndoAccept?.(),
    onUndoReject:  () => handlersRef.current.onUndoReject?.(),
  })

  const value = useMemo(
    () => ({
      platform,
      matchConn,
      matchMode,
      registerP2PHandlers,
      clearPlatformMatch,
    }),
    [platform, matchConn, matchMode, registerP2PHandlers, clearPlatformMatch],
  )

  return (
    <PlatformGameContext.Provider value={value}>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </PlatformGameContext.Provider>
  )
}

export function usePlatformGame() {
  const v = useContext(PlatformGameContext)
  if (!v) {
    throw new Error('usePlatformGame must be used under PlatformShell')
  }
  return v
}
