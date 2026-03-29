import { useRef, useEffect, useCallback, useState } from 'react'
import { drawBoard, getCellFromEvent } from '../../lib/drawing.js'
import { CANVAS_PX, COLS, BOARD_SIZE } from '@tg/core/constants'
import { useTheme } from '../../contexts/ThemeContext.jsx'
import VictoryOverlay from './VictoryOverlay.jsx'
import AIThinkingIndicator from './AIThinkingIndicator.jsx'

export default function BoardCanvas({
  board, currentPlayer, moveHistory, gameOver, winningLine,
  lastMove, hoverCell, setHoverCell, isThinking,
  isDraw, resignedPlayer, placeStone, newGame, aiMode, localPlayer,
  showVictoryOverlay, onReplay,
}) {
  const canvasRef = useRef(null)
  const dprRef = useRef(window.devicePixelRatio || 1)
  const { theme } = useTheme()
  const [pendingCell, setPendingCell] = useState(null)

  // Determine winner
  let winner = null
  if (gameOver && !isDraw) {
    if (resignedPlayer) winner = resignedPlayer === 1 ? 2 : 1
    else winner = currentPlayer === 1 ? 1 : 2
    // If game over by win, winner is currentPlayer when win was detected
    // Actually: after placeStone sets gameOver, currentPlayer is still the one who won
    if (winningLine) winner = currentPlayer
  }

  const lastHash = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].hash : ''

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = dprRef.current
    canvas.width = CANVAS_PX * dpr
    canvas.height = CANVAS_PX * dpr
    const ctx = canvas.getContext('2d')
    drawBoard(ctx, dpr, { board, hoverCell, pendingCell, lastMove, winningLine, currentPlayer, gameOver, aiThinking: isThinking })
  }, [board, hoverCell, pendingCell, lastMove, winningLine, currentPlayer, gameOver, isThinking, theme])

  const handleMouseMove = useCallback((e) => {
    const cell = getCellFromEvent(e, canvasRef.current)
    setHoverCell(cell)
  }, [setHoverCell])

  const handleMouseLeave = useCallback(() => {
    setHoverCell(null)
  }, [setHoverCell])

  const canMove = useCallback(() => {
    if (gameOver || isThinking) return false
    if (aiMode && currentPlayer === 2) return false
    if (localPlayer != null && currentPlayer !== localPlayer) return false
    return true
  }, [gameOver, isThinking, aiMode, currentPlayer, localPlayer])

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
