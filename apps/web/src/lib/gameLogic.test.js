import { describe, it, expect } from 'vitest'
import { checkWin, checkDraw, computeTrustLevel, coordToRc } from './gameLogic.js'

const BOARD_SIZE = 15
const emptyBoard = () => Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0))

describe('checkWin', () => {
  it('detects horizontal 5-in-a-row', () => {
    const board = emptyBoard()
    for (let c = 3; c <= 7; c++) board[7][c] = 1
    // Place at (7,7) extends to win
    const result = checkWin(board, 7, 7, 1)
    expect(result).toEqual([7, 3, 7, 7])
  })

  it('detects vertical 5-in-a-row', () => {
    const board = emptyBoard()
    for (let r = 3; r <= 7; r++) board[r][7] = 2
    const result = checkWin(board, 7, 7, 2)
    expect(result).toEqual([3, 7, 7, 7])
  })

  it('detects diagonal 5-in-a-row', () => {
    const board = emptyBoard()
    for (let i = 0; i < 5; i++) board[3 + i][3 + i] = 1
    const result = checkWin(board, 5, 5, 1)
    expect(result).toEqual([3, 3, 7, 7])
  })

  it('detects anti-diagonal 5-in-a-row', () => {
    const board = emptyBoard()
    for (let i = 0; i < 5; i++) board[3 + i][11 - i] = 1
    const result = checkWin(board, 5, 9, 1)
    expect(result).toEqual([3, 11, 7, 7])
  })

  it('returns null for 4-in-a-row', () => {
    const board = emptyBoard()
    for (let c = 3; c <= 6; c++) board[7][c] = 1
    expect(checkWin(board, 7, 6, 1)).toBeNull()
  })

  it('returns null for empty board', () => {
    expect(checkWin(emptyBoard(), 7, 7, 1)).toBeNull()
  })

  it('does not count opponent stones', () => {
    const board = emptyBoard()
    board[7][3] = 1; board[7][4] = 2; board[7][5] = 1; board[7][6] = 1; board[7][7] = 1
    expect(checkWin(board, 7, 7, 1)).toBeNull()
  })
})

describe('checkDraw', () => {
  it('returns false for empty board', () => {
    expect(checkDraw(emptyBoard())).toBe(false)
  })

  it('returns false for partially filled board', () => {
    const board = emptyBoard()
    board[0][0] = 1
    expect(checkDraw(board)).toBe(false)
  })

  it('returns true for completely filled board', () => {
    const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(1))
    expect(checkDraw(board)).toBe(true)
  })
})

describe('computeTrustLevel', () => {
  it('returns L1 for online', () => {
    expect(computeTrustLevel(0, 'online')).toBe('L1')
  })

  it('returns L3 for offline-p2p', () => {
    expect(computeTrustLevel(0, 'offline-p2p')).toBe('L3')
  })

  it('returns L4 for 5+ moves in solo', () => {
    expect(computeTrustLevel(5, 'offline-solo')).toBe('L4')
  })

  it('returns L5 for <5 moves in solo', () => {
    expect(computeTrustLevel(3, 'offline-solo')).toBe('L5')
  })
})

describe('coordToRc', () => {
  it('converts H8 to center {r:7, c:7}', () => {
    expect(coordToRc('H8')).toEqual({ r: 7, c: 7 })
  })

  it('converts A1 to {r:14, c:0}', () => {
    expect(coordToRc('A1')).toEqual({ r: 14, c: 0 })
  })

  it('converts P15 to {r:0, c:14}', () => {
    expect(coordToRc('P15')).toEqual({ r: 0, c: 14 })
  })

  it('handles lowercase', () => {
    expect(coordToRc('h8')).toEqual({ r: 7, c: 7 })
  })

  it('returns null for invalid input', () => {
    expect(coordToRc(null)).toBeNull()
    expect(coordToRc('')).toBeNull()
    expect(coordToRc('Z99')).toBeNull()
    expect(coordToRc('X1')).toBeNull()
  })
})
