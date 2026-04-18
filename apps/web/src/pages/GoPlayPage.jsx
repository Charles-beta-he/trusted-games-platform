import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import ModeSelect from '../components/ModeSelect.jsx'
import PlayerCard from '../components/player/PlayerCard.jsx'
import ControlButtons from '../components/controls/ControlButtons.jsx'
import GoBoardArea from '../components/go/GoBoardArea.jsx'
import { useGoGame } from '../hooks/useGoGame.js'
import { useTimer } from '../hooks/useTimer.js'
import { useAI } from '../hooks/useAI.js'

export default function GoPlayPage() {
  const navigate = useNavigate()
  const { gameId: selectedGame = 'go' } = useParams()
  const [currentView, setCurrentView] = useState('mode')
  const [aiMode, setAiMode] = useState(false)
  const [difficulty, setDifficulty] = useState('medium')

  const g = useGoGame()

  const timerPlayer = g.currentPlayer === 1 ? 1 : 2
  const { timers, startTimer, resetTimers } = useTimer(timerPlayer, g.gameOver)

  useEffect(() => {
    if (g.moveHistory.length === 1) startTimer()
  }, [g.moveHistory.length, startTimer])

  const { placeStone } = g
  const onAIMove = useCallback(
    (r, c) => {
      placeStone(r, c)
    },
    [placeStone],
  )

  const { isThinking } = useAI({
    board: g.board,
    currentPlayer: g.currentPlayer,
    aiMode,
    difficulty,
    gameOver: g.gameOver,
    gameKind: 'go',
    aiSide: 2, // AI plays white
    onAIMove,
  })

  const interactionLocked = Boolean((aiMode && g.currentPlayer === 2) || isThinking)

  const handleNewGame = useCallback(() => {
    g.newGame()
    resetTimers()
  }, [g, resetTimers])

  const handleUndo = useCallback(() => {
    if (g.gameOver) return
    g.undoMove(aiMode)
  }, [g, aiMode])

  const handleToggleAI = useCallback(() => {
    setAiMode((v) => !v)
    g.newGame()
    resetTimers()
  }, [g, resetTimers])

  const handleResign = useCallback(() => {
    if (g.gameOver || g.moveHistory.length === 0) return
    g.resign()
  }, [g])

  const handlePass = useCallback(() => {
    if (g.gameOver) return
    g.pass()
  }, [g])

  if (currentView === 'mode') {
    return (
      <ModeSelect
        gameId={selectedGame}
        webrtc={null}
        sig={null}
        networkModesEnabled={false}
        onSelectMode={(mode, opts) => {
          if (mode === 'ai') {
            setAiMode(true)
            if (opts?.difficulty) setDifficulty(opts.difficulty)
          } else {
            setAiMode(false)
          }
          g.newGame()
          resetTimers()
          setCurrentView('game')
        }}
        onBack={() => navigate('/')}
        autoJoinOffer={null}
        autoJoinRoomCode={null}
      />
    )
  }

  return (
    <div
      className="flex flex-col min-h-[100svh] bg-theme-primary text-theme-primary"
    >
      <Header
        moveCount={g.moveHistory.length}
        gameId={`go-${g.moveHistory.length}`}
        onBackToLobby={() => navigate('/')}
      />

      <div
        className="md:hidden flex gap-2 px-3 py-2 flex-shrink-0 border-b border-theme"
        style={{
          paddingLeft: 'max(12px, env(safe-area-inset-left))',
          paddingRight: 'max(12px, env(safe-area-inset-right))',
        }}
      >
        <div className="flex-1">
          <PlayerCard
            player={1}
            name="黑方"
            type={aiMode ? '本机 · 执黑' : '本地'}
            timer={timers.black}
            isActive={g.currentPlayer === 1 && !g.gameOver}
          />
        </div>
        <div className="flex-1">
          <PlayerCard
            player={2}
            name={aiMode ? 'AI' : '白方'}
            type={aiMode ? `AI · ${difficulty.toUpperCase()}` : '本地'}
            timer={timers.white}
            isActive={g.currentPlayer === 2 && !g.gameOver}
          />
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 overflow-y-auto border-r border-theme">
          <div className="p-5 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <PlayerCard
                player={1}
                name="黑方"
                type={aiMode ? 'PLAYER · 执黑' : 'PLAYER · 本地'}
                timer={timers.black}
                isActive={g.currentPlayer === 1 && !g.gameOver}
              />
              <PlayerCard
                player={2}
                name={aiMode ? 'AI' : '白方'}
                type={aiMode ? `AI · ${difficulty.toUpperCase()}` : 'PLAYER · 本地'}
                timer={timers.white}
                isActive={g.currentPlayer === 2 && !g.gameOver}
              />
            </div>
            <ControlButtons
              onNewGame={handleNewGame}
              onUndo={handleUndo}
              onToggleAI={handleToggleAI}
              onExport={g.exportRecord}
              onResign={handleResign}
              onPass={handlePass}
              aiMode={aiMode}
              gameOver={g.gameOver}
              canUndo={g.moveHistory.length > 0}
              mode="all"
            />
            <p className="text-[9px] leading-relaxed text-theme-muted">
              围棋对局为本地 + 人机。支持提子规则，双方连续跳过终局计分（中国规则，贴目 6.5）。
            </p>
          </div>
        </aside>

        <div className="flex-1 overflow-auto flex flex-col relative">
          <GoBoardArea
            board={g.board}
            currentPlayer={g.currentPlayer}
            moveHistory={g.moveHistory}
            gameOver={g.gameOver}
            endReason={g.endReason}
            winnerSide={g.winnerSide}
            blackCaptures={g.blackCaptures}
            whiteCaptures={g.whiteCaptures}
            lastMove={g.lastMove}
            onPlaceStone={g.placeStone}
            aiMode={aiMode}
            isThinking={isThinking}
            score={g.score}
            interactionLocked={interactionLocked}
          />
          <div className="md:hidden px-2 pb-2 flex flex-col gap-2">
            <ControlButtons
              onNewGame={handleNewGame}
              onUndo={handleUndo}
              onToggleAI={handleToggleAI}
              onExport={g.exportRecord}
              onResign={handleResign}
              onPass={handlePass}
              aiMode={aiMode}
              gameOver={g.gameOver}
              canUndo={g.moveHistory.length > 0}
              mode="primary"
            />
          </div>
        </div>
      </div>

      {g.gameOver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'color-mix(in srgb, var(--bg-primary) 86%, transparent)' }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-w-sm w-full p-6 rounded-lg border border-theme bg-theme-surface text-center"
          >
            <div className="font-calligraphy text-2xl tracking-widest mb-3">
              {g.endReason === 'two_pass'
                ? (g.score ? (g.score.black > g.score.white ? '黑方胜' : g.score.white > g.score.black ? '白方胜' : '和棋') : '终局')
                : g.endReason === 'resign'
                  ? (g.winnerSide === 1 ? '黑方胜' : '白方胜')
                  : '终局'}
            </div>
            <div className="text-xs mb-2 text-theme-muted">
              {g.endReason === 'resign' ? '认输结束' : g.endReason === 'two_pass' ? '双方跳过，计分终局' : ''}
            </div>
            {g.score && (
              <div className="text-xs mb-4 font-mono text-theme-muted">
                黑 {Math.round(g.score.black)} - 白 {Math.round(g.score.white)}
              </div>
            )}
            <button
              type="button"
              onClick={handleNewGame}
              className="w-full py-3 font-serif-sc text-sm tracking-[0.2em]"
              style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
            >
              再来一局
            </button>
          </div>
        </div>
      )}

      <Footer gameId="go" networkMode="offline-solo" isEncrypted={false} />
    </div>
  )
}
