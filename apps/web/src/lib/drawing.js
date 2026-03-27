import { BOARD_SIZE, CELL_SIZE, PADDING, CANVAS_PX, COLS } from '@tg/core/constants'

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

function getThemeColors() {
  if (typeof document === 'undefined') {
    return {
      boardBg:        '#c8955c',
      boardLine:      '#7a5c3a',
      boardLineGlow:  'transparent',
      stoneBlack:     '#1a1008',
      stoneWhite:     '#f5f0e8',
      stoneBlackGlow: '0 2px 6px rgba(0,0,0,0.5)',
      stoneWhiteGlow: '0 2px 6px rgba(0,0,0,0.25)',
      accentPrimary:  '#c0392b',
      accentDanger:   '#ff3366',
      bgPrimary:      '#f5ede0',
    }
  }
  const s = getComputedStyle(document.documentElement)
  const get = (v) => s.getPropertyValue(v).trim()
  return {
    boardBg:        get('--board-bg')         || '#c8955c',
    boardLine:      get('--board-line')        || '#7a5c3a',
    boardLineGlow:  get('--board-line-glow')   || 'transparent',
    stoneBlack:     get('--stone-black')       || '#1a1008',
    stoneWhite:     get('--stone-white')       || '#f5f0e8',
    stoneBlackGlow: get('--stone-black-glow')  || '0 2px 6px rgba(0,0,0,0.5)',
    stoneWhiteGlow: get('--stone-white-glow')  || '0 2px 6px rgba(0,0,0,0.25)',
    accentPrimary:  get('--accent-primary')    || '#c0392b',
    accentDanger:   get('--accent-danger')     || '#ff3366',
    bgPrimary:      get('--bg-primary')        || '#f5ede0',
  }
}

function getCurrentTheme() {
  if (typeof document === 'undefined') return 'classic-wood'
  return document.documentElement.getAttribute('data-theme') || 'sci-fi'
}

function drawBackground(ctx, c, isSciFi) {
  if (isSciFi) {
    ctx.fillStyle = c.boardBg
    ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX)
  } else {
    const grad = ctx.createLinearGradient(0, 0, CANVAS_PX, CANVAS_PX)
    grad.addColorStop(0, '#d4955f')
    grad.addColorStop(0.3, '#c8864e')
    grad.addColorStop(0.7, '#bf7d47')
    grad.addColorStop(1, '#b87040')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX)
  }
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

function drawGrid(ctx, c, isSciFi) {
  ctx.save()
  if (isSciFi) {
    ctx.shadowBlur = 4
    ctx.shadowColor = c.boardLineGlow || 'rgba(0,212,255,0.2)'
  } else {
    ctx.shadowBlur = 0
  }
  ctx.strokeStyle = c.boardLine
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
  ctx.restore()
}

function drawStarPoints(ctx, c) {
  const stars = [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11], [3, 7], [7, 3], [7, 11], [11, 7]]
  ctx.fillStyle = c.boardLine
  stars.forEach(([r, col]) => {
    ctx.beginPath()
    ctx.arc(PADDING + col * CELL_SIZE, PADDING + r * CELL_SIZE, 3.5, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawCoordinates(ctx, c) {
  ctx.fillStyle = c.boardLine
  ctx.globalAlpha = 0.5
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
  ctx.globalAlpha = 1
}

function drawWinningLine(ctx, winningLine, c) {
  const [r1, c1, r2, c2] = winningLine
  ctx.save()
  ctx.strokeStyle = c.accentDanger
  ctx.globalAlpha = 0.6
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.shadowColor = c.accentDanger
  ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.moveTo(PADDING + c1 * CELL_SIZE, PADDING + r1 * CELL_SIZE)
  ctx.lineTo(PADDING + c2 * CELL_SIZE, PADDING + r2 * CELL_SIZE)
  ctx.stroke()
  ctx.restore()
}

function drawStone(ctx, r, col, player, isPreview = false, c, isSciFi) {
  const x = PADDING + col * CELL_SIZE
  const y = PADDING + r * CELL_SIZE
  const radius = CELL_SIZE * 0.44

  ctx.save()

  if (isSciFi && !isPreview) {
    const isBlack = player === 1
    const currentTheme = getCurrentTheme()
    const isNeonCyber = currentTheme === 'neon-cyber'
    const glowColor = isNeonCyber
      ? (isBlack ? '#ff00ff' : '#00ffcc')
      : (isBlack ? '#7c3aed' : '#00d4ff')
    const baseColor = isBlack ? c.stoneBlack : c.stoneWhite

    ctx.shadowBlur = isNeonCyber ? 8 : 12
    ctx.shadowColor = glowColor
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = baseColor
    ctx.fill()

    // Inner highlight gradient
    ctx.shadowBlur = 0
    const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 1, x, y, radius)
    grad.addColorStop(0, isNeonCyber
      ? (isBlack ? 'rgba(255,0,255,0.35)' : 'rgba(0,255,204,0.4)')
      : (isBlack ? 'rgba(124,58,237,0.4)' : 'rgba(0,212,255,0.5)'))
    grad.addColorStop(1, 'transparent')
    ctx.fillStyle = grad
    ctx.fill()
  } else {
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
  }

  ctx.restore()
}

function drawLastMoveIndicator(ctx, lastMove, board, c) {
  const { r, col: col_ } = lastMove
  // lastMove uses { r, c } keys
  const col = lastMove.c !== undefined ? lastMove.c : col_
  const x = PADDING + col * CELL_SIZE
  const y = PADDING + r * CELL_SIZE
  ctx.save()
  ctx.strokeStyle = board[r][col] === 1 ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)'
  ctx.lineWidth = 1.5
  const s = 5
  ctx.beginPath()
  ctx.moveTo(x - s, y); ctx.lineTo(x + s, y)
  ctx.moveTo(x, y - s); ctx.lineTo(x, y + s)
  ctx.stroke()
  ctx.restore()
}

function drawHoverPreview(ctx, hoverCell, currentPlayer, board, c, isSciFi) {
  const { r, c: col } = hoverCell
  if (board[r][col] !== 0) return

  ctx.save()

  if (isSciFi) {
    const x = PADDING + col * CELL_SIZE
    const y = PADDING + r * CELL_SIZE
    const radius = CELL_SIZE * 0.44
    ctx.shadowBlur = 10
    ctx.shadowColor = 'rgba(0,212,255,0.5)'
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = currentPlayer === 1 ? 'rgba(10,10,26,0.5)' : 'rgba(232,244,255,0.4)'
    ctx.fill()
  } else {
    ctx.globalAlpha = 0.35
    drawStone(ctx, r, col, currentPlayer, true, c, false)
  }

  ctx.restore()
}

export function drawBoard(ctx, dpr, { board, hoverCell, lastMove, winningLine, currentPlayer, gameOver, aiThinking }) {
  const c = getThemeColors()
  const currentTheme = getCurrentTheme()
  const isSciFi = currentTheme === 'sci-fi' || currentTheme === 'neon-cyber'

  ctx.save()
  ctx.scale(dpr, dpr)

  drawBackground(ctx, c, isSciFi)
  if (!isSciFi) drawWoodGrain(ctx)
  drawGrid(ctx, c, isSciFi)
  drawStarPoints(ctx, c)
  drawCoordinates(ctx, c)

  if (winningLine) drawWinningLine(ctx, winningLine, c)

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[r][col]) drawStone(ctx, r, col, board[r][col], false, c, isSciFi)
    }
  }

  if (lastMove) drawLastMoveIndicator(ctx, lastMove, board, c)

  if (hoverCell && !gameOver && !aiThinking) {
    drawHoverPreview(ctx, hoverCell, currentPlayer, board, c, isSciFi)
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
