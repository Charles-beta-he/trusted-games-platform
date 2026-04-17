import { describe, it, expect } from 'vitest'
import { createBoard, applyMove, getGroup, countLiberties, estimateScore } from './index.js'
import { getBestMove } from './mcts.js'

describe('Go rules', () => {
  it('creates empty 19x19 board', () => {
    const board = createBoard()
    expect(board.length).toBe(19)
    expect(board[0].length).toBe(19)
    expect(board[0][0]).toBe(0)
  })

  it('applies a move', () => {
    const board = createBoard()
    const result = applyMove(board, 9, 9, 1)
    expect(result).toBeTruthy()
    expect(result.board[9][9]).toBe(1)
  })

  it('rejects move on occupied cell', () => {
    const board = createBoard()
    board[9][9] = 1
    expect(applyMove(board, 9, 9, 2)).toBeNull()
  })

  it('detects capture', () => {
    const board = createBoard()
    // White at (1,0) — neighbors: (0,0), (2,0), (1,1)
    board[1][0] = 2
    board[0][0] = 1  // block top
    // Play at (1,1) as black — now white at (1,0) has only (2,0) liberty
    board[2][0] = 1  // block bottom — now white has 0 liberties? No, (1,1) is still empty
    // Better: surround with 3 stones, play the 4th
    board[0][1] = 1  // top-right neighbor of (1,0)? No...
    // Simplest: 2-stone group capture
    board[5][5] = 2; board[5][6] = 2  // white pair horizontal
    board[4][5] = 1; board[4][6] = 1  // block top
    board[6][5] = 1; board[6][6] = 1  // block bottom
    board[5][4] = 1  // block left
    const result = applyMove(board, 5, 7, 1)  // block right — captures both
    expect(result).toBeTruthy()
    expect(result.captured).toBeGreaterThan(0)
  })

  it('prevents suicide', () => {
    const board = createBoard()
    // Surround a point with opponent stones
    board[0][1] = 1; board[1][0] = 1
    // Try to play at (0,0) as white — would be suicide
    expect(applyMove(board, 0, 0, 2)).toBeNull()
  })

  it('counts liberties correctly', () => {
    const board = createBoard()
    board[9][9] = 1
    const group = getGroup(board, 9, 9)
    expect(countLiberties(board, group)).toBe(4)
  })

  it('estimates score', () => {
    const board = createBoard()
    board[0][0] = 1; board[0][1] = 1
    board[18][18] = 2
    const score = estimateScore(board)
    expect(score.black).toBe(2)
    expect(score.white).toBe(1 + 6.5)
  })
})

describe('Go MCTS AI', () => {
  it('returns a valid move on empty board (easy)', { timeout: 30000 }, () => {
    const board = createBoard()
    const move = getBestMove(board, 1, 'easy')
    expect(move).toBeTruthy()
    expect(move.r).toBeGreaterThanOrEqual(0)
    expect(move.r).toBeLessThan(19)
    expect(move.c).toBeGreaterThanOrEqual(0)
    expect(move.c).toBeLessThan(19)
  })

  it('returns a move near existing stones (easy)', { timeout: 30000 }, () => {
    const board = createBoard()
    board[9][9] = 1
    const move = getBestMove(board, 2, 'easy')
    expect(move).toBeTruthy()
    expect(Math.abs(move.r - 9) + Math.abs(move.c - 9)).toBeLessThanOrEqual(5)
  })
})
