import { useRef, useEffect, useCallback } from 'react'

export const GO_BOARD_SIZE = 19
export const GO_CELL = 28
export const GO_PADDING = 20

export function goBoardPixelSize() {
  const s = GO_PADDING * 2 + GO_CELL * (GO_BOARD_SIZE - 1)
  return { w: s, h: s }
}

// Star points for 19x19 board (row, col)
const STAR_POINTS = [
  [3, 3], [3, 9], [3, 15],
  [9, 3], [9, 9], [9, 15],
  [15, 3], [15, 9], [15, 15],
]

const COL_LABELS = 'ABCDEFGHJKLMNOPQRST'

function drawBoardCore(ctx, dpr, { board, lastMove, isThinking }) {
  const CELL = GO_CELL * dpr
  const PAD = GO_PADDING * dpr
  const size = PAD * 2 + CELL * (GO_BOARD_SIZE - 1)

  ctx.save()
  ctx.scale(dpr, dpr)

  const rootStyle = getComputedStyle(document.documentElement)
  const boardColor = rootStyle.getPropertyValue('--bg-surface').trim() || '#dcb35c'
  const lineColor = '#1a1a1a'
  const accentColor = rootStyle.getPropertyValue('--accent-primary').trim() || '#00d4ff'
  const blackStoneColor = '#1a1a1a'
  const whiteStoneColor = '#f0f0f0'

  // Board background
  ctx.fillStyle = boardColor
  ctx.fillRect(0, 0, size, size)

  // Grid lines
  ctx.strokeStyle = lineColor
  ctx.lineWidth = 1
  for (let i = 0; i < GO_BOARD_SIZE; i++) {
    const pos = PAD + i * CELL
    // Horizontal
    ctx.beginPath()
    ctx.moveTo(PAD, pos)
    ctx.lineTo(PAD + (GO_BOARD_SIZE - 1) * CELL, pos)
    ctx.stroke()
    // Vertical
    ctx.beginPath()
    ctx.moveTo(pos, PAD)
    ctx.lineTo(pos, PAD + (GO_BOARD_SIZE - 1) * CELL)
    ctx.stroke()
  }

  // Star points
  ctx.fillStyle = lineColor
  for (const [r, c] of STAR_POINTS) {
    const cx = PAD + c * CELL
    const cy = PAD + r * CELL
    ctx.beginPath()
    ctx.arc(cx, cy, CELL * 0.12, 0, Math.PI * 2)
    ctx.fill()
  }

  // Coordinate labels
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.font = `${Math.round(CELL * 0.32)}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let c = 0; c < GO_BOARD_SIZE; c++) {
    ctx.fillText(COL_LABELS[c], PAD + c * CELL, PAD + GO_BOARD_SIZE * CELL + 2)
  }
  ctx.textBaseline = 'bottom'
  for (let r = 0; r < GO_BOARD_SIZE; r++) {
    ctx.fillText(String(GO_BOARD_SIZE - r), PAD - GO_BOARD_SIZE * CELL - 8, PAD + r * CELL + 2)
  }

  // Last move highlight (small triangle marker)
  if (lastMove) {
    const lx = PAD + lastMove.c * CELL
    const ly = PAD + lastMove.r * CELL
    const markerR = CELL * 0.18
    ctx.fillStyle = board[lastMove.r][lastMove.c] === 1 ? '#ff5555' : '#ff5555'
    ctx.beginPath()
    ctx.arc(lx, ly, markerR, 0, Math.PI * 2)
    ctx.fill()
  }

  // Stones
  const stoneR = CELL * 0.44
  for (let r = 0; r < GO_BOARD_SIZE; r++) {
    for (let c = 0; c < GO_BOARD_SIZE; c++) {
      const p = board[r][c]
      if (p === 0) continue
      const cx = PAD + c * CELL
      const cy = PAD + r * CELL

      // Shadow
      ctx.beginPath()
      ctx.arc(cx + 1.5, cy + 1.5, stoneR, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.fill()

      // Stone body
      ctx.beginPath()
      ctx.arc(cx, cy, stoneR, 0, Math.PI * 2)
      if (p === 1) {
        // Black stone with gradient
        const grad = ctx.createRadialGradient(cx - stoneR * 0.3, cy - stoneR * 0.3, stoneR * 0.1, cx, cy, stoneR)
        grad.addColorStop(0, '#555')
        grad.addColorStop(1, blackStoneColor)
        ctx.fillStyle = grad
      } else {
        // White stone with gradient
        const grad = ctx.createRadialGradient(cx - stoneR * 0.3, cy - stoneR * 0.3, stoneR * 0.1, cx, cy, stoneR)
        grad.addColorStop(0, '#fff')
        grad.addColorStop(1, whiteStoneColor)
        ctx.fillStyle = grad
      }
      ctx.fill()

      // Stone edge
      ctx.strokeStyle = p === 1 ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 0.8
      ctx.stroke()
    }
  }

  // Last move marker on top of stone
  if (lastMove && board[lastMove.r][lastMove.c] !== 0) {
    const lx = PAD + lastMove.c * CELL
    const ly = PAD + lastMove.r * CELL
    const markerR = CELL * 0.15
    ctx.beginPath()
    ctx.arc(lx, ly, markerR, 0, Math.PI * 2)
    ctx.fillStyle = board[lastMove.r][lastMove.c] === 1 ? '#ff6666' : '#cc3333'
    ctx.fill()
  }

  // Thinking overlay
  if (isThinking) {
    ctx.fillStyle = 'rgba(0,0,0,0.08)'
    ctx.fillRect(0, 0, size, size)
  }

  ctx.restore()
}

function eventToRc(e, canvas, dpr) {
  const rect = canvas.getBoundingClientRect()
  const CELL = GO_CELL * dpr
  const PAD = GO_PADDING * dpr
  const mx = ((e.clientX ?? e.touches?.[0]?.clientX) - rect.left) * (canvas.width / rect.width)
  const my = ((e.clientY ?? e.touches?.[0]?.clientY) - rect.top) * (canvas.height / rect.height)
  const c = Math.round((mx - PAD) / CELL)
  const r = Math.round((my - PAD) / CELL)
  if (r < 0 || r >= GO_BOARD_SIZE || c < 0 || c >= GO_BOARD_SIZE) return null
  return { r, c }
}

export default function GoBoard({
  board,
  lastMove,
  onPlaceStone,
  gameOver,
  isThinking,
  interactionLocked = false,
}) {
  const canvasRef = useRef(null)
  const dprRef = useRef(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

  const { w, h } = goBoardPixelSize()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = dprRef.current
    canvas.width = w * dpr
    canvas.height = h * dpr
    const ctx = canvas.getContext('2d')
    drawBoardCore(ctx, dpr, { board, lastMove, isThinking })
  }, [board, lastMove, isThinking, w, h])

  const canInteract = useCallback(() => {
    if (interactionLocked || gameOver || isThinking) return false
    return true
  }, [interactionLocked, gameOver, isThinking])

  const handleClick = useCallback(
    (e) => {
      if (!canInteract()) return
      const rc = eventToRc(e, canvasRef.current, dprRef.current)
      if (rc) onPlaceStone(rc.r, rc.c)
    },
    [canInteract, onPlaceStone],
  )

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="围棋棋盘 19×19"
      width={w}
      height={h}
      onClick={handleClick}
      onTouchEnd={(e) => {
        e.preventDefault()
        handleClick(e)
      }}
      style={{
        width: '100%',
        maxWidth: 'min(96vw, 560px)',
        height: 'auto',
        aspectRatio: `${w} / ${h}`,
        touchAction: 'manipulation',
        cursor: canInteract() ? 'pointer' : 'default',
        opacity: isThinking ? 0.88 : 1,
        borderRadius: 2,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }}
    />
  )
}
