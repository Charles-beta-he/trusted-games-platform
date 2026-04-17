import ChessBoard from './ChessBoard.jsx'
import AIThinkingIndicator from '../board/AIThinkingIndicator.jsx'
import { chessGame } from '@tg/core'

const { P } = chessGame

const PROMO_PIECES = [
  { piece: P.QUEEN, label: '♕', name: 'Queen' },
  { piece: P.ROOK, label: '♖', name: 'Rook' },
  { piece: P.BISHOP, label: '♗', name: 'Bishop' },
  { piece: P.KNIGHT, label: '♘', name: 'Knight' },
]

export default function ChessBoardArea({
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
  kingRC,
  onSquarePress,
  aiMode,
  isThinking,
  interactionLocked = false,
  pendingPromotion,
  onPromotionSelect,
  onPromotionCancel,
}) {
  let statusMain = '对局中'
  if (gameOver) {
    if (endReason === 'checkmate' && winnerSide != null) {
      statusMain = winnerSide === 1 ? '白方胜' : '黑方胜'
    } else if (endReason === 'resign' && winnerSide != null) {
      statusMain = winnerSide === 1 ? '白方胜' : '黑方胜'
    } else if (endReason === 'stalemate') {
      statusMain = '逼和 · 和棋'
    } else {
      statusMain = '终局'
    }
  } else if (sideToMove === 1) {
    statusMain = inCheck ? '白方应着 · 将军' : '白方行棋'
  } else {
    statusMain = inCheck ? '黑方应着 · 将军' : '黑方行棋'
  }

  const statusSub = gameOver
    ? `CHESS · ${moveHistory.length} MOVES`
    : `第 ${moveHistory.length + 1} 手 · ${aiMode && isThinking ? 'AI 思考中' : 'READY'}`

  return (
    <main className="flex items-center justify-center p-2 md:p-6">
      <div className="flex flex-col items-center gap-4 w-full max-w-[520px]">
        <div className="text-center min-h-[52px] flex flex-col items-center justify-center">
          <div className="font-calligraphy text-xl md:text-[22px] text-ink tracking-[3px] transition-all">
            {statusMain}
          </div>
          <div className="font-mono text-[10px] text-ink-faint tracking-[0.15em] mt-0.5 uppercase">
            {statusSub}
          </div>
        </div>

        <div className="relative w-full flex justify-center">
          <ChessBoard
            board={board}
            selected={selected}
            legalTargets={legalTargets}
            lastMove={lastMove}
            inCheck={inCheck}
            kingRC={kingRC}
            onSquarePress={onSquarePress}
            gameOver={gameOver}
            isThinking={isThinking}
            interactionLocked={interactionLocked}
          />
          <AIThinkingIndicator show={Boolean(aiMode && isThinking)} />

          {/* Promotion dialog */}
          {pendingPromotion && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'color-mix(in srgb, var(--bg-primary) 70%, transparent)',
              zIndex: 20,
              borderRadius: 4,
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                padding: '16px 20px',
                background: 'var(--bg-surface)',
                borderRadius: 8,
                border: '1px solid var(--border-color)',
              }}>
                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                  PAWN PROMOTION
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {PROMO_PIECES.map(({ piece, label, name }) => (
                    <button
                      key={piece}
                      type="button"
                      onClick={() => onPromotionSelect(piece)}
                      style={{
                        width: 52,
                        height: 52,
                        fontSize: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 6,
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                      }}
                      title={name}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Game over overlay */}
          {gameOver && !pendingPromotion && (
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
                color: winnerSide === 1 ? '#fff' : 'var(--text-primary)',
                marginBottom: 8,
                textShadow: '0 0 24px color-mix(in srgb, var(--accent-primary) 40%, transparent)',
              }}>
                {endReason === 'stalemate' ? '和棋' : winnerSide === 1 ? '白方胜' : '黑方胜'}
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
