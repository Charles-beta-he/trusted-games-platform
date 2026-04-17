import { useRef, useEffect, useCallback } from 'react'
import { chessGame } from '@tg/core'

const { ROWS, COLS, P } = chessGame

export const CHESS_CELL = 60

// Unicode chess pieces (white positive, black negative)
const PIECE_SYMBOLS = {
  [P.KING]:   { w: '♔', b: '♚' },
  [P.QUEEN]:  { w: '♕', b: '♛' },
  [P.ROOK]:   { w: '♖', b: '♜' },
  [P.BISHOP]: { w: '♗', b: '♝' },
  [P.KNIGHT]: { w: '♘', b: '♞' },
  [P.PAWN]:   { w: '♙', b: '♟' },
}

export function chessBoardPixelSize() {
  const w = COLS * CHESS_CELL
  const h = ROWS * CHESS_CELL
  return { w, h }
}

function drawBoardCore(ctx, dpr, {
  board,
  selected,
  legalTargets,
  lastMove,
  inCheck,
  kingRC,
}) {
  const CELL = CHESS_CELL * dpr
  ctx.save()
  ctx.scale(dpr, dpr)

  const rootStyle = getComputedStyle(document.documentElement)
  const lightSquare = rootStyle.getPropertyValue('--bg-surface').trim() || '#f0d9b5'
  const darkSquare = rootStyle.getPropertyValue('--bg-secondary').trim() || '#b58863'
  const whitePieceColor = rootStyle.getPropertyValue('--text-primary').trim() || '#fff'
  const blackPieceColor = '#1a1a2e'
  const accentColor = rootStyle.getPropertyValue('--accent-primary').trim() || '#00d4ff'
  const checkColor = '#ff4444'
  const lastMoveColor = 'rgba(0, 212, 255, 0.22)'

  // Draw squares
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const isLight = (r + c) % 2 === 0
      ctx.fillStyle = isLight ? lightSquare : darkSquare
      ctx.fillRect(c * CELL, r * CELL, CELL, CELL)
    }
  }

  // Last move highlight
  if (lastMove) {
    ctx.fillStyle = lastMoveColor
    for (const [r, c] of [[lastMove.fr, lastMove.fc], [lastMove.tr, lastMove.tc]]) {
      ctx.fillRect(c * CELL, r * CELL, CELL, CELL)
    }
  }

  // Selected square highlight
  if (selected) {
    const [sr, sc] = selected
    ctx.fillStyle = `${accentColor}33`
    ctx.fillRect(sc * CELL, sr * CELL, CELL, CELL)
    ctx.strokeStyle = accentColor
    ctx.lineWidth = 2.5 * dpr
    ctx.strokeRect(sc * CELL + 1, sr * CELL + 1, CELL - 2, CELL - 2)
  }

  // Legal move indicators
  if (legalTargets?.length) {
    for (const [tr, tc] of legalTargets) {
      const empty = board[tr][tc] === 0
      const cx = tc * CELL + CELL / 2
      const cy = tr * CELL + CELL / 2
      if (empty) {
        // Small dot for empty squares
        ctx.beginPath()
        ctx.arc(cx, cy, CELL * 0.15, 0, Math.PI * 2)
        ctx.fillStyle = `${accentColor}66`
        ctx.fill()
      } else {
        // Ring for captures
        ctx.beginPath()
        ctx.arc(cx, cy, CELL * 0.42, 0, Math.PI * 2)
        ctx.strokeStyle = `${accentColor}88`
        ctx.lineWidth = 3 * dpr
        ctx.stroke()
      }
    }
  }

  // Check indicator
  if (inCheck && kingRC) {
    const [kr, kc] = kingRC
    const cx = kc * CELL + CELL / 2
    const cy = kr * CELL + CELL / 2
    ctx.beginPath()
    ctx.arc(cx, cy, CELL * 0.44, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 68, 68, 0.4)'
    ctx.fill()
  }

  // Pieces
  ctx.font = `${Math.round(CELL * 0.72)}px "Segoe UI Symbol", "Noto Sans Symbols", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c]
      if (p === 0) continue
      const tp = Math.abs(p)
      const white = p > 0
      const sym = PIECE_SYMBOLS[tp]
      if (!sym) continue
      const char = white ? sym.w : sym.b
      const cx = c * CELL + CELL / 2
      const cy = r * CELL + CELL / 2 + 2

      // Shadow
      ctx.fillStyle = white ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)'
      ctx.fillText(char, cx + 1, cy + 1)

      // Piece
      ctx.fillStyle = white ? whitePieceColor : blackPieceColor
      ctx.fillText(char, cx, cy)
    }
  }

  // Coordinates
  ctx.font = `${Math.round(CELL * 0.18)}px monospace`
  ctx.fillStyle = 'rgba(128, 128, 128, 0.6)'
  for (let c = 0; c < COLS; c++) {
    ctx.textAlign = 'right'
    ctx.fillText(String.fromCharCode(97 + c), (c + 1) * CELL - 3, ROWS * CELL - 3)
  }
  for (let r = 0; r < ROWS; r++) {
    ctx.textAlign = 'left'
    ctx.fillText(String(8 - r), 3, r * CELL + 13)
  }

  ctx.restore()
}

function eventToRc(e, canvas, dpr) {
  const rect = canvas.getBoundingClientRect()
  const mx = ((e.clientX ?? e.touches?.[0]?.clientX) - rect.left) * (canvas.width / rect.width)
  const my = ((e.clientY ?? e.touches?.[0]?.clientY) - rect.top) * (canvas.height / rect.height)
  const CELL = CHESS_CELL * dpr
  const c = Math.floor(mx / CELL)
  const r = Math.floor(my / CELL)
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null
  return { r, c }
}

export default function ChessBoard({
  board,
  selected,
  legalTargets,
  lastMove,
  inCheck,
  kingRC,
  onSquarePress,
  gameOver,
  isThinking,
  interactionLocked = false,
}) {
  const canvasRef = useRef(null)
  const dprRef = useRef(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

  const { w, h } = chessBoardPixelSize()
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = dprRef.current
    canvas.width = w * dpr
    canvas.height = h * dpr
    const ctx = canvas.getContext('2d')
    drawBoardCore(ctx, dpr, {
      board,
      selected,
      legalTargets,
      lastMove,
      inCheck,
      kingRC,
    })
  }, [board, selected, legalTargets, lastMove, inCheck, kingRC])

  const canInteract = useCallback(() => {
    if (interactionLocked || gameOver || isThinking) return false
    return true
  }, [interactionLocked, gameOver, isThinking])

  const handleClick = useCallback(
    (e) => {
      if (!canInteract()) return
      const rc = eventToRc(e, canvasRef.current, dprRef.current)
      if (rc) onSquarePress(rc.r, rc.c)
    },
    [canInteract, onSquarePress],
  )

  return (
    <canvas
      ref={canvasRef}
      width={w}
      height={h}
      onClick={handleClick}
      onTouchEnd={(e) => {
        e.preventDefault()
        handleClick(e)
      }}
      style={{
        width: '100%',
        maxWidth: 'min(96vw, 480px)',
        height: 'auto',
        aspectRatio: `${w} / ${h}`,
        touchAction: 'manipulation',
        cursor: canInteract() ? 'pointer' : 'default',
        opacity: isThinking ? 0.88 : 1,
        borderRadius: 4,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }}
    />
  )
}
