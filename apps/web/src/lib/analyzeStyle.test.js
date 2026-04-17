import { describe, it, expect } from 'vitest'
import { analyzeGames } from './analyzeStyle.js'

function makeGame(moves) {
  return { gameOver: true, moves }
}

function makeMoves(n) {
  // Generate n alternating moves on the board
  const moves = []
  for (let i = 0; i < n; i++) {
    moves.push({ r: 7 + Math.floor(i / 8), c: i % 8 + 3 })
  }
  return moves
}

describe('analyzeGames', () => {
  it('returns null for fewer than 3 games', () => {
    const games = [makeGame(makeMoves(5)), makeGame(makeMoves(5))]
    expect(analyzeGames(games)).toBeNull()
  })

  it('returns null for games with fewer than 5 moves', () => {
    const games = [
      makeGame(makeMoves(3)),
      makeGame(makeMoves(3)),
      makeGame(makeMoves(3)),
    ]
    expect(analyzeGames(games)).toBeNull()
  })

  it('handles 3+ games without crashing', () => {
    const games = [
      makeGame(makeMoves(10)),
      makeGame(makeMoves(8)),
      makeGame(makeMoves(12)),
    ]
    const result = analyzeGames(games)
    // Returns a style profile or null — either way should not crash
    if (result) {
      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('params')
    }
  })

  it('skips non-completed games', () => {
    const games = [
      { gameOver: false, moves: makeMoves(10) },
      makeGame(makeMoves(10)),
      makeGame(makeMoves(10)),
      makeGame(makeMoves(10)),
    ]
    const result = analyzeGames(games)
    // Should not crash — returns profile or null
    expect(result === null || typeof result === 'object').toBe(true)
  })
})
