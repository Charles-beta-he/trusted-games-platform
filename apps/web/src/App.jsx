import { useState, useCallback, useRef, useEffect } from 'react'
import { extractOfferFromUrl, clearShareHash } from './lib/shareUrl.js'
import { useGameEngine } from './hooks/useGameEngine.js'
import { useAI } from './hooks/useAI.js'
import { useWebRTC } from './hooks/useWebRTC.js'
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
import DifficultySelector from './components/controls/DifficultySelector.jsx'
import NetworkModeSelector from './components/controls/NetworkModeSelector.jsx'
import GameSelector from './components/GameSelector.jsx'
import P2PModal from './components/P2PModal.jsx'
import GameLobby from './components/GameLobby.jsx'
import ModeSelect from './components/ModeSelect.jsx'
import Collapsible from './components/ui/Collapsible.jsx'

export default function App() {
  // ─── View routing ─────────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState('lobby')  // 'lobby' | 'mode' | 'game'
  const [selectedGame, setSelectedGame] = useState(null)

  const [aiMode, setAiMode] = useState(false)
  const [difficulty, setDifficulty] = useState('medium')
  const [showP2PModal, setShowP2PModal] = useState(false)
  const [showDisconnectBanner, setShowDisconnectBanner] = useState(false)
  const [autoJoinOffer, setAutoJoinOffer] = useState(null)
  const [showVictoryOverlay, setShowVictoryOverlay] = useState(false)
  // True when the user entered game view specifically to set up a P2P game;
  // used to redirect back to mode selection if they close the modal without connecting.
  const [p2pIntended, setP2pIntended] = useState(false)

  // Auto-open P2P modal when URL contains a share link — bypass lobby & mode selection
  useEffect(() => {
    const offerCode = extractOfferFromUrl()
    if (offerCode) {
      clearShareHash()
      setSelectedGame('gomoku')
      setCurrentView('game')
      setShowP2PModal(true)
      setAutoJoinOffer(offerCode)
      setP2pIntended(true)
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

  // ─── WebRTC P2P ───────────────────────────────────────────────────────────
  const webrtc = useWebRTC({
    onMove: useCallback((r, c, hash) => {
      // Remote move: start timer if first stone, then place with expected hash for verification
      startTimerRef.current()
      placeStoneRef.current(r, c, hash)
    }, []),
    onResign:   useCallback(() => resignGameRef.current(), []),
    onNewGame:  useCallback((gameId) => {
      // Guest receives host's new gameId — sync game state instead of generating own ID
      initWithRoomRef.current(gameId)
      resetTimersRef.current()
    }, []),
    onRoomInit: useCallback((gameId) => {
      // Guest receives room init — adopt host's gameId so hash chains align
      initWithRoomRef.current(gameId)
    }, []),
  })

  // When this client is the host and the channel just opened, send ROOM_INIT
  // so the guest adopts the same gameId (and derives the same genesisHash).
  const prevConnected = useRef(false)
  useEffect(() => {
    if (webrtc.isConnected && !prevConnected.current && webrtc.role === 'host') {
      webrtc.sendRoomInit(game.gameId)
    }
    // Detect disconnect mid-game
    if (prevConnected.current && !webrtc.isConnected && game.moveHistory.length > 0) {
      setShowDisconnectBanner(true)
      setTimeout(() => setShowDisconnectBanner(false), 5000)
    }
    prevConnected.current = webrtc.isConnected
  }, [webrtc.isConnected]) // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveAiMode = aiMode && !webrtc.isConnected

  // ─── P2P turn enforcement ─────────────────────────────────────────────────
  // Host plays as player 1 (black), guest as player 2 (white).
  const localPlayer = webrtc.isConnected ? (webrtc.role === 'host' ? 1 : 2) : null

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
    if (result && (result.ok || result.won) && webrtc.isConnected) {
      webrtc.sendMove(r, c, result.hash)
    }
    return result
  }, [game.moveHistory.length, game.placeStone, startTimer, webrtc.isConnected, webrtc.sendMove])

  const handleNewGame = useCallback(() => {
    const newId = game.newGame()    // returns the freshly-generated ID
    resetTimers()
    setShowVictoryOverlay(false)
    if (webrtc.isConnected) webrtc.sendNewGame(newId)
  }, [game.newGame, resetTimers, webrtc.isConnected, webrtc.sendNewGame])

  // Keep ref in sync so WebRTC onNewGame callback always calls the latest version
  handleNewGameRef.current = handleNewGame

  const handleResign = useCallback(() => {
    game.resignGame()
    stopTimer()
    if (webrtc.isConnected) webrtc.sendResign()
  }, [game.resignGame, stopTimer, webrtc.isConnected, webrtc.sendResign])

  const handleToggleAI = useCallback(() => {
    setAiMode((v) => !v)
    game.newGame()
    resetTimers()
  }, [game.newGame, resetTimers])

  // ─── Quick-join handler (from GameLobby invite input) ─────────────────────
  const handleQuickJoin = useCallback((input) => {
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
    setSelectedGame('gomoku')
    setCurrentView('game')
    setAutoJoinOffer(offerCode)
    setShowP2PModal(true)
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
      />
    )
  }

  // ─── Mode selection view ───────────────────────────────────────────────────
  if (currentView === 'mode') {
    return (
      <ModeSelect
        gameId={selectedGame}
        onSelectMode={(mode) => {
          if (mode === 'ai') {
            setAiMode(true)
          } else {
            setAiMode(false)
          }
          setCurrentView('game')
          if (mode === 'host' || mode === 'join') {
            setP2pIntended(true)
            setTimeout(() => setShowP2PModal(true), 100)
          }
        }}
        onBack={() => setCurrentView('lobby')}
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

      <div className="flex flex-1" style={{ minHeight: 0 }}>

        {/* ── Left Sidebar ──────────────────────────────────────────────── */}
        <aside className="w-56 flex-shrink-0 overflow-y-auto" style={{ borderRight: '1px solid var(--border-color)' }}>
          <div className="p-5 flex flex-col gap-5">

            {/* === 区域1：玩家信息（始终可见）=== */}
            <div className="flex flex-col gap-2">
              <PlayerCard
                player={1}
                name="黑方"
                type={webrtc.isConnected && webrtc.role === 'guest' ? 'REMOTE · P2P' : 'PLAYER · LOCAL'}
                timer={timers.black}
                isActive={game.currentPlayer === 1 && !game.gameOver}
              />
              <PlayerCard
                player={2}
                name={effectiveAiMode ? 'AI' : '白方'}
                type={
                  effectiveAiMode
                    ? `AI · ${difficulty.toUpperCase()}`
                    : webrtc.isConnected
                      ? 'REMOTE · P2P'
                      : 'PLAYER · LOCAL'
                }
                timer={timers.white}
                isActive={game.currentPlayer === 2 && !game.gameOver}
              />
            </div>

            {/* === 区域2：主操作（始终可见）=== */}
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

            {/* === 区域3：折叠设置（默认收起）=== */}
            <Collapsible title="SETTINGS" icon="⚙" defaultOpen={false}>
              {/* Difficulty (AI mode only) */}
              {effectiveAiMode && (
                <DifficultySelector
                  difficulty={difficulty}
                  onChange={setDifficulty}
                  disabled={game.moveHistory.length > 0 && !game.gameOver}
                />
              )}
              {/* Network mode */}
              <NetworkModeSelector
                mode={game.networkMode}
                onChange={game.setNetworkMode}
                onOpenP2P={() => setShowP2PModal(true)}
                connectionStatus={
                  webrtc.isEncrypted ? 'encrypted' :
                  webrtc.isConnected ? 'connected' :
                  (webrtc.step !== 'idle') ? 'connecting' :
                  'idle'
                }
              />
              {/* Game selector — plugin catalog */}
              <GameSelector currentGameId={selectedGame || 'gomoku'} />
              {/* Secondary controls: AI toggle, export, replay */}
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
                mode="secondary"
              />
            </Collapsible>

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

        {/* ── Right Sidebar ─────────────────────────────────────────────── */}
        <aside
          className="w-56 flex-shrink-0 flex flex-col"
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

      <Footer gameId={game.gameId} networkMode={game.networkMode} isEncrypted={webrtc.isEncrypted} />

      {/* Disconnect banner */}
      {showDisconnectBanner && (
        <div style={{
          position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--accent-danger, #8b3a3a)', color: '#fff',
          padding: '10px 24px', borderRadius: 6, zIndex: 1000,
          fontFamily: 'var(--font-primary, monospace)', fontSize: 13,
          letterSpacing: '0.05em',
        }}>
          ⚠ PEER DISCONNECTED — GAME PAUSED
        </div>
      )}

      {/* P2P Modal */}
      {showP2PModal && (
        <P2PModal
          webrtc={webrtc}
          onClose={() => {
            setShowP2PModal(false)
            setAutoJoinOffer(null)
            const wasIntended = p2pIntended
            setP2pIntended(false)
            // If the user came here specifically for P2P but left without connecting,
            // send them back to mode selection instead of silently entering solo mode.
            if (wasIntended && !webrtc.isConnected) {
              webrtc.disconnect()
              setCurrentView('mode')
            }
          }}
          autoJoinOffer={autoJoinOffer}
        />
      )}
    </div>
  )
}
