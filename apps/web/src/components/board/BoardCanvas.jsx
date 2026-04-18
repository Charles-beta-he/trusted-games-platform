import { useRef, useEffect, useCallback, useState } from 'react'
import { drawBoard, getCellFromEvent } from '../../lib/drawing.js'
import { CANVAS_PX, COLS, BOARD_SIZE } from '@tg/core/constants'
import { useTheme } from '../../contexts/ThemeContext.jsx'
import VictoryOverlay from './VictoryOverlay.jsx'
import AIThinkingIndicator from './AIThinkingIndicator.jsx'
import { animate, easings } from '../../lib/animations.js'

export default function BoardCanvas({
  board, currentPlayer, moveHistory, gameOver, winningLine,
  lastMove, hoverCell, setHoverCell, isThinking,
  isDraw, resignedPlayer, placeStone, newGame, aiMode, localPlayer,
  showVictoryOverlay, onReplay, onVictoryExport,
  interactionLocked = false,
}) {
  const canvasRef = useRef(null)
  const dprRef = useRef(window.devicePixelRatio || 1)
  const { theme } = useTheme()
  const [pendingCell, setPendingCell] = useState(null)
  const [animProgress, setAnimProgress] = useState(null) // null = not animating, 0-1 = animating
  const prevLastMoveRef = useRef(null)
  const prevBoardRef = useRef(board)
  const [winLineProgress, setWinLineProgress] = useState(null)
  // 悔棋消失动画
  const [undoAnimCell, setUndoAnimCell] = useState(null)
  const [undoAnimProgress, setUndoAnimProgress] = useState(null)

  let winner = null
  if (gameOver && !isDraw) {
    if (resignedPlayer) winner = resignedPlayer === 1 ? 2 : 1
    else {
      const lastP = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].player : null
      winner = lastP
    }
  }

  const lastHash = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].hash : ''

  // ── Ref 同步（供 render 函数读取最新值）────────────────────────────────────
  const boardRef = useRef(board)
  const hoverCellRef = useRef(hoverCell)
  const pendingCellRef = useRef(pendingCell)
  const lastMoveR = useRef(lastMove)
  const currentPlayerRef = useRef(currentPlayer)
  const gameOverRef = useRef(gameOver)
  const isThinkingRef = useRef(isThinking)
  const winningLineRef = useRef(winningLine)
  const themeRef = useRef(theme)
  const animProgressRef = useRef(animProgress)
  const winLineProgressRef = useRef(winLineProgress)
  const undoAnimCellRef = useRef(undoAnimCell)
  const undoAnimProgressRef = useRef(undoAnimProgress)

  useEffect(() => {
    boardRef.current = board
    hoverCellRef.current = hoverCell
    pendingCellRef.current = pendingCell
    lastMoveR.current = lastMove
    currentPlayerRef.current = currentPlayer
    gameOverRef.current = gameOver
    isThinkingRef.current = isThinking
    winningLineRef.current = winningLine
    themeRef.current = theme
    animProgressRef.current = animProgress
    winLineProgressRef.current = winLineProgress
    undoAnimCellRef.current = undoAnimCell
    undoAnimProgressRef.current = undoAnimProgress
  }, [board, hoverCell, pendingCell, lastMove, currentPlayer, gameOver, isThinking, winningLine, theme, animProgress, winLineProgress, undoAnimCell, undoAnimProgress])

  // ── 动画互斥队列 ────────────────────────────────────────────────────────────
  const animQueueRef = useRef(Promise.resolve())

  function enqueueAnimation(duration, easing, updateKey, doneState) {
    const prev = animQueueRef.current
    let cancel = null

    const p = new Promise((resolve) => {
      const startAnim = () => {
        cancel = animate({
          from: 0,
          to: 1,
          duration,
          easing,
          onUpdate: (value) => {
            if (updateKey === 'drop') setAnimProgress(value)
            else if (updateKey === 'win') setWinLineProgress(value)
            else if (updateKey === 'undo') setUndoAnimProgress(value)
          },
          onComplete: resolve,
        })
      }
      prev.then(startAnim)
    })

    animQueueRef.current = p.then(() => {
      if (updateKey === 'drop') setAnimProgress(doneState)
      else if (updateKey === 'win') setWinLineProgress(doneState)
      else if (updateKey === 'undo') {
        setUndoAnimProgress(doneState)
        if (doneState === null) setUndoAnimCell(null)
      }
    })

    return () => { cancel?.() }
  }

  // ── 落子缩放弹跳动画 ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!lastMove) { prevLastMoveRef.current = null; return }

    const prev = prevLastMoveRef.current
    const isSameMove = prev && prev.r === lastMove.r && prev.c === lastMove.c
    prevLastMoveRef.current = lastMove

    if (isSameMove) return

    return enqueueAnimation(350, easings.bounce, 'drop', null)
  }, [lastMove])

  // ── 胜利线绘制动画 ────────────────────────────────────────────────────────
  useEffect(() => {
    if (winningLine) {
      return enqueueAnimation(700, easings.smoothOut, 'win', 1)
    } else {
      setWinLineProgress(null)
    }
  }, [winningLine])

  // ── 悔棋消失动画 ──────────────────────────────────────────────────────────
  useEffect(() => {
    const prevBoard = prevBoardRef.current
    if (prevBoard && prevBoard !== board) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (prevBoard[r][col] !== 0 && board[r][col] === 0) {
            const removedPlayer = prevBoard[r][col]
            setUndoAnimCell({ r, c: col, player: removedPlayer })
            setUndoAnimProgress(0)
            prevBoardRef.current = board
            return enqueueAnimation(280, easings.smoothIn, 'undo', null)
          }
        }
      }
    }
    prevBoardRef.current = board
  }, [board])

  // ── OffscreenCanvas 复用 + RAF 渲染 ───────────────────────────────────────
  const offscreenRef = useRef(null)
  const rafIdRef = useRef(null)
  const lastDrawTimeRef = useRef(0)
  const drawThrottleMs = 16 // ~60fps

  // 初始化 OffscreenCanvas（只创建一次）+ 设置主 canvas 尺寸
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = dprRef.current
    const px = Math.round(CANVAS_PX * dpr)
    // 设置主 canvas 像素尺寸
    canvas.width = px
    canvas.height = px
    // 创建 offscreen
    const offscreen = new OffscreenCanvas(px, px)
    offscreenRef.current = offscreen
  }, [])

  // 渲染函数（通过 ref 让 RAF 循环始终读取最新状态）
  const renderRef = useRef(null)
  renderRef.current = () => {
    const offscreen = offscreenRef.current
    if (!offscreen) return
    const offCtx = offscreen.getContext('2d')
    const dpr = dprRef.current
    drawBoard(offCtx, dpr, {
      board: boardRef.current,
      hoverCell: hoverCellRef.current,
      pendingCell: pendingCellRef.current,
      lastMove: lastMoveR.current,
      winningLine: winningLineRef.current,
      currentPlayer: currentPlayerRef.current,
      gameOver: gameOverRef.current,
      aiThinking: isThinkingRef.current,
      lastMoveAnimationProgress: animProgressRef.current,
      winningLineProgress: winLineProgressRef.current,
      undoAnimCell: undoAnimCellRef.current,
      undoAnimProgress: undoAnimProgressRef.current,
    })
  }

  // RAF 循环（只启动一次，通过 ref 读取最新 render 函数）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const loop = () => {
      const now = performance.now()
      if (now - lastDrawTimeRef.current >= drawThrottleMs) {
        lastDrawTimeRef.current = now
        renderRef.current?.()
        const offscreen = offscreenRef.current
        if (offscreen) ctx.drawImage(offscreen, 0, 0)
      }
      rafIdRef.current = requestAnimationFrame(loop)
    }
    rafIdRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    }
  }, [])

  const handleMouseMove = useCallback((e) => {
    const cell = getCellFromEvent(e, canvasRef.current)
    setHoverCell(cell)
  }, [setHoverCell])

  const handleMouseLeave = useCallback(() => {
    setHoverCell(null)
  }, [setHoverCell])

  const canMove = useCallback(() => {
    if (interactionLocked || gameOver || isThinking) return false
    if (aiMode && currentPlayer === 2) return false
    if (localPlayer != null && currentPlayer !== localPlayer) return false
    return true
  }, [interactionLocked, gameOver, isThinking, aiMode, currentPlayer, localPlayer])

  const handleClick = useCallback((e) => {
    if (!canMove()) return
    const cell = getCellFromEvent(e, canvasRef.current)
    if (cell) placeStone(cell.r, cell.c)
  }, [canMove, placeStone])

  // Touch: two-tap confirm to avoid mis-taps on small cells
  const handleTouchEnd = useCallback((e) => {
    e.preventDefault()
    if (!canMove()) return
    const touch = e.changedTouches[0]
    if (!touch) return
    const cell = getCellFromEvent({ clientX: touch.clientX, clientY: touch.clientY }, canvasRef.current)
    if (!cell || board[cell.r][cell.c] !== 0) { setPendingCell(null); return }
    // Second tap on same pending cell → place
    if (pendingCell && pendingCell.r === cell.r && pendingCell.c === cell.c) {
      setPendingCell(null)
      placeStone(cell.r, cell.c)
    } else {
      setPendingCell(cell)
    }
  }, [canMove, board, pendingCell, placeStone])

  const confirmPending = useCallback(() => {
    if (!pendingCell) return
    placeStone(pendingCell.r, pendingCell.c)
    setPendingCell(null)
  }, [pendingCell, placeStone])

  const cancelPending = useCallback(() => setPendingCell(null), [])

  const hoverCoord = hoverCell
    ? COLS[hoverCell.c] + (BOARD_SIZE - hoverCell.r) + (board[hoverCell.r]?.[hoverCell.c] ? ' · 已落子' : ' · 空')
    : '悬停查看坐标'

  // showVictoryOverlay prop overrides gameOver when provided, for replay conflict avoidance
  const victoryVisible = showVictoryOverlay ?? gameOver

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative"
        style={
          theme === 'classic-wood'
            ? {
                boxShadow: `0 0 0 12px #b8864a, 0 0 0 14px #8b6330, 8px 16px 40px rgba(26,16,8,0.3), 4px 8px 20px rgba(26,16,8,0.2)`,
                borderRadius: '2px',
              }
            : theme === 'minimal-dark'
            ? {
                boxShadow: `0 0 0 1px #333333, 4px 8px 24px rgba(0,0,0,0.6)`,
                borderRadius: '2px',
              }
            : theme === 'neon-cyber'
            ? {
                boxShadow: `0 0 0 1px #3d0070, 0 0 12px rgba(255,0,255,0.25), 4px 8px 24px rgba(0,0,0,0.8)`,
                borderRadius: '2px',
              }
            : /* sci-fi */ {
                boxShadow: `0 0 0 1px #1a3a6b, 0 0 10px rgba(0,212,255,0.2), 4px 8px 24px rgba(0,0,0,0.8)`,
                borderRadius: '2px',
              }
        }
      >
        <canvas
          ref={canvasRef}
          style={{
            width: `min(calc(100vw - max(24px, env(safe-area-inset-left)) - max(24px, env(safe-area-inset-right))), ${CANVAS_PX}px)`,
            height: `min(calc(100vw - max(24px, env(safe-area-inset-left)) - max(24px, env(safe-area-inset-right))), ${CANVAS_PX}px)`,
            display: 'block',
            cursor: 'crosshair',
            borderRadius: '1px',
            touchAction: 'manipulation',
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onTouchEnd={handleTouchEnd}
        />
        <VictoryOverlay
          show={victoryVisible}
          winner={winner}
          isDraw={isDraw}
          lastHash={lastHash}
          onNewGame={newGame}
          onReplay={onReplay}
          onExport={onVictoryExport}
          moveCount={moveHistory.length}
        />
        <AIThinkingIndicator show={isThinking} />
      </div>

      <p className="font-mono text-[11px] text-ink-faint tracking-widest">{hoverCoord}</p>

      {/* Mobile touch confirmation bar */}
      {pendingCell && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--accent-primary)',
          borderRadius: 6,
          width: '100%',
          boxSizing: 'border-box',
          boxShadow: '0 0 12px color-mix(in srgb, var(--accent-primary) 25%, transparent)',
        }}>
          <span style={{ fontSize: 14 }}>{currentPlayer === 1 ? '⚫' : '⚪'}</span>
          <span style={{
            flex: 1,
            fontFamily: 'var(--font-primary)',
            fontSize: 12,
            letterSpacing: '0.12em',
            color: 'var(--text-secondary)',
          }}>
            {COLS[pendingCell.c]}{BOARD_SIZE - pendingCell.r} 落子确认
          </span>
          <button
            onTouchEnd={(e) => { e.stopPropagation(); confirmPending() }}
            onClick={confirmPending}
            style={{
              padding: '8px 18px',
              background: 'var(--accent-primary)',
              border: 'none',
              borderRadius: 4,
              color: '#000',
              fontFamily: 'var(--font-primary)',
              fontSize: 13,
              fontWeight: 'bold',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ✓ 落子
          </button>
          <button
            onTouchEnd={(e) => { e.stopPropagation(); cancelPending() }}
            onClick={cancelPending}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-primary)',
              fontSize: 13,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ✗
          </button>
        </div>
      )}
    </div>
  )
}
