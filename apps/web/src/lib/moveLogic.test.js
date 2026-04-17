import { describe, it, expect } from 'vitest'

// Test the move validation logic used by game engines
function isValidMove(board, r, c, BOARD_SIZE = 15) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === 0
}

describe('move validation', () => {
  const board = Array.from({ length: 15 }, () => Array(15).fill(0))
  board[7][7] = 1

  it('accepts valid empty cell', () => {
    expect(isValidMove(board, 0, 0)).toBe(true)
    expect(isValidMove(board, 14, 14)).toBe(true)
  })

  it('rejects occupied cell', () => {
    expect(isValidMove(board, 7, 7)).toBe(false)
  })

  it('rejects out of bounds', () => {
    expect(isValidMove(board, -1, 0)).toBe(false)
    expect(isValidMove(board, 0, 15)).toBe(false)
    expect(isValidMove(board, 15, 0)).toBe(false)
  })
})

// Test line counting (used in win detection)
function countLine(board, r, c, dr, dc, player, BOARD_SIZE = 15) {
  let count = 0
  let nr = r + dr, nc = c + dc
  while (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === player) {
    count++
    nr += dr
    nc += dc
  }
  return count
}

describe('countLine', () => {
  it('counts horizontal line', () => {
    const board = Array.from({ length: 15 }, () => Array(15).fill(0))
    board[7][5] = 1; board[7][6] = 1; board[7][7] = 1
    expect(countLine(board, 7, 7, 0, 1, 1)).toBe(0)  // nothing right
    expect(countLine(board, 7, 7, 0, -1, 1)).toBe(2)  // 2 to the left
  })

  it('counts diagonal line', () => {
    const board = Array.from({ length: 15 }, () => Array(15).fill(0))
    board[5][5] = 2; board[6][6] = 2; board[7][7] = 2
    expect(countLine(board, 7, 7, 1, 1, 2)).toBe(0)
    expect(countLine(board, 7, 7, -1, -1, 2)).toBe(2)
  })

  it('stops at empty cell', () => {
    const board = Array.from({ length: 15 }, () => Array(15).fill(0))
    board[7][7] = 1
    expect(countLine(board, 7, 7, 0, 1, 1)).toBe(0)
  })

  it('stops at opponent stone', () => {
    const board = Array.from({ length: 15 }, () => Array(15).fill(0))
    board[7][5] = 1; board[7][6] = 2; board[7][7] = 1
    expect(countLine(board, 7, 7, 0, -1, 1)).toBe(0)  // blocked by 2
  })
})
