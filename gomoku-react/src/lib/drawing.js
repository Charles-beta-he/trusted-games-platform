import { BOARD_SIZE, CELL_SIZE, PADDING, CANVAS_PX, COLS } from './constants.js'

// Pre-generate once at module load — avoids visual jitter on every canvas redraw
const WOOD_GRAIN = Array.from({ length: 30 }, () => {
  const x = Math.random() * CANVAS_PX
  return {
    x0:      x + Math.random() * 10,
    cp1x:    x + Math.random() * 20 - 10,
    cp2x:    x + Math.random() * 20 - 10,
    x1:      x + Math.random() * 10,
    lineWidth: Math.random() * 1.5 + 0.3,
  }
})

function drawBackground(ctx) {
  const grad = ctx.createLinearGradient(0, 0, CANVAS_PX, CANVAS_PX)
  grad.addColorStop(0, '#d4955f')
  grad.addColorStop(0.3, '#c8864e')
  grad.addColorStop(0.7, '#bf7d47')
  grad.addColorStop(1, '#b87040')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX)
}

function drawWoodGrain(ctx) {
  ctx.save()
  ctx.globalAlpha = 0.06
  ctx.strokeStyle = '#6b3a1e'
  for (const g of WOOD_GRAIN) {
    ctx.lineWidth = g.lineWidth
    ctx.beginPath()
    ctx.moveTo(g.x0, 0)
    ctx.bezierCurveTo(g.cp1x, CANVAS_PX * 0.3, g.cp2x, CANVAS_PX * 0.7, g.x1, CANVAS_PX)
    ctx.stroke()
  }
  ctx.restore()
}

function drawGrid(ctx) {
  ctx.strokeStyle = '#7a5c3a'
  ctx.lineWidth = 0.8
  for (let i = 0; i < BOARD_SIZE; i++) {
    const x = PADDING + i * CELL_SIZE
    const y = PADDING + i * CELL_SIZE
    ctx.beginPath()
    ctx.moveTo(x, PADDING)
    ctx.lineTo(x, PADDING + (BOARD_SIZE - 1) * CELL_SIZE)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(PADDING, y)
    ctx.lineTo(PADDING + (BOARD_SIZE - 1) * CELL_SIZE, y)
    ctx.stroke()
  }
}

function drawStarPoints(ctx) {
  const stars = [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11], [3, 7], [7, 3], [7, 11], [11, 7]]
  ctx.fillStyle = '#5a3d20'
  stars.forEach(([r, c]) => {
    ctx.beginPath()
    ctx.arc(PADDING + c * CELL_SIZE, PADDING + r * CELL_SIZE, 3.5, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawCoordinates(ctx) {
  ctx.fillStyle = 'rgba(90,60,30,0.5)'
  ctx.font = '9px Inconsolata, monospace'
  ctx.textAlign = 'center'
  for (let i = 0; i < BOARD_SIZE; i++) {
    const x = PADDING + i * CELL_SIZE
    ctx.fillText(COLS[i], x, PADDING - 6)
    ctx.fillText(COLS[i], x, PADDING + (BOARD_SIZE - 1) * CELL_SIZE + 14)
    ctx.textAlign = 'right'
    ctx.fillText(BOARD_SIZE - i, PADDING - 8, PADDING + i * CELL_SIZE + 3.5)
    ctx.textAlign = 'left'
    ctx.fillText(BOARD_SIZE - i, PADDING + (BOARD_SIZE - 1) * CELL_SIZE + 8, PADDING + i * CELL_SIZE + 3.5)
    ctx.textAlign = 'center'
  }
}

function drawWinningLine(ctx, winningLine) {
  const [r1, c1, r2, c2] = winningLine
  ctx.save()
  ctx.strokeStyle = 'rgba(192,57,43,0.6)'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.shadowColor = 'rgba(192,57,43,0.4)'
  ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.moveTo(PADDING + c1 * CELL_SIZE, PADDING + r1 * CELL_SIZE)
  ctx.lineTo(PADDING + c2 * CELL_SIZE, PADDING + r2 * CELL_SIZE)
  ctx.stroke()
  ctx.restore()
}

function drawStone(ctx, r, c, player, isPreview = false) {
  const x = PADDING + c * CELL_SIZE
  const y = PADDING + r * CELL_SIZE
  const radius = CELL_SIZE * 0.44

  ctx.save()

  if (!isPreview) {
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 3
  }

  if (player === 1) {
    const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.35, 0, x, y, radius)
    grad.addColorStop(0, '#5a5a5a')
    grad.addColorStop(0.4, '#1a1a1a')
    grad.addColorStop(1, '#050505')
    ctx.fillStyle = grad
  } else {
    const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.35, 0, x, y, radius)
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(0.5, '#e8e0d0')
    grad.addColorStop(1, '#c0b8a8')
    ctx.fillStyle = grad
  }

  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()

  if (!isPreview) {
    ctx.shadowColor = 'transparent'
    const highlight = ctx.createRadialGradient(
      x - radius * 0.35, y - radius * 0.35, 0,
      x - radius * 0.35, y - radius * 0.35, radius * 0.6
    )
    highlight.addColorStop(0, player === 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.7)')
    highlight.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = highlight
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

function drawLastMoveIndicator(ctx, lastMove, board) {
  const { r, c } = lastMove
  const x = PADDING + c * CELL_SIZE
  const y = PADDING + r * CELL_SIZE
  ctx.save()
  ctx.strokeStyle = board[r][c] === 1 ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)'
  ctx.lineWidth = 1.5
  const s = 5
  ctx.beginPath()
  ctx.moveTo(x - s, y); ctx.lineTo(x + s, y)
  ctx.moveTo(x, y - s); ctx.lineTo(x, y + s)
  ctx.stroke()
  ctx.restore()
}

function drawHoverPreview(ctx, hoverCell, currentPlayer, board) {
  const { r, c } = hoverCell
  if (board[r][c] !== 0) return
  ctx.save()
  ctx.globalAlpha = 0.35
  drawStone(ctx, r, c, currentPlayer, true)
  ctx.restore()
}

export function drawBoard(ctx, dpr, { board, hoverCell, lastMove, winningLine, currentPlayer, gameOver, aiThinking }) {
  ctx.save()
  ctx.scale(dpr, dpr)

  drawBackground(ctx)
  drawWoodGrain(ctx)
  drawGrid(ctx)
  drawStarPoints(ctx)
  drawCoordinates(ctx)

  if (winningLine) drawWinningLine(ctx, winningLine)

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c]) drawStone(ctx, r, c, board[r][c], false)
    }
  }

  if (lastMove) drawLastMoveIndicator(ctx, lastMove, board)

  if (hoverCell && !gameOver && !aiThinking) {
    drawHoverPreview(ctx, hoverCell, currentPlayer, board)
  }

  ctx.restore()
}

export function getCellFromEvent(e, canvas) {
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const c = Math.round((x - PADDING) / CELL_SIZE)
  const r = Math.round((y - PADDING) / CELL_SIZE)
  if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) return { r, c }
  return null
}
