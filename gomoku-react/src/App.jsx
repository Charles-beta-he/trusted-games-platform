import { useState, useCallback, useRef, useEffect } from 'react'
import { useGameEngine } from './hooks/useGameEngine.js'
import { useAI } from './hooks/useAI.js'
import { useWebRTC } from './hooks/useWebRTC.js'
import { useTimer } from './hooks/useTimer.js'
import { useIndexedDB } from './hooks/useIndexedDB.js'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import BoardArea from './components/board/BoardArea.jsx'
import PlayerCard from './components/player/PlayerCard.jsx'
import TrustBadge from './components/trust/TrustBadge.jsx'
import MoveHistory from './components/trust/MoveHistory.jsx'
import ControlButtons from './components/controls/ControlButtons.jsx'
import DifficultySelector from './components/controls/DifficultySelector.jsx'
import NetworkModeSelector from './components/controls/NetworkModeSelector.jsx'
import GameSelector from './components/GameSelector.jsx'
import P2PModal from './components/P2PModal.jsx'

export default function App() {
  const [aiMode, setAiMode] = useState(false)
  const [difficulty, setDifficulty] = useState('medium')
  const [showP2PModal, setShowP2PModal] = useState(false)

  // ─── Game engine ──────────────────────────────────────────────────────────
  const game = useGameEngine()
  const { timers, startTimer, stopTimer, resetTimers } = useTimer(game.currentPlayer, game.gameOver)
  useIndexedDB(game.moveHistory, game.board, game.gameId, game.gameOver, game.currentPlayer)

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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ minHeight: '100svh' }}>
      <Header moveCount={game.moveHistory.length} gameId={game.gameId} />

      <div className="flex flex-1" style={{ minHeight: 0 }}>

        {/* ── Left Sidebar ──────────────────────────────────────────────── */}
        <aside className="w-56 flex-shrink-0 border-r border-paper-dark overflow-y-auto">
          <div className="p-5 flex flex-col gap-5">

            {/* Player cards */}
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

            {/* Controls */}
            <ControlButtons
              onNewGame={handleNewGame}
              onUndo={() => game.undoMove(effectiveAiMode)}
              onToggleAI={handleToggleAI}
              onExport={game.exportGame}
              onResign={handleResign}
              aiMode={effectiveAiMode}
              gameOver={game.gameOver}
              canUndo={game.moveHistory.length > 0}
            />

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
            />

            {/* Game selector — plugin catalog */}
            <GameSelector currentGameId="gomoku" />

          </div>
        </aside>

        {/* ── Center: Board ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto">
          <BoardArea
            board={game.board}
            currentPlayer={game.currentPlayer}
            moveHistory={game.moveHistory}
            gameOver={game.gameOver}
            winningLine={game.winningLine}
            lastMove={game.lastMove}
            hoverCell={game.hoverCell}
            setHoverCell={game.setHoverCell}
            isThinking={isThinking}
            isDraw={game.isDraw}
            resignedPlayer={game.resignedPlayer}
            placeStone={handlePlaceStone}
            newGame={handleNewGame}
            aiMode={effectiveAiMode}
            localPlayer={localPlayer}
          />
        </div>

        {/* ── Right Sidebar ─────────────────────────────────────────────── */}
        <aside className="w-56 flex-shrink-0 border-l border-paper-dark overflow-y-auto">
          <div className="p-5 flex flex-col gap-5">
            <TrustBadge level={game.trustLevel} moveCount={game.moveHistory.length} />
            <MoveHistory moveHistory={game.moveHistory} genesisHash={game.genesisHash} />
          </div>
        </aside>

      </div>

      <Footer gameId={game.gameId} networkMode={game.networkMode} />

      {/* P2P Modal */}
      {showP2PModal && (
        <P2PModal webrtc={webrtc} onClose={() => setShowP2PModal(false)} />
      )}
    </div>
  )
}
