import XiangqiBoard from './XiangqiBoard.jsx'
import AIThinkingIndicator from '../board/AIThinkingIndicator.jsx'
import { xiangqiGame } from '@tg/core'

export default function XiangqiBoardArea({
  board,
  sideToMove,
  moveHistory,
  gameOver,
  endReason,
  winnerSide,
  selected,
  lastMove,
  legalTargets,
  inCheck,
  onSquarePress,
  aiMode,
  isThinking,
  interactionLocked = false,
}) {
  const generalRC = xiangqiGame.findGeneral(board, sideToMove)

  let statusMain = '对局中'
  if (gameOver) {
    if (endReason === 'checkmate' && winnerSide != null) {
      statusMain = winnerSide === 1 ? '红方胜' : '黑方胜'
    } else if (endReason === 'resign' && winnerSide != null) {
      statusMain = winnerSide === 1 ? '红方胜' : '黑方胜'
    } else if (endReason === 'stalemate') {
      statusMain = '困毙 · 和棋'
    } else {
      statusMain = '终局'
    }
  } else if (sideToMove === 1) {
    statusMain = inCheck ? '红方应着 · 将军' : '红方行棋'
  } else {
    statusMain = inCheck ? '黑方应着 · 将军' : '黑方行棋'
  }

  const statusSub = gameOver
    ? `XIANGQI · ${moveHistory.length} MOVES`
    : `第 ${moveHistory.length + 1} 手 · ${aiMode && isThinking ? 'AI 思考中' : 'READY'}`

  return (
    <main className="flex items-center justify-center p-2 md:p-6">
      <div className="flex flex-col items-center gap-4 w-full max-w-[560px]">
        <div className="text-center min-h-[52px] flex flex-col items-center justify-center">
          <div className="font-calligraphy text-xl md:text-[22px] text-ink tracking-[3px] transition-all">
            {statusMain}
          </div>
          <div className="font-mono text-[10px] text-ink-faint tracking-[0.15em] mt-0.5 uppercase">
            {statusSub}
          </div>
        </div>

        <div className="relative w-full flex justify-center">
          <XiangqiBoard
            board={board}
            selected={selected}
            legalTargets={legalTargets}
            lastMove={lastMove}
            inCheck={inCheck}
            generalRC={generalRC}
            onSquarePress={onSquarePress}
            gameOver={gameOver}
            isThinking={isThinking}
            interactionLocked={interactionLocked}
          />
          <AIThinkingIndicator show={Boolean(aiMode && isThinking)} />
          {gameOver && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)',
              backdropFilter: 'blur(4px)',
              zIndex: 10,
              borderRadius: 4,
              animation: 'fadeIn 0.4s ease',
            }}>
              <div style={{
                fontSize: 36,
                fontWeight: 'bold',
                fontFamily: 'var(--font-display, "Kaiti SC", serif)',
                letterSpacing: '0.25em',
                color: winnerSide === 1 ? '#c41e3a' : 'var(--text-primary)',
                marginBottom: 8,
                textShadow: winnerSide === 1
                  ? '0 0 24px rgba(196,30,58,0.6)'
                  : '0 0 24px color-mix(in srgb, var(--accent-primary) 40%, transparent)',
              }}>
                {endReason === 'stalemate' ? '和棋' : winnerSide === 1 ? '红方胜' : '黑方胜'}
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-primary)',
                letterSpacing: '0.2em',
                marginBottom: 20,
              }}>
                {endReason === 'checkmate' ? 'CHECKMATE' : endReason === 'resign' ? 'RESIGN' : endReason === 'stalemate' ? 'STALEMATE' : 'GAME OVER'}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
