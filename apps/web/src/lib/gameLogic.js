import { BOARD_SIZE, COLS } from '@tg/core/constants'

/**
 * Pure game logic helpers — extracted from useGameEngine for testability.
 */

const emptyBoard = () => Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0))

/**
 * Check if placing at (r,c) as `player` results in 5-in-a-row.
 * Returns [minR, minC, maxR, maxC] of the winning line, or null.
 */
function checkWin(board, r, c, player) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  for (const [dr, dc] of dirs) {
    let count = 1
    let minR = r, minC = c, maxR = r, maxC = c
    for (let d = 1; d < 5; d++) {
      const nr = r + dr * d, nc = c + dc * d
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === player) {
        count++; maxR = nr; maxC = nc
      } else break
    }
    for (let d = 1; d < 5; d++) {
      const nr = r - dr * d, nc = c - dc * d
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === player) {
        count++; minR = nr; minC = nc
      } else break
    }
    if (count >= 5) return [minR, minC, maxR, maxC]
  }
  return null
}

/** Check if the board is completely filled (draw). */
function checkDraw(board) {
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (board[r][c] === 0) return false
  return true
}

/** Compute trust level based on move count and network mode. */
function computeTrustLevel(moveCount, networkMode) {
  if (networkMode === 'online') return 'L1'
  if (networkMode === 'offline-p2p') return 'L3'
  if (moveCount >= 5) return 'L4'
  return 'L5'
}

/** Gomoku coord e.g. "H8" → { r, c } */
function coordToRc(coord) {
  if (!coord || typeof coord !== 'string') return null
  const s = coord.trim().toUpperCase()
  const col = s[0]
  const rowNum = parseInt(s.slice(1), 10)
  if (Number.isNaN(rowNum)) return null
  const c = COLS.indexOf(col)
  const r = BOARD_SIZE - rowNum
  if (c < 0 || r < 0 || r >= BOARD_SIZE || c >= BOARD_SIZE) return null
  return { r, c }
}

export { emptyBoard, checkWin, checkDraw, computeTrustLevel, coordToRc }
