import GoBoard from './GoBoard.jsx'
import AIThinkingIndicator from '../board/AIThinkingIndicator.jsx'

export default function GoBoardArea({
  board,
  currentPlayer,
  moveHistory,
  gameOver,
  winnerSide,
  endReason,
  blackCaptures,
  whiteCaptures,
  lastMove,
  onPlaceStone,
  aiMode,
  isThinking,
  score,
  interactionLocked = false,
}) {
  const moveNum = moveHistory.length

  let statusMain = '对局中'
  if (gameOver) {
    if (endReason === 'resign' && winnerSide != null) {
      statusMain = winnerSide === 1 ? '黑方胜 · 认输' : '白方胜 · 认输'
    } else if (endReason === 'pass') {
      statusMain = winnerSide === 1 ? '黑方胜' : winnerSide === 2 ? '白方胜' : '终局'
    } else if (endReason === 'two_pass') {
      if (score) {
        statusMain = score.black > score.white ? '黑方胜' : score.white > score.black ? '白方胜' : '和棋'
      } else {
        statusMain = '终局'
      }
    } else {
      statusMain = '终局'
    }
  } else {
    statusMain = currentPlayer === 1 ? '黑方落子' : '白方落子'
  }

  const statusSub = gameOver
    ? `GO · ${moveNum} MOVES${score ? ` · B ${Math.round(score.black)} - W ${Math.round(score.white)}` : ''}`
    : `第 ${moveNum + 1} 手 · ${aiMode && isThinking ? 'AI 思考中' : 'READY'}${blackCaptures + whiteCaptures > 0 ? ` · 提子 B${blackCaptures} W${whiteCaptures}` : ''}`

  return (
    <main className="flex items-center justify-center p-2 md:p-6">
      <div className="flex flex-col items-center gap-4 w-full max-w-[600px]">
        <div className="text-center min-h-[52px] flex flex-col items-center justify-center">
          <div className="font-calligraphy text-xl md:text-[22px] text-ink tracking-[3px] transition-all">
            {statusMain}
          </div>
          <div className="font-mono text-[10px] text-ink-faint tracking-[0.15em] mt-0.5 uppercase">
            {statusSub}
          </div>
        </div>

        <div className="relative w-full flex justify-center">
          <GoBoard
            board={board}
            lastMove={lastMove}
            onPlaceStone={onPlaceStone}
            gameOver={gameOver}
            isThinking={isThinking}
            interactionLocked={interactionLocked}
          />
          <AIThinkingIndicator show={Boolean(aiMode && isThinking)} />

          {/* Game over overlay */}
          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-sm" style={{
              background: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)',
              backdropFilter: 'blur(4px)',
              animation: 'fadeIn 0.4s ease',
            }}>
              <div className="text-[36px] font-bold text-text-primary tracking-[0.25em] mb-2" style={{
                fontFamily: 'var(--font-display, "Kaiti SC", serif)',
                textShadow: '0 0 24px color-mix(in srgb, var(--accent-primary) 40%, transparent)',
              }}>
                {endReason === 'two_pass'
                  ? (score ? (score.black > score.white ? '黑方胜' : score.white > score.black ? '白方胜' : '和棋') : '终局')
                  : endReason === 'resign'
                    ? (winnerSide === 1 ? '黑方胜' : '白方胜')
                    : '终局'}
              </div>
              <div className="text-[11px] text-text-muted font-mono tracking-[0.2em] mb-1">
                {endReason === 'resign' ? 'RESIGN' : endReason === 'two_pass' ? 'TWO PASSES' : endReason === 'pass' ? 'PASS' : 'GAME OVER'}
              </div>
              {score && (
                <div className="text-xs text-text-muted font-mono tracking-[0.1em]">
                  B {Math.round(score.black)} - W {Math.round(score.white)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
