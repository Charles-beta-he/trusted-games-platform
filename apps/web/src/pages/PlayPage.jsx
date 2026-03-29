import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { extractOfferFromUrl, clearShareHash } from '../lib/shareUrl.js'
import { useGameEngine } from '../hooks/useGameEngine.js'
import { useAI } from '../hooks/useAI.js'
import { useWebRTC } from '../hooks/useWebRTC.js'
import { useSignaling } from '../hooks/useSignaling.js'
import { useTimer } from '../hooks/useTimer.js'
import { useIndexedDB } from '../hooks/useIndexedDB.js'
import { useReplay } from '../hooks/useReplay.js'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import BoardArea from '../components/board/BoardArea.jsx'
import ReplayBar from '../components/board/ReplayBar.jsx'
import PlayerCard from '../components/player/PlayerCard.jsx'
import TrustBadge from '../components/trust/TrustBadge.jsx'
import MoveHistory from '../components/trust/MoveHistory.jsx'
import ControlButtons from '../components/controls/ControlButtons.jsx'
import ModeSelect from '../components/ModeSelect.jsx'

export default function PlayPage() {
  const navigate = useNavigate()
  const { gameId: selectedGame = 'gomoku' } = useParams()
  const location = useLocation()

  // ─── View state ────────────────────────────────────────────────────────────
  // 'mode' = ModeSelect, 'game' = active board
  const [currentView, setCurrentView] = useState('mode')

  // ─── Connection state from platform (passed via router state) ──────────────
  const [matchConn, setMatchConn] = useState(location.state?.matchConn ?? null)

  // ─── Game config ───────────────────────────────────────────────────────────
  const [aiMode, setAiMode] = useState(false)
  const [difficulty, setDifficulty] = useState('medium')
  const [styleId, setStyleId] = useState('balanced')
  const [showDisconnectBanner, setShowDisconnectBanner] = useState(false)
  const [showVictoryOverlay, setShowVictoryOverlay] = useState(false)

  // ─── Auto-join from router state or URL hash ───────────────────────────────
  const [autoJoinOffer, setAutoJoinOffer] = useState(location.state?.autoJoinOffer ?? null)
  const [autoJoinRoomCode, setAutoJoinRoomCode] = useState(location.state?.autoJoinRoomCode ?? null)

  useEffect(() => {
    const offerCode = extractOfferFromUrl()
    if (offerCode) {
      clearShareHash()
      setAutoJoinOffer(offerCode)
    }
  }, [])

  // If we arrived with connection state, skip ModeSelect
  useEffect(() => {
    if (matchConn || autoJoinOffer || autoJoinRoomCode) {
      if (matchConn) setCurrentView('game')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Game engine ───────────────────────────────────────────────────────────
  const game = useGameEngine()
  const { timers, startTimer, stopTimer, resetTimers } = useTimer(game.currentPlayer, game.gameOver)
  useIndexedDB(game.moveHistory, game.board, game.gameId, game.gameOver, game.currentPlayer)

  // ─── Replay ────────────────────────────────────────────────────────────────
  const replay = useReplay(game.moveHistory)
  const displayBoard    = replay.isReplaying ? replay.replayBoard    : game.board
  const displayLastMove = replay.isReplaying ? replay.lastReplayMove : game.lastMove
  const displayWinningLine = replay.isReplaying
    ? (replay.replayIndex === replay.totalMoves ? game.winningLine : null)
    : game.winningLine

  useEffect(() => {
    if (game.gameOver) setShowVictoryOverlay(true)
  }, [game.gameOver])

  // ─── Stable refs ───────────────────────────────────────────────────────────
  const placeStoneRef    = useRef(game.placeStone);    placeStoneRef.current    = game.placeStone
  const resignGameRef    = useRef(game.resignGame);    resignGameRef.current    = game.resignGame
  const initWithRoomRef  = useRef(game.initWithRoom);  initWithRoomRef.current  = game.initWithRoom
  const handleNewGameRef = useRef(null)
  const resetTimersRef   = useRef(resetTimers);        resetTimersRef.current   = resetTimers
  const startTimerRef    = useRef(startTimer);         startTimerRef.current    = startTimer

  // ─── P2P callbacks ─────────────────────────────────────────────────────────
  const p2pCallbacks = {
    onMove: useCallback((r, c, hash) => {
      startTimerRef.current()
      placeStoneRef.current(r, c, hash)
    }, []),
    onResign:   useCallback(() => resignGameRef.current(), []),
    onNewGame:  useCallback((gid) => { initWithRoomRef.current(gid); resetTimersRef.current() }, []),
    onRoomInit: useCallback((gid) => { initWithRoomRef.current(gid) }, []),
  }

  // ─── WebRTC + Signaling ────────────────────────────────────────────────────
  const webrtc = useWebRTC(p2pCallbacks)
  const sig    = useSignaling(p2pCallbacks)

  // Active connection priority: matchConn (platform) > sig > webrtc
  const connIsConnected = (matchConn?.isConnected) || webrtc.isConnected || sig.isConnected
  const conn = matchConn?.isConnected ? matchConn : sig.isConnected ? sig : webrtc
  const connRef = useRef(conn); connRef.current = conn

  const prevConnected = useRef(false)
  useEffect(() => {
    if (connIsConnected && !prevConnected.current && connRef.current.role === 'host') {
      connRef.current.sendRoomInit(game.gameId)
    }
    if (prevConnected.current && !connIsConnected && game.moveHistory.length > 0) {
      setShowDisconnectBanner(true)
      setTimeout(() => setShowDisconnectBanner(false), 5000)
    }
    prevConnected.current = connIsConnected
  }, [connIsConnected]) // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveAiMode = aiMode && !connIsConnected
  const localPlayer = connIsConnected ? (conn.role === 'host' ? 1 : 2) : null

  // ─── AI ────────────────────────────────────────────────────────────────────
  const { isThinking } = useAI({
    board: game.board,
    currentPlayer: game.currentPlayer,
    aiMode: effectiveAiMode,
    difficulty,
    styleId,
    gameOver: game.gameOver,
    onAIMove: useCallback((r, c) => placeStoneRef.current(r, c), []),
  })

  // ─── Handlers ──────────────────────────────────────────────────────────────
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

  // ─── Mode select view ───────────────────────────────────────────────────────
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
            if (opts?.styleId)    setStyleId(opts.styleId)
          } else {
            setAiMode(false)
          }
          setCurrentView('game')
        }}
        onBack={() => navigate('/')}
        autoJoinOffer={autoJoinOffer}
        autoJoinRoomCode={autoJoinRoomCode}
      />
    )
  }

  // ─── Game view ─────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col"
      style={{ minHeight: '100svh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <Header
        moveCount={game.moveHistory.length}
        gameId={game.gameId}
        onBackToLobby={() => navigate('/')}
      />

      {/* ── Mobile player cards ─────────────────────────────────────── */}
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
            player={1} name="黑方"
            type={connIsConnected && conn.role === 'guest' ? 'REMOTE · P2P' : 'LOCAL'}
            timer={timers.black}
            isActive={game.currentPlayer === 1 && !game.gameOver}
          />
        </div>
        <div className="flex-1">
          <PlayerCard
            player={2}
            name={effectiveAiMode ? 'AI' : '白方'}
            type={effectiveAiMode ? `AI · ${difficulty.toUpperCase()}` : connIsConnected ? 'REMOTE · P2P' : 'LOCAL'}
            timer={timers.white}
            isActive={game.currentPlayer === 2 && !game.gameOver}
          />
        </div>
      </div>

      <div className="flex flex-1" style={{ minHeight: 0 }}>

        {/* ── Left Sidebar (desktop) ──────────────────────────────── */}
        <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 overflow-y-auto" style={{ borderRight: '1px solid var(--border-color)' }}>
          <div className="p-5 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <PlayerCard
                player={1} name="黑方"
                type={connIsConnected && conn.role === 'guest' ? 'REMOTE · P2P' : 'PLAYER · LOCAL'}
                timer={timers.black}
                isActive={game.currentPlayer === 1 && !game.gameOver}
              />
              <PlayerCard
                player={2}
                name={effectiveAiMode ? 'AI' : '白方'}
                type={effectiveAiMode ? `AI · ${difficulty.toUpperCase()}` : connIsConnected ? 'REMOTE · P2P' : 'PLAYER · LOCAL'}
                timer={timers.white}
                isActive={game.currentPlayer === 2 && !game.gameOver}
              />
            </div>

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

            {connIsConnected && (
              <div style={{
                padding: '8px 10px',
                border: `1px solid ${conn.isEncrypted ? 'var(--accent-success, #2d6a4f)' : 'var(--border-color)'}`,
                borderRadius: 4,
                display: 'flex', alignItems: 'center', gap: 6,
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

        {/* ── Board ───────────────────────────────────────────────── */}
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
            replayInfo={replay.isReplaying ? { index: replay.replayIndex, total: replay.totalMoves } : null}
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

        {/* ── Right Sidebar (desktop) ─────────────────────────────── */}
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

      {/* ── Mobile bottom bar ───────────────────────────────────────── */}
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

      {showDisconnectBanner && (
        <div style={{
          position: 'fixed',
          top: 'max(60px, calc(env(safe-area-inset-top) + 12px))',
          left: '50%', transform: 'translateX(-50%)',
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
