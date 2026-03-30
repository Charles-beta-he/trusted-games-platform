import { describe, it, expect } from 'vitest'
import {
  validateRankedReport,
  witnessProcessRoomInit,
  witnessProcessMove,
  witnessProcessResign,
  witnessComputeMoveHash,
} from './witnessLogic.js'

async function submitMove(room, role, partial) {
  const w = room.witness
  const n = w.moveHist.length + 1
  const prev = w.chainHash
  const hash = await witnessComputeMoveHash(
    { num: n, player: partial.player, r: partial.r, c: partial.c, coord: partial.coord },
    prev,
    w.gameId,
  )
  return witnessProcessMove(room, role, {
    gameId: w.gameId,
    n,
    r: partial.r,
    c: partial.c,
    player: partial.player,
    coord: partial.coord,
    hash,
  })
}

describe('witnessLogic', () => {
  it('无见证时天梯校验失败', () => {
    const v = validateRankedReport(null, 'host', 'win', 'X', '00')
    expect(v.ok).toBe(false)
  })

  it('首步认输：见证终局且与上报一致', async () => {
    const room = {}
    const init = await witnessProcessRoomInit(room, 'host', { gameId: 'RZ01', hostIsBlack: true })
    expect(init.type).toBe('witness_ack')
    const rs = witnessProcessResign(room, 'host', { gameId: 'RZ01', resignedPlayer: 1 })
    expect(rs.type).toBe('witness_resign_ok')
    const tip = room.witness.chainHash
    expect(validateRankedReport(room.witness, 'host', 'lose', 'RZ01', tip).ok).toBe(true)
    expect(validateRankedReport(room.witness, 'guest', 'win', 'RZ01', tip).ok).toBe(true)
    expect(validateRankedReport(room.witness, 'host', 'win', 'RZ01', tip).ok).toBe(false)
  })

  it('未终局时即使链尖哈希正确也不通过天梯上报', async () => {
    const room = {}
    await witnessProcessRoomInit(room, 'host', { gameId: 'WZ02', hostIsBlack: true })
    const m = await submitMove(room, 'host', { player: 1, r: 7, c: 7, coord: 'H8' })
    expect(m.type).toBe('witness_move_ok')
    expect(room.witness.status).toBe('in_progress')
    const v = validateRankedReport(room.witness, 'host', 'win', 'WZ02', room.witness.chainHash)
    expect(v.ok).toBe(false)
    expect(v.message).toMatch(/未至终局/)
  })
})
