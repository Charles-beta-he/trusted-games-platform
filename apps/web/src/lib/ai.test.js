import { describe, it, expect } from 'vitest'
import {
  getCandidates,
  checkWinBoard,
  boardScore,
  getBestMove,
  computeHash,
  updateHash,
} from './ai.js'

const BOARD_SIZE = 15

function emptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0))
}

describe('getCandidates', () => {
  it('returns center for empty board (default opening)', () => {
    const board = emptyBoard()
    const cands = getCandidates(board)
    // On empty board, returns center as opening candidate
    expect(cands.length).toBe(1)
    expect(cands[0]).toEqual({ r: 7, c: 7 })
  })

  it('returns neighbors of placed stones', () => {
    const board = emptyBoard()
    board[7][7] = 1
    const cands = getCandidates(board)
    expect(cands.length).toBeGreaterThan(0)
    // Should include cells adjacent to (7,7)
    const hasNeighbor = cands.some(({ r, c }) =>
      Math.abs(r - 7) <= 2 && Math.abs(c - 7) <= 2 && !(r === 7 && c === 7)
    )
    expect(hasNeighbor).toBe(true)
  })

  it('respects limit parameter', () => {
    const board = emptyBoard()
    board[7][7] = 1
    board[7][8] = 2
    board[8][7] = 1
    const all = getCandidates(board)
    const limited = getCandidates(board, 5)
    expect(limited.length).toBeLessThanOrEqual(5)
    expect(limited.length).toBeLessThanOrEqual(all.length)
  })

  it('never includes occupied cells', () => {
    const board = emptyBoard()
    board[7][7] = 1
    board[7][8] = 2
    const cands = getCandidates(board)
    for (const { r, c } of cands) {
      expect(board[r][c]).toBe(0)
    }
  })
})

describe('checkWinBoard', () => {
  it('detects horizontal five', () => {
    const board = emptyBoard()
    for (let c = 3; c <= 7; c++) board[7][c] = 1
    expect(checkWinBoard(board, 7, 7, 1)).toBe(true)
  })

  it('detects vertical five', () => {
    const board = emptyBoard()
    for (let r = 3; r <= 7; r++) board[r][7] = 2
    expect(checkWinBoard(board, 7, 7, 2)).toBe(true)
  })

  it('detects diagonal five', () => {
    const board = emptyBoard()
    for (let i = 0; i < 5; i++) board[3 + i][3 + i] = 1
    expect(checkWinBoard(board, 7, 7, 1)).toBe(true)
  })

  it('does not false-positive on four', () => {
    const board = emptyBoard()
    for (let c = 3; c <= 6; c++) board[7][c] = 1
    expect(checkWinBoard(board, 7, 6, 1)).toBe(false)
  })

  it('returns false for empty board', () => {
    const board = emptyBoard()
    expect(checkWinBoard(board, 7, 7, 1)).toBe(false)
  })
})

describe('boardScore', () => {
  it('returns 0 for empty board', () => {
    const board = emptyBoard()
    expect(boardScore(board, 2, 1)).toBe(0)
  })

  it('scores positive for AI advantage', () => {
    const board = emptyBoard()
    board[7][7] = 2  // AI stone
    const score = boardScore(board, 2, 1)
    expect(score).toBeGreaterThan(0)
  })
})

describe('getBestMove', () => {
  it('returns a valid move on empty board', () => {
    const board = emptyBoard()
    const move = getBestMove(board, 'easy')
    expect(move).toBeTruthy()
    expect(move.r).toBeGreaterThanOrEqual(0)
    expect(move.c).toBeGreaterThanOrEqual(0)
    expect(move.r).toBeLessThan(BOARD_SIZE)
    expect(move.c).toBeLessThan(BOARD_SIZE)
  })

  it('takes winning move when available', () => {
    const board = emptyBoard()
    // AI (2) has 4 in a row, need 5th
    board[7][3] = 2; board[7][4] = 2; board[7][5] = 2; board[7][6] = 2
    const move = getBestMove(board, 'easy')
    // Should place at (7,2) or (7,7) to complete five
    expect(move.r).toBe(7)
    expect([2, 7]).toContain(move.c)
  })

  it('blocks opponent win', () => {
    const board = emptyBoard()
    // Human (1) has 4 in a row
    board[7][3] = 1; board[7][4] = 1; board[7][5] = 1; board[7][6] = 1
    const move = getBestMove(board, 'easy')
    expect(move.r).toBe(7)
    expect([2, 7]).toContain(move.c)
  })

  it('respects time limit', () => {
    const board = emptyBoard()
    board[7][7] = 1; board[7][8] = 2; board[8][7] = 1
    const start = Date.now()
    const move = getBestMove(board, 'expert', 'balanced', { timeLimitMs: 500 })
    const elapsed = Date.now() - start
    expect(move).toBeTruthy()
    expect(elapsed).toBeLessThan(2000) // generous bound
  })
})

describe('Zobrist hashing', () => {
  it('empty board hash is zero', () => {
    const board = emptyBoard()
    const hash = computeHash(board)
    expect(hash[0]).toBe(0)
    expect(hash[1]).toBe(0)
  })

  it('updateHash is reversible', () => {
    const hash = [12345, 67890]
    const updated = updateHash(hash, 7, 7, 1)
    const reverted = updateHash(updated, 7, 7, 1)
    expect(reverted[0]).toBe(hash[0])
    expect(reverted[1]).toBe(hash[1])
  })

  it('different positions produce different hashes', () => {
    const h1 = updateHash([0, 0], 0, 0, 1)
    const h2 = updateHash([0, 0], 0, 1, 1)
    expect(h1[0] !== h2[0] || h1[1] !== h2[1]).toBe(true)
  })
})
