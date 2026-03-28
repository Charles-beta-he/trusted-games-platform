import { useState, useCallback, useRef, useEffect } from 'react'
import { extractOfferFromUrl, clearShareHash } from './lib/shareUrl.js'
import { useGameEngine } from './hooks/useGameEngine.js'
import { useAI } from './hooks/useAI.js'
import { useWebRTC } from './hooks/useWebRTC.js'
import { useSignaling } from './hooks/useSignaling.js'
import { usePlatformConn } from './hooks/usePlatformConn.js'
import { useTimer } from './hooks/useTimer.js'
import { useIndexedDB } from './hooks/useIndexedDB.js'
import { useReplay } from './hooks/useReplay.js'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import BoardArea from './components/board/BoardArea.jsx'
import ReplayBar from './components/board/ReplayBar.jsx'
import PlayerCard from './components/player/PlayerCard.jsx'
import TrustBadge from './components/trust/TrustBadge.jsx'
import MoveHistory from './components/trust/MoveHistory.jsx'
import ControlButtons from './components/controls/ControlButtons.jsx'
import GameLobby from './components/GameLobby.jsx'
import ModeSelect from './components/ModeSelect.jsx'
import PlatformView from './components/PlatformView.jsx'

export default function App() {
  // ─── View routing ─────────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState('lobby')  // 'lobby' | 'mode' | 'game'
  const [selectedGame, setSelectedGame] = useState(null)

  const [matchConn, setMatchConn] = useState(null)

  const [aiMode, setAiMode] = useState(false)
  const [difficulty, setDifficulty] = useState('medium')
  const [showDisconnectBanner, setShowDisconnectBanner] = useState(false)
  const [autoJoinOffer, setAutoJoinOffer] = useState(null)
  const [autoJoinRoomCode, setAutoJoinRoomCode] = useState(null)
  const [showVictoryOverlay, setShowVictoryOverlay] = useState(false)

  // URL share link → go to config (join phase) instead of jumping to game
  useEffect(() => {
    const offerCode = extractOfferFromUrl()
    if (offerCode) {
      clearShareHash()
      setSelectedGame('gomoku')
      setCurrentView('mode')
      setAutoJoinOffer(offerCode)
    }
  }, [])

  // ─── Game engine ──────────────────────────────────────────────────────────
  const game = useGameEngine()
  const { timers, startTimer, stopTimer, resetTimers } = useTimer(game.currentPlayer, game.gameOver)
  useIndexedDB(game.moveHistory, game.board, game.gameId, game.gameOver, game.currentPlayer)

  // ─── Replay ───────────────────────────────────────────────────────────────
  const replay = useReplay(game.moveHistory)
  const displayBoard    = replay.isReplaying ? replay.replayBoard    : game.board
  const displayLastMove = replay.isReplaying ? replay.lastReplayMove : game.lastMove

  // 回放时只在最后一步显示胜利线（即终局状态）
  const displayWinningLine = replay.isReplaying
    ? (replay.replayIndex === replay.totalMoves ? game.winningLine : null)
    : game.winningLine

  // Sync gameOver → showVictoryOverlay (only auto-show on new game-over event)
  useEffect(() => {
    if (game.gameOver) {
      setShowVictoryOverlay(true)
    }
  }, [game.gameOver])

  // ─── Stable refs so WebRTC / AI callbacks never hold stale closures ───────
  const placeStoneRef    = useRef(game.placeStone);    placeStoneRef.current    = game.placeStone
  const resignGameRef    = useRef(game.resignGame);    resignGameRef.current    = game.resignGame
  const initWithRoomRef  = useRef(game.initWithRoom);  initWithRoomRef.current  = game.initWithRoom
  const handleNewGameRef = useRef(null)                // filled below after handleNewGame is defined
  const resetTimersRef   = useRef(resetTimers);        resetTimersRef.current   = resetTimers
  const startTimerRef    = useRef(startTimer);         startTimerRef.current    = startTimer

  // Shared P2P callbacks — used by both manual WebRTC and signaling modes
  const p2pCallbacks = {
    onMove: useCallback((r, c, hash) => {
      startTimerRef.current()
      placeStoneRef.current(r, c, hash)
    }, []),
    onResign:   useCallback(() => resignGameRef.current(), []),
    onNewGame:  useCallback((gameId) => {
      initWithRoomRef.current(gameId)
      resetTimersRef.current()
    }, []),
    onRoomInit: useCallback((gameId) => {
      initWithRoomRef.current(gameId)
    }, []),
  }

  // ─── WebRTC P2P (manual SDP) ───────────────────────────────────────────────
  const webrtc = useWebRTC(p2pCallbacks)

  // ─── Signaling P2P (Room Code via ws server) ───────────────────────────────
  const sig = useSignaling(p2pCallbacks)

  // ─── Platform connection (online matchmaking + identity) ───────────────────
  const handleMatchReady = useCallback(({ conn, matchInfo, roomCode, youAre }) => {
    // If a full DataChannel conn was built by usePlatformConn (matched game):
    if (conn) {
      setMatchConn(conn)
      setAiMode(false)
      setSelectedGame('gomoku')
      setCurrentView('game')
      return
    }
    // Fallback: use sig hook for room-code based join (public rooms / guest path)
    setAiMode(false)
    setSelectedGame('gomoku')
    setCurrentView('game')
    const code = roomCode ?? matchInfo?.roomCode
    if (code && youAre === 'guest') {
      sig.joinRoom(code)
    }
  }, [sig]) // eslint-disable-line react-hooks/exhaustive-deps

  const platform = usePlatformConn({
    onMatchReady: handleMatchReady,
    onMove:     p2pCallbacks.onMove,
    onResign:   p2pCallbacks.onResign,
    onNewGame:  p2pCallbacks.onNewGame,
    onRoomInit: p2pCallbacks.onRoomInit,
  })

  // Active connection — matchConn (platform) > signaling > webrtc
  const connIsConnected = (matchConn?.isConnected) || webrtc.isConnected || sig.isConnected
  const conn = matchConn?.isConnected ? matchConn : sig.isConnected ? sig : webrtc
  const connRef = useRef(conn)
  connRef.current = conn

  // When host's channel opens, send ROOM_INIT so guest adopts the same gameId
  const prevConnected = useRef(false)
  useEffect(() => {
    if (connIsConnected && !prevConnected.current && connRef.current.role === 'host') {
      connRef.current.sendRoomInit(game.gameId)
    }
    // Detect disconnect mid-game
    if (prevConnected.current && !connIsConnected && game.moveHistory.length > 0) {
      setShowDisconnectBanner(true)
      setTimeout(() => setShowDisconnectBanner(false), 5000)
    }
    prevConnected.current = connIsConnected
  }, [connIsConnected]) // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveAiMode = aiMode && !connIsConnected

  // ─── P2P turn enforcement ─────────────────────────────────────────────────
  // Host plays as player 1 (black), guest as player 2 (white).
  const localPlayer = connIsConnected ? (conn.role === 'host' ? 1 : 2) : null

  // ─── AI ───────────────────────────────────────────────────────────────────
  const { isThinking } = useAI({
    board: game.board,
    currentPlayer: game.currentPlayer,
    aiMode: effectiveAiMode,
    difficulty,
    gameOver: game.gameOver,
    onAIMove: useCallback((r, c) => placeStoneRef.current(r, c), []),
  })

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handlePlaceStone = useCallback(async (r, c) => {
    if (game.moveHistory.length === 0) startTimer()
    const result = await game.placeStone(r, c)
    const c_ = connRef.current
    if (result && (result.ok || result.won) && c_.isConnected) {
      c_.sendMove(r, c, result.hash)
    }
    return result
  }, [game.moveHistory.length, game.placeStone, startTimer])

  const handleNewGame = useCallback(() => {
    const newId = game.newGame()
    resetTimers()
    setShowVictoryOverlay(false)
    const c_ = connRef.current
    if (c_.isConnected) c_.sendNewGame(newId)
  }, [game.newGame, resetTimers])

  // Keep ref in sync so WebRTC onNewGame callback always calls the latest version
  handleNewGameRef.current = handleNewGame

  const handleResign = useCallback(() => {
    game.resignGame()
    stopTimer()
    const c_ = connRef.current
    if (c_.isConnected) c_.sendResign()
  }, [game.resignGame, stopTimer])

  const handleToggleAI = useCallback(() => {
    setAiMode((v) => !v)
    game.newGame()
    resetTimers()
  }, [game.newGame, resetTimers])

  // ─── Quick-join handler (from GameLobby invite input) ─────────────────────
  function looksLikeRoomCode(s) {
    return /^[A-HJ-NP-Z2-9]{6}$/i.test(s.trim())
  }

  const handleQuickJoin = useCallback((input) => {
    setSelectedGame('gomoku')
    setCurrentView('mode')
    if (looksLikeRoomCode(input)) {
      setAutoJoinRoomCode(input.trim().toUpperCase())
      setAutoJoinOffer(null)
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
      setAutoJoinOffer(offerCode)
      setAutoJoinRoomCode(null)
    }
  }, [])

  // ─── Lobby view ───────────────────────────────────────────────────────────
  if (currentView === 'lobby') {
    return (
      <GameLobby
        onSelectGame={(gameId) => {
          setSelectedGame(gameId)
          setCurrentView('mode')
        }}
        onQuickJoin={handleQuickJoin}
        onOpenPlatform={() => setCurrentView('platform')}
      />
    )
  }

  // ─── Platform view ────────────────────────────────────────────────────────
  if (currentView === 'platform') {
    return (
      <PlatformView
        onBack={() => setCurrentView('lobby')}
        platform={platform}
        onMatchReady={handleMatchReady}
      />
    )
  }

  // ─── Mode selection view ───────────────────────────────────────────────────
  if (currentView === 'mode') {
    return (
      <ModeSelect
        gameId={selectedGame}
        webrtc={webrtc}
        sig={sig}
        onSelectMode={(mode, opts) => {
          if (mode === 'ai') {
            setAiMode(true)
            if (opts?.difficulty) setDifficulty(opts.difficulty)
          } else {
            setAiMode(false)
          }
          setCurrentView('game')
        }}
        onBack={() => setCurrentView('lobby')}
        autoJoinOffer={autoJoinOffer}
        autoJoinRoomCode={autoJoinRoomCode}
      />
    )
  }

  // ─── Game view ────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col"
      style={{ minHeight: '100svh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <Header
        moveCount={game.moveHistory.length}
        gameId={game.gameId}
        onBackToLobby={() => setCurrentView('lobby')}
      />

      {/* ── Mobile player cards row ────────────────────────────────────── */}
      <div
        className="md:hidden flex gap-2 px-3 py-2 flex-shrink-0"
        style={{
          borderBottom: '1px solid var(--border-color)',
          paddingLeft: 'max(12px, env(safe-area-inset-left))',
          paddingRight: 'max(12px, env(safe-area-inset-right))',
        }}
      >
        <div className="flex-1">
          <PlayerCard
            player={1}
            name="黑方"
            type={connIsConnected && conn.role === 'guest' ? 'REMOTE · P2P' : 'LOCAL'}
            timer={timers.black}
            isActive={game.currentPlayer === 1 && !game.gameOver}
          />
        </div>
        <div className="flex-1">
          <PlayerCard
            player={2}
            name={effectiveAiMode ? 'AI' : '白方'}
            type={
              effectiveAiMode
                ? `AI · ${difficulty.toUpperCase()}`
                : connIsConnected ? 'REMOTE · P2P' : 'LOCAL'
            }
            timer={timers.white}
            isActive={game.currentPlayer === 2 && !game.gameOver}
          />
        </div>
      </div>

      <div className="flex flex-1" style={{ minHeight: 0 }}>

        {/* ── Left Sidebar (desktop only) ────────────────────────────── */}
        <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 overflow-y-auto" style={{ borderRight: '1px solid var(--border-color)' }}>
          <div className="p-5 flex flex-col gap-5">

            {/* === 区域1：玩家信息（始终可见）=== */}
            <div className="flex flex-col gap-2">
              <PlayerCard
                player={1}
                name="黑方"
                type={connIsConnected && conn.role === 'guest' ? 'REMOTE · P2P' : 'PLAYER · LOCAL'}
                timer={timers.black}
                isActive={game.currentPlayer === 1 && !game.gameOver}
              />
              <PlayerCard
                player={2}
                name={effectiveAiMode ? 'AI' : '白方'}
                type={
                  effectiveAiMode
                    ? `AI · ${difficulty.toUpperCase()}`
                    : connIsConnected
                      ? 'REMOTE · P2P'
                      : 'PLAYER · LOCAL'
                }
                timer={timers.white}
                isActive={game.currentPlayer === 2 && !game.gameOver}
              />
            </div>

            {/* === 区域2：主操作 === */}
            <ControlButtons
              onNewGame={handleNewGame}
              onUndo={() => game.undoMove(effectiveAiMode)}
              onToggleAI={handleToggleAI}
              onExport={game.exportGame}
              onResign={handleResign}
              aiMode={effectiveAiMode}
              gameOver={game.gameOver}
              canUndo={game.moveHistory.length > 0}
              canReplay={game.gameOver && game.moveHistory.length > 0}
              onReplay={() => { setShowVictoryOverlay(false); replay.enterReplay() }}
            />

            {/* === 区域3：连接状态（P2P 时显示）=== */}
            {connIsConnected && (
              <div style={{
                padding: '8px 10px',
                border: `1px solid ${conn.isEncrypted ? 'var(--accent-success, #2d6a4f)' : 'var(--border-color)'}`,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: conn.isEncrypted
                  ? 'color-mix(in srgb, var(--accent-success, #2d6a4f) 8%, var(--bg-surface))'
                  : 'var(--bg-surface)',
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: conn.isEncrypted ? 'var(--accent-success, #2d6a4f)' : 'var(--accent-primary)',
                  flexShrink: 0,
                }} />
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                  {conn.isEncrypted ? '🔐 E2E ENCRYPTED' : 'P2P CONNECTED'}
                  <div style={{ marginTop: 1, opacity: 0.7 }}>
                    {sig.isConnected ? 'ROOM CODE' : 'DIRECT · SDP'}
                  </div>
                </div>
              </div>
            )}

          </div>
        </aside>

        {/* ── Center: Board ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto">
          <BoardArea
            board={displayBoard}
            currentPlayer={game.currentPlayer}
            moveHistory={game.moveHistory}
            gameOver={game.gameOver}
            winningLine={displayWinningLine}
            lastMove={displayLastMove}
            hoverCell={replay.isReplaying ? null : game.hoverCell}
            setHoverCell={replay.isReplaying ? () => {} : game.setHoverCell}
            isThinking={isThinking}
            isDraw={game.isDraw}
            resignedPlayer={game.resignedPlayer}
            placeStone={replay.isReplaying ? () => {} : handlePlaceStone}
            newGame={handleNewGame}
            aiMode={effectiveAiMode}
            localPlayer={localPlayer}
            showVictoryOverlay={showVictoryOverlay && !replay.isReplaying}
            replayInfo={replay.isReplaying ? {
              index: replay.replayIndex,
              total: replay.totalMoves,
            } : null}
            onReplay={() => { setShowVictoryOverlay(false); replay.enterReplay() }}
          />
          {replay.isReplaying && (
            <ReplayBar
              isReplaying={replay.isReplaying}
              replayIndex={replay.replayIndex}
              totalMoves={replay.totalMoves}
              onStepBack={replay.stepBackward}
              onStepForward={replay.stepForward}
              onGoToStart={replay.goToStart}
              onGoToEnd={replay.goToEnd}
              onGoTo={replay.goTo}
              onExit={replay.exitReplay}
              isAutoPlaying={replay.isAutoPlaying}
              isLooping={replay.isLooping}
              playbackSpeed={replay.playbackSpeed}
              onToggleAutoPlay={replay.toggleAutoPlay}
              onToggleLooping={replay.toggleLooping}
              onSetSpeed={replay.setSpeed}
            />
          )}
        </div>

        {/* ── Right Sidebar (desktop only) ──────────────────────────── */}
        <aside
          className="hidden lg:flex lg:flex-col w-56 flex-shrink-0"
          style={{ borderLeft: '1px solid var(--border-color)', overflow: 'hidden' }}
        >
          <div className="p-5 flex-shrink-0">
            <TrustBadge level={game.trustLevel} moveCount={game.moveHistory.length} />
          </div>
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: '0 20px 20px' }}>
            <MoveHistory
              moveHistory={game.moveHistory}
              genesisHash={game.genesisHash}
              highlightIndex={replay.isReplaying ? replay.replayIndex - 1 : -1}
            />
          </div>
        </aside>

      </div>

      {/* ── Mobile bottom action bar ──────────────────────────────────── */}
      <div
        className="md:hidden flex gap-1 px-2 flex-shrink-0"
        style={{
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          paddingTop: 8,
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        }}
      >
        {[
          { label: '新局', onClick: handleNewGame },
          { label: '悔棋', onClick: () => game.undoMove(effectiveAiMode), disabled: game.moveHistory.length === 0 },
          { label: '认输', onClick: handleResign, disabled: game.gameOver || game.moveHistory.length === 0 },
          { label: '导出', onClick: game.exportGame },
        ].map(({ label, onClick, disabled }) => (
          <button
            key={label}
            onClick={onClick}
            disabled={disabled}
            style={{
              flex: 1,
              padding: '10px 4px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
              fontFamily: 'var(--font-primary)',
              fontSize: 12,
              letterSpacing: '0.05em',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <Footer gameId={game.gameId} networkMode={game.networkMode} isEncrypted={conn.isEncrypted} />

      {/* Disconnect banner */}
      {showDisconnectBanner && (
        <div style={{
          position: 'fixed', top: 'max(60px, calc(env(safe-area-inset-top) + 12px))', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--accent-danger, #8b3a3a)', color: '#fff',
          padding: '10px 24px', borderRadius: 6, zIndex: 1000,
          fontFamily: 'var(--font-primary, monospace)', fontSize: 13,
          letterSpacing: '0.05em',
        }}>
          ⚠ PEER DISCONNECTED — GAME PAUSED
        </div>
      )}

    </div>
  )
}
