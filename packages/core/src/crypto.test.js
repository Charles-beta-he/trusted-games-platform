import { describe, it, expect } from 'vitest'
import { generateGenesisHash, computeMoveHash } from './crypto.js'

describe('@tg/core crypto', () => {
  it('generateGenesisHash 对同一 gameId 稳定', async () => {
    const a = await generateGenesisHash('ROOM01')
    const b = await generateGenesisHash('ROOM01')
    expect(a).toBe(b)
    expect(a).toMatch(/^[a-f0-9]{64}$/)
  })

  it('computeMoveHash 链式依赖上一哈希', async () => {
    const gameId = 'G99'
    const genesis = await generateGenesisHash(gameId)
    const m1 = { num: 1, player: 1, r: 7, c: 7, coord: 'H8' }
    const h1 = await computeMoveHash(m1, genesis, gameId)
    const m2 = { num: 2, player: 2, r: 7, c: 8, coord: 'I8' }
    const h2 = await computeMoveHash(m2, h1, gameId)
    expect(h1).not.toBe(genesis)
    expect(h2).not.toBe(h1)
  })
})
