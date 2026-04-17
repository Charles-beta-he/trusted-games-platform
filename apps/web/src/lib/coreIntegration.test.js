import { describe, it, expect } from 'vitest'
import { BOARD_SIZE, SCORE, DIFFICULTY_CONFIG } from '@tg/core/constants'

describe('@tg/core constants', () => {
  it('BOARD_SIZE is 15', () => {
    expect(BOARD_SIZE).toBe(15)
  })

  it('SCORE has all required levels', () => {
    expect(SCORE.FIVE).toBeGreaterThan(SCORE.OPEN_FOUR)
    expect(SCORE.OPEN_FOUR).toBeGreaterThan(SCORE.HALF_FOUR)
    expect(SCORE.HALF_FOUR).toBeGreaterThan(SCORE.OPEN_THREE)
    expect(SCORE.OPEN_THREE).toBeGreaterThan(SCORE.HALF_THREE)
  })

  it('DIFFICULTY_CONFIG has 4 levels', () => {
    const levels = Object.keys(DIFFICULTY_CONFIG)
    expect(levels).toContain('easy')
    expect(levels).toContain('medium')
    expect(levels).toContain('hard')
    expect(levels).toContain('expert')
  })

  it('difficulty depths are increasing', () => {
    expect(DIFFICULTY_CONFIG.easy.depth).toBeLessThan(DIFFICULTY_CONFIG.medium.depth)
    expect(DIFFICULTY_CONFIG.medium.depth).toBeLessThan(DIFFICULTY_CONFIG.hard.depth)
    expect(DIFFICULTY_CONFIG.hard.depth).toBeLessThan(DIFFICULTY_CONFIG.expert.depth)
  })
})

describe('edge case: empty board AI', () => {
  it('AI returns valid move on empty board (easy)', async () => {
    const { getBestMove } = await import('../lib/ai.js')
    const board = Array.from({ length: 15 }, () => Array(15).fill(0))
    const move = getBestMove(board, 'easy')
    expect(move).toBeTruthy()
    expect(move.r).toBeGreaterThanOrEqual(0)
    expect(move.c).toBeGreaterThanOrEqual(0)
  })

  it('AI blocks opponent 4-in-a-row', async () => {
    const { getBestMove } = await import('../lib/ai.js')
    const board = Array.from({ length: 15 }, () => Array(15).fill(0))
    // Human (1) has 4 in a row
    board[7][3] = 1; board[7][4] = 1; board[7][5] = 1; board[7][6] = 1
    const move = getBestMove(board, 'easy')
    expect(move.r).toBe(7)
    expect([2, 7]).toContain(move.c)
  })
})
