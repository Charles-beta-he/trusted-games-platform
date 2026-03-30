import { useRef, useEffect, useCallback } from 'react'
import { xiangqiGame } from '@tg/core'
import { xiangqiPieceLabel } from '../../hooks/useXiangqiGame.js'

const { ROWS, COLS } = xiangqiGame

export const XIANGQI_CELL = 52
export const XIANGQI_PAD = 36

export function xiangqiBoardPixelSize() {
  const w = (COLS - 1) * XIANGQI_CELL + 2 * XIANGQI_PAD
  const h = (ROWS - 1) * XIANGQI_CELL + 2 * XIANGQI_PAD
  return { w, h }
}

function drawBoardCore(ctx, dpr, {
  board,
  selected,
  legalTargets,
  lastMove,
  inCheck,
  generalRC,
}) {
  const CELL = XIANGQI_CELL * dpr
  const PAD = XIANGQI_PAD * dpr
  const lineW = 1.2 * dpr
  ctx.save()
  ctx.scale(dpr, dpr)

  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary').trim() || '#1a1520'
  const line = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#3d3848'
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#e8e4dc'
  const muted = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#6b6578'
  const rootStyle = getComputedStyle(document.documentElement)
  const redFill = '#c41e3a'
  const blackFill = rootStyle.getPropertyValue('--text-primary').trim() || '#111'
  const blackPieceBg = rootStyle.getPropertyValue('--bg-secondary').trim() || '#2a2620'

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, (COLS - 1) * XIANGQI_CELL + 2 * XIANGQI_PAD, (ROWS - 1) * XIANGQI_CELL + 2 * XIANGQI_PAD)

  const ox = XIANGQI_PAD
  const oy = XIANGQI_PAD

  const X = (c) => ox + c * XIANGQI_CELL
  const Y = (r) => oy + r * XIANGQI_CELL

  ctx.strokeStyle = line
  ctx.lineWidth = lineW

  // 横线
  for (let r = 0; r < ROWS; r++) {
    ctx.beginPath()
    ctx.moveTo(X(0), Y(r))
    ctx.lineTo(X(COLS - 1), Y(r))
    ctx.stroke()
  }
  // 竖线（楚河两侧断开）
  for (let c = 0; c < COLS; c++) {
    ctx.beginPath()
    ctx.moveTo(X(c), Y(0))
    ctx.lineTo(X(c), Y(4))
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(X(c), Y(5))
    ctx.lineTo(X(c), Y(ROWS - 1))
    ctx.stroke()
  }

  // 九宫斜线
  const palaceDiagonals = [
    [0, 3, 2, 5],
    [0, 5, 2, 3],
    [7, 3, 9, 5],
    [7, 5, 9, 3],
  ]
  for (const [r0, c0, r1, c1] of palaceDiagonals) {
    ctx.beginPath()
    ctx.moveTo(X(c0), Y(r0))
    ctx.lineTo(X(c1), Y(r1))
    ctx.stroke()
  }

  // 楚河汉界
  ctx.font = `${16}px var(--font-display, "Songti SC", serif)`
  ctx.fillStyle = muted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('楚 河', X(2), (Y(4) + Y(5)) / 2)
  ctx.fillText('漢 界', X(6), (Y(4) + Y(5)) / 2)

  // 最后一着高亮
  if (lastMove) {
    ctx.fillStyle = 'rgba(0, 212, 255, 0.18)'
    for (const [r, c] of [[lastMove.fr, lastMove.fc], [lastMove.tr, lastMove.tc]]) {
      ctx.beginPath()
      ctx.arc(X(c), Y(r), XIANGQI_CELL * 0.22, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // 将/帅被将军
  if (inCheck && generalRC) {
    const [gr, gc] = generalRC
    ctx.strokeStyle = redFill
    ctx.lineWidth = 2.5 * dpr
    ctx.beginPath()
    ctx.arc(X(gc), Y(gr), XIANGQI_CELL * 0.36, 0, Math.PI * 2)
    ctx.stroke()
  }

  // 选中 + 合法步
  if (selected) {
    const [sr, sc] = selected
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#00d4ff'
    ctx.lineWidth = 2 * dpr
    ctx.beginPath()
    ctx.arc(X(sc), Y(sr), XIANGQI_CELL * 0.38, 0, Math.PI * 2)
    ctx.stroke()
  }
  if (legalTargets?.length) {
    ctx.fillStyle = 'rgba(0, 212, 255, 0.45)'
    for (const [tr, tc] of legalTargets) {
      const empty = board[tr][tc] === 0
      ctx.beginPath()
      ctx.arc(X(tc), Y(tr), empty ? 6 : 10, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // 棋子
  const pieceR = XIANGQI_CELL * 0.38
  ctx.font = `${Math.round(XIANGQI_CELL * 0.44)}px var(--font-display, "Kaiti SC", "Songti SC", serif)`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c]
      if (p === 0) continue
      const red = p > 0
      ctx.beginPath()
      ctx.arc(X(c), Y(r), pieceR, 0, Math.PI * 2)
      ctx.fillStyle = red ? '#fdf6e3' : blackPieceBg
      ctx.fill()
      ctx.strokeStyle = red ? redFill : blackFill
      ctx.lineWidth = 1.8 * dpr
      ctx.stroke()

      const label = xiangqiPieceLabel(p)
      ctx.fillStyle = red ? redFill : blackFill
      ctx.fillText(label, X(c), Y(r) + 1)
    }
  }

  ctx.restore()
}

function eventToRc(e, canvas, dpr) {
  const rect = canvas.getBoundingClientRect()
  const mx = ((e.clientX ?? e.touches?.[0]?.clientX) - rect.left) * (canvas.width / rect.width)
  const my = ((e.clientY ?? e.touches?.[0]?.clientY) - rect.top) * (canvas.height / rect.height)
  const PAD = XIANGQI_PAD * dpr
  const CELL = XIANGQI_CELL * dpr
  const x = mx - PAD
  const y = my - PAD
  const c = Math.round(x / CELL)
  const r = Math.round(y / CELL)
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null
  if (Math.abs(x / CELL - c) > 0.42 || Math.abs(y / CELL - r) > 0.42) return null
  return { r, c }
}

export default function XiangqiBoard({
  board,
  selected,
  legalTargets,
  lastMove,
  inCheck,
  generalRC,
  onSquarePress,
  gameOver,
  isThinking,
  interactionLocked = false,
}) {
  const canvasRef = useRef(null)
  const dprRef = useRef(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

  const { w, h } = xiangqiBoardPixelSize()
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
      generalRC,
    })
  }, [board, selected, legalTargets, lastMove, inCheck, generalRC])

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
        maxWidth: 'min(96vw, 520px)',
        height: 'auto',
        aspectRatio: `${w} / ${h}`,
        touchAction: 'manipulation',
        cursor: canInteract() ? 'pointer' : 'default',
        opacity: isThinking ? 0.88 : 1,
        borderRadius: 6,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }}
    />
  )
}
