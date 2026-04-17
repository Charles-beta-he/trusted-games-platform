import { describe, it, expect } from 'vitest'

// Test timer formatting logic (extracted from useTimer patterns)
function formatTime(seconds) {
  if (seconds < 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

describe('formatTime', () => {
  it('formats zero', () => expect(formatTime(0)).toBe('00:00'))
  it('formats seconds only', () => expect(formatTime(45)).toBe('00:45'))
  it('formats minutes', () => expect(formatTime(90)).toBe('01:30'))
  it('formats large values', () => expect(formatTime(3600)).toBe('60:00'))
  it('handles negative', () => expect(formatTime(-1)).toBe('00:00'))
})

// Test move numbering (used in game history)
function getMoveNumber(history) {
  return history.length
}

function getPlayerForMove(moveIndex) {
  return moveIndex % 2 === 0 ? 1 : 2  // black first
}

describe('move numbering', () => {
  it('starts at 0', () => expect(getMoveNumber([])).toBe(0))
  it('increments with moves', () => expect(getMoveNumber([{}, {}])).toBe(2))
  it('odd moves are white', () => expect(getPlayerForMove(1)).toBe(2))
  it('even moves are black', () => expect(getPlayerForMove(0)).toBe(1))
  it('alternates correctly', () => {
    expect(getPlayerForMove(0)).toBe(1)
    expect(getPlayerForMove(1)).toBe(2)
    expect(getPlayerForMove(2)).toBe(1)
    expect(getPlayerForMove(3)).toBe(2)
  })
})

// Test hash chain (move verification)
function computeMoveHashSimple(move, prevHash) {
  return `${prevHash}-${move.r},${move.c},${move.player}`
}

describe('hash chain', () => {
  it('produces deterministic output', () => {
    const h1 = computeMoveHashSimple({ r: 7, c: 7, player: 1 }, 'genesis')
    const h2 = computeMoveHashSimple({ r: 7, c: 7, player: 1 }, 'genesis')
    expect(h1).toBe(h2)
  })

  it('differs for different moves', () => {
    const h1 = computeMoveHashSimple({ r: 7, c: 7, player: 1 }, 'genesis')
    const h2 = computeMoveHashSimple({ r: 7, c: 8, player: 1 }, 'genesis')
    expect(h1).not.toBe(h2)
  })

  it('differs for different prevHash', () => {
    const h1 = computeMoveHashSimple({ r: 7, c: 7, player: 1 }, 'hash1')
    const h2 = computeMoveHashSimple({ r: 7, c: 7, player: 1 }, 'hash2')
    expect(h1).not.toBe(h2)
  })
})
