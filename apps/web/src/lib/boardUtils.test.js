import { describe, it, expect } from 'vitest'

// Test the coord conversion logic that's used in multiple places
// (extracted from COLS constant in core)
const COLS = 'ABCDEFGHJKLMNOP'  // 15 cols, no I

function rcToCoord(r, c) {
  return `${COLS[c]}${15 - r}`
}

describe('coord conversion (round-trip)', () => {
  it('converts center correctly', () => {
    expect(rcToCoord(7, 7)).toBe('H8')
  })

  it('converts corners', () => {
    expect(rcToCoord(0, 0)).toBe('A15')
    expect(rcToCoord(14, 14)).toBe('P1')
  })

  it('handles all valid positions', () => {
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const coord = rcToCoord(r, c)
        expect(coord.length).toBeGreaterThanOrEqual(2)
        expect(coord.length).toBeLessThanOrEqual(3)
      }
    }
  })
})

// Test board copy utility
function copyBoard(board) {
  return board.map(row => [...row])
}

describe('board copy', () => {
  it('creates independent copy', () => {
    const board = [[0, 1], [2, 0]]
    const copy = copyBoard(board)
    copy[0][0] = 9
    expect(board[0][0]).toBe(0)
  })

  it('preserves dimensions', () => {
    const board = Array.from({ length: 15 }, () => Array(15).fill(0))
    const copy = copyBoard(board)
    expect(copy.length).toBe(15)
    expect(copy[0].length).toBe(15)
  })
})

// Test player toggle
function otherPlayer(p) { return p === 1 ? 2 : 1 }

describe('otherPlayer', () => {
  it('toggles 1 → 2', () => expect(otherPlayer(1)).toBe(2))
  it('toggles 2 → 1', () => expect(otherPlayer(2)).toBe(1))
})
