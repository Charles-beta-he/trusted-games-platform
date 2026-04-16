import { describe, it, expect } from 'vitest'
import { parsePSQ, parseJSON } from './gameFormats.js'

describe('parsePSQ', () => {
  it('parses valid PSQ text', () => {
    const psq = `Title\nPlayer1,Player2\n8,8,100\n8,9,200\n9,8,300\n9,9,400\n10,8,500\n0,0,0`
    const result = parsePSQ(psq)
    expect(result.error).toBeNull()
    expect(result.games.length).toBe(1)
    expect(result.games[0].moves.length).toBe(5)
    // First move: col=8, row=8 → r=7, c=7
    expect(result.games[0].moves[0]).toEqual({ r: 7, c: 7 })
  })

  it('returns error for non-string input', () => {
    const result = parsePSQ(123)
    expect(result.error).toBeTruthy()
    expect(result.games).toEqual([])
  })

  it('skips games with fewer than 5 moves', () => {
    const psq = `Title\nP1,P2\n8,8,100\n9,9,200\n0,0,0`
    const result = parsePSQ(psq)
    expect(result.games.length).toBe(0)
  })

  it('handles CRLF line endings', () => {
    const psq = "Title\r\nP1,P2\r\n8,8,100\r\n8,9,200\r\n9,8,300\r\n9,9,400\r\n10,8,500\r\n0,0,0"
    const result = parsePSQ(psq)
    expect(result.games.length).toBe(1)
    expect(result.games[0].moves.length).toBe(5)
  })

  it('handles empty input', () => {
    const result = parsePSQ('')
    expect(result.games.length).toBe(0)
  })
})

describe('parseJSON', () => {
  it('parses valid JSON game array', () => {
    const data = JSON.stringify([
      { moves: [{ r: 7, c: 7 }, { r: 7, c: 8 }, { r: 8, c: 7 }, { r: 8, c: 8 }, { r: 9, c: 7 }] }
    ])
    const result = parseJSON(data)
    expect(result.error).toBeNull()
    expect(result.games.length).toBe(1)
    expect(result.games[0].moves.length).toBe(5)
  })

  it('returns error for invalid JSON', () => {
    const result = parseJSON('{broken')
    expect(result.error).toBeTruthy()
  })

  it('handles empty array', () => {
    const result = parseJSON('[]')
    expect(result.games.length).toBe(0)
  })
})
