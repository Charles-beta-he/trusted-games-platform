import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import ModeSelect from '../components/ModeSelect.jsx'
import PlayerCard from '../components/player/PlayerCard.jsx'
import ControlButtons from '../components/controls/ControlButtons.jsx'
import XiangqiBoardArea from '../components/xiangqi/XiangqiBoardArea.jsx'
import { useXiangqiGame } from '../hooks/useXiangqiGame.js'
import { useTimer } from '../hooks/useTimer.js'
import { useAI } from '../hooks/useAI.js'

export default function XiangqiPlayPage() {
  const navigate = useNavigate()
  const { gameId: selectedGame = 'xiangqi' } = useParams()
  const [currentView, setCurrentView] = useState('mode')
  const [aiMode, setAiMode] = useState(false)
  const [difficulty, setDifficulty] = useState('medium')
  const [styleId, setStyleId] = useState('balanced')

  const xq = useXiangqiGame()

  const timerPlayer = xq.sideToMove === 1 ? 1 : 2
  const { timers, startTimer, resetTimers } = useTimer(timerPlayer, xq.gameOver)

  useEffect(() => {
    if (xq.moveHistory.length === 1) startTimer()
  }, [xq.moveHistory.length, startTimer])

  const { tryMove } = xq
  const onAIMove = useCallback(
    (m) => {
      if (!m) return
      tryMove(m.fr, m.fc, m.tr, m.tc)
    },
    [tryMove],
  )

  const { isThinking } = useAI({
    board: xq.board,
    currentPlayer: xq.sideToMove,
    aiMode,
    difficulty,
    styleId,
    gameOver: xq.gameOver,
    gameKind: 'xiangqi',
    aiSide: -1,
    aiStyleEnabled: false,
    onAIMove,
  })

  const interactionLocked = Boolean((aiMode && xq.sideToMove === -1) || isThinking)

  const handleNewGame = useCallback(() => {
    xq.newGame()
    resetTimers()
  }, [xq, resetTimers])

  const handleUndo = useCallback(() => {
    if (xq.gameOver) return
    xq.undoMove(aiMode)
  }, [xq, aiMode])

  const handleToggleAI = useCallback(() => {
    setAiMode((v) => !v)
    xq.newGame()
    resetTimers()
  }, [xq, resetTimers])

  const handleResign = useCallback(() => {
    if (xq.gameOver || xq.moveHistory.length === 0) return
    xq.resign()
  }, [xq])

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
            if (opts?.styleId) setStyleId(opts.styleId)
          } else {
            setAiMode(false)
          }
          xq.newGame()
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
        moveCount={xq.moveHistory.length}
        gameId={`xiangqi-${xq.moveHistory.length}`}
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
            name="红方"
            type={aiMode ? '本机 · 执红' : '本地'}
            timer={timers.black}
            isActive={xq.sideToMove === 1 && !xq.gameOver}
          />
        </div>
        <div className="flex-1">
          <PlayerCard
            player={2}
            name={aiMode ? 'AI' : '黑方'}
            type={aiMode ? `AI · ${difficulty.toUpperCase()}` : '本地'}
            timer={timers.white}
            isActive={xq.sideToMove === -1 && !xq.gameOver}
          />
        </div>
      </div>

      <div className="flex flex-1" style={{ minHeight: 0 }}>
        <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 overflow-y-auto" style={{ borderRight: '1px solid var(--border-color)' }}>
          <div className="p-5 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <PlayerCard
                player={1}
                name="红方"
                type={aiMode ? 'PLAYER · 执红' : 'PLAYER · 本地'}
                timer={timers.black}
                isActive={xq.sideToMove === 1 && !xq.gameOver}
              />
              <PlayerCard
                player={2}
                name={aiMode ? 'AI' : '黑方'}
                type={aiMode ? `AI · ${difficulty.toUpperCase()}` : 'PLAYER · 本地'}
                timer={timers.white}
                isActive={xq.sideToMove === -1 && !xq.gameOver}
              />
            </div>
            <ControlButtons
              onNewGame={handleNewGame}
              onUndo={handleUndo}
              onToggleAI={handleToggleAI}
              onExport={xq.exportRecord}
              onResign={handleResign}
              aiMode={aiMode}
              gameOver={xq.gameOver}
              canUndo={xq.moveHistory.length > 0}
              mode="all"
            />
            <p className="text-[9px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              象棋对局为本地 + 人机；P2P / 见证链与五子棋协议未共用。后续可按游戏 ID 拆消息格式以降低耦合。
            </p>
          </div>
        </aside>

        <div className="flex-1 overflow-auto flex flex-col relative">
          <XiangqiBoardArea
            board={xq.board}
            sideToMove={xq.sideToMove}
            moveHistory={xq.moveHistory}
            gameOver={xq.gameOver}
            endReason={xq.endReason}
            winnerSide={xq.winnerSide}
            selected={xq.selected}
            lastMove={xq.lastMove}
            legalTargets={xq.legalTargets}
            inCheck={xq.inCheck}
            onSquarePress={xq.onSquarePress}
            aiMode={aiMode}
            isThinking={isThinking}
            interactionLocked={interactionLocked}
          />
          <div className="md:hidden px-2 pb-2">
            <ControlButtons
              onNewGame={handleNewGame}
              onUndo={handleUndo}
              onToggleAI={handleToggleAI}
              onExport={xq.exportRecord}
              onResign={handleResign}
              aiMode={aiMode}
              gameOver={xq.gameOver}
              canUndo={xq.moveHistory.length > 0}
              mode="primary"
            />
          </div>
        </div>
      </div>

      {xq.gameOver && (
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
              {xq.endReason === 'stalemate'
                ? '和棋'
                : xq.winnerSide === 1
                  ? '红方胜'
                  : xq.winnerSide === -1
                    ? '黑方胜'
                    : '终局'}
            </div>
            <div className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
              {xq.endReason === 'resign' ? '认输结束' : xq.endReason === 'checkmate' ? '将杀' : ''}
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

      <Footer gameId="xiangqi" networkMode="offline-solo" isEncrypted={false} />
    </div>
  )
}
