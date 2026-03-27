import { useRef, useEffect, useCallback } from 'react'
import { drawBoard, getCellFromEvent } from '../../lib/drawing.js'
import { CANVAS_PX } from '../../lib/constants.js'
import { COLS, BOARD_SIZE } from '../../lib/constants.js'
import VictoryOverlay from './VictoryOverlay.jsx'
import AIThinkingIndicator from './AIThinkingIndicator.jsx'

export default function BoardCanvas({
  board, currentPlayer, moveHistory, gameOver, winningLine,
  lastMove, hoverCell, setHoverCell, isThinking,
  isDraw, resignedPlayer, placeStone, newGame, aiMode, localPlayer,
}) {
  const canvasRef = useRef(null)
  const dprRef = useRef(window.devicePixelRatio || 1)

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
    drawBoard(ctx, dpr, { board, hoverCell, lastMove, winningLine, currentPlayer, gameOver, aiThinking: isThinking })
  }, [board, hoverCell, lastMove, winningLine, currentPlayer, gameOver, isThinking])

  const handleMouseMove = useCallback((e) => {
    const cell = getCellFromEvent(e, canvasRef.current)
    setHoverCell(cell)
  }, [setHoverCell])

  const handleMouseLeave = useCallback(() => {
    setHoverCell(null)
  }, [setHoverCell])

  const handleClick = useCallback((e) => {
    if (gameOver || isThinking) return
    if (aiMode && currentPlayer === 2) return
    // P2P: only allow clicks on local player's turn
    if (localPlayer != null && currentPlayer !== localPlayer) return
    const cell = getCellFromEvent(e, canvasRef.current)
    if (cell) placeStone(cell.r, cell.c)
  }, [gameOver, isThinking, aiMode, currentPlayer, localPlayer, placeStone])

  const hoverCoord = hoverCell
    ? COLS[hoverCell.c] + (BOARD_SIZE - hoverCell.r) + (board[hoverCell.r]?.[hoverCell.c] ? ' · 已落子' : ' · 空')
    : '悬停查看坐标'

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative"
        style={{
          boxShadow: `0 0 0 12px #b8864a, 0 0 0 14px #8b6330, 8px 16px 40px rgba(26,16,8,0.3), 4px 8px 20px rgba(26,16,8,0.2)`,
          borderRadius: '2px',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: CANVAS_PX + 'px', height: CANVAS_PX + 'px', display: 'block', cursor: 'crosshair', borderRadius: '1px' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        />
        <VictoryOverlay
          show={gameOver}
          winner={winner}
          isDraw={isDraw}
          lastHash={lastHash}
          onNewGame={newGame}
        />
        <AIThinkingIndicator show={isThinking} />
      </div>

      <p className="font-mono text-[11px] text-ink-faint tracking-widest">{hoverCoord}</p>
    </div>
  )
}
