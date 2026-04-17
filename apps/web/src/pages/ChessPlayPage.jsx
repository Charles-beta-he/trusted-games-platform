import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import ModeSelect from '../components/ModeSelect.jsx'
import PlayerCard from '../components/player/PlayerCard.jsx'
import ControlButtons from '../components/controls/ControlButtons.jsx'
import ChessBoardArea from '../components/chess/ChessBoardArea.jsx'
import { useChessGame } from '../hooks/useChessGame.js'
import { useTimer } from '../hooks/useTimer.js'
import { useAI } from '../hooks/useAI.js'

export default function ChessPlayPage() {
  const navigate = useNavigate()
  const { gameId: selectedGame = 'chess' } = useParams()
  const [currentView, setCurrentView] = useState('mode')
  const [aiMode, setAiMode] = useState(false)
  const [difficulty, setDifficulty] = useState('medium')
  const [aiParams, setAiParams] = useState({ aggression: 'balanced', noise: 'slight' })

  const ch = useChessGame()

  const timerPlayer = ch.sideToMove === 1 ? 1 : 2
  const { timers, startTimer, resetTimers } = useTimer(timerPlayer, ch.gameOver)

  useEffect(() => {
    if (ch.moveHistory.length === 1) startTimer()
  }, [ch.moveHistory.length, startTimer])

  const { tryMove } = ch
  const onAIMove = useCallback(
    (m) => {
      if (!m) return
      tryMove(m.fr, m.fc, m.tr, m.tc)
    },
    [tryMove],
  )

  const { isThinking } = useAI({
    board: ch.board,
    currentPlayer: ch.sideToMove,
    aiMode,
    difficulty,
    aiParams,
    gameOver: ch.gameOver,
    gameKind: 'chess',
    aiSide: -1,
    onAIMove,
  })

  const interactionLocked = Boolean((aiMode && ch.sideToMove === -1) || isThinking)

  const handleNewGame = useCallback(() => {
    ch.newGame()
    resetTimers()
  }, [ch, resetTimers])

  const handleUndo = useCallback(() => {
    if (ch.gameOver) return
    ch.undoMove(aiMode)
  }, [ch, aiMode])

  const handleToggleAI = useCallback(() => {
    setAiMode((v) => !v)
    ch.newGame()
    resetTimers()
  }, [ch, resetTimers])

  const handleResign = useCallback(() => {
    if (ch.gameOver || ch.moveHistory.length === 0) return
    ch.resign()
  }, [ch])

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
            if (opts?.aiParams) setAiParams(opts.aiParams)
          } else {
            setAiMode(false)
          }
          ch.newGame()
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
      className="flex flex-col"
      style={{ minHeight: '100svh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <Header
        moveCount={ch.moveHistory.length}
        gameId={`chess-${ch.moveHistory.length}`}
        onBackToLobby={() => navigate('/')}
      />

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
            name="白方"
            type={aiMode ? '本机 · 执白' : '本地'}
            timer={timers.black}
            isActive={ch.sideToMove === 1 && !ch.gameOver}
          />
        </div>
        <div className="flex-1">
          <PlayerCard
            player={2}
            name={aiMode ? 'AI' : '黑方'}
            type={aiMode ? `AI · ${difficulty.toUpperCase()}` : '本地'}
            timer={timers.white}
            isActive={ch.sideToMove === -1 && !ch.gameOver}
          />
        </div>
      </div>

      <div className="flex flex-1" style={{ minHeight: 0 }}>
        <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 overflow-y-auto" style={{ borderRight: '1px solid var(--border-color)' }}>
          <div className="p-5 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <PlayerCard
                player={1}
                name="白方"
                type={aiMode ? 'PLAYER · 执白' : 'PLAYER · 本地'}
                timer={timers.black}
                isActive={ch.sideToMove === 1 && !ch.gameOver}
              />
              <PlayerCard
                player={2}
                name={aiMode ? 'AI' : '黑方'}
                type={aiMode ? `AI · ${difficulty.toUpperCase()}` : 'PLAYER · 本地'}
                timer={timers.white}
                isActive={ch.sideToMove === -1 && !ch.gameOver}
              />
            </div>
            <ControlButtons
              onNewGame={handleNewGame}
              onUndo={handleUndo}
              onToggleAI={handleToggleAI}
              onExport={ch.exportRecord}
              onResign={handleResign}
              aiMode={aiMode}
              gameOver={ch.gameOver}
              canUndo={ch.moveHistory.length > 0}
              mode="all"
            />
            <p className="text-[9px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              国际象棋对局为本地 + 人机。支持王车易位、吃过路兵、兵升变。
            </p>
          </div>
        </aside>

        <div className="flex-1 overflow-auto flex flex-col relative">
          <ChessBoardArea
            board={ch.board}
            sideToMove={ch.sideToMove}
            moveHistory={ch.moveHistory}
            gameOver={ch.gameOver}
            endReason={ch.endReason}
            winnerSide={ch.winnerSide}
            selected={ch.selected}
            lastMove={ch.lastMove}
            legalTargets={ch.legalTargets}
            inCheck={ch.inCheck}
            kingRC={ch.kingRC}
            onSquarePress={ch.onSquarePress}
            aiMode={aiMode}
            isThinking={isThinking}
            interactionLocked={interactionLocked}
            pendingPromotion={ch.pendingPromotion}
            onPromotionSelect={ch.confirmPromotion}
            onPromotionCancel={ch.cancelPromotion}
          />
          <div className="md:hidden px-2 pb-2">
            <ControlButtons
              onNewGame={handleNewGame}
              onUndo={handleUndo}
              onToggleAI={handleToggleAI}
              onExport={ch.exportRecord}
              onResign={handleResign}
              aiMode={aiMode}
              gameOver={ch.gameOver}
              canUndo={ch.moveHistory.length > 0}
              mode="primary"
            />
          </div>
        </div>
      </div>

      {ch.gameOver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'color-mix(in srgb, var(--bg-primary) 86%, transparent)' }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-w-sm w-full p-6 rounded-lg border text-center"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="font-calligraphy text-2xl tracking-widest mb-3">
              {ch.endReason === 'stalemate'
                ? '和棋'
                : ch.winnerSide === 1
                  ? '白方胜'
                  : ch.winnerSide === -1
                    ? '黑方胜'
                    : '终局'}
            </div>
            <div className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
              {ch.endReason === 'resign' ? '认输结束' : ch.endReason === 'checkmate' ? '将杀' : ''}
            </div>
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

      <Footer gameId="chess" networkMode="offline-solo" isEncrypted={false} />
    </div>
  )
}
