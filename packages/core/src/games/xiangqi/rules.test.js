import { describe, it, expect } from 'vitest'
import {
  createInitialBoard,
  getValidMoves,
  getBestMove,
  isInCheck,
  applyMove,
  COLS,
  P,
  ROWS,
} from './rules.js'

describe('xiangqi rules', () => {
  it('初始棋盘将、马有合法着法', () => {
    const b = createInitialBoard()
    expect(b[9][4]).toBe(P.GENERAL)
    const gMoves = getValidMoves(b, 9, 4)
    expect(gMoves.length).toBeGreaterThan(0)
    expect(getValidMoves(b, 9, 1).length).toBeGreaterThan(0)
  })

  it('马蹩腿时不可跳', () => {
    const b = createInitialBoard()
    /** (9,1) 马欲至 (7,0) 时蹩马腿格为 (8,1) */
    b[8][1] = P.SOLDIER
    const nm = getValidMoves(b, 9, 1).filter(([tr, tc]) => tr === 7 && tc === 0)
    expect(nm.length).toBe(0)
  })

  it('将帅照面着法被过滤', () => {
    const b = Array.from({ length: ROWS }, () => new Array(COLS).fill(0))
    b[2][4] = -P.GENERAL
    b[9][4] = P.GENERAL
    b[5][4] = 0
    const moves = getValidMoves(b, 2, 4)
    const bad = moves.some(([tr]) => tr > 2)
    expect(bad).toBe(false)
  })

  it('车隔一路直线形成将军', () => {
    const b = Array.from({ length: ROWS }, () => new Array(COLS).fill(0))
    b[0][4] = -P.GENERAL
    b[9][4] = P.GENERAL
    b[4][4] = P.CHARIOT
    expect(isInCheck(b, -1)).toBe(true)
  })

  it('getBestMove 返回合法着法', () => {
    const b = createInitialBoard()
    const m = getBestMove(b, 1, 'easy')
    expect(m).not.toBeNull()
    const ok = getValidMoves(b, m.fr, m.fc).some(([tr, tc]) => tr === m.tr && tc === m.tc)
    expect(ok).toBe(true)
  })

  it('applyMove 更新落点与源格', () => {
    const b = Array.from({ length: ROWS }, () => new Array(COLS).fill(0))
    b[5][4] = P.GENERAL
    const nb = applyMove(b, 5, 4, 5, 5)
    expect(nb[5][4]).toBe(0)
    expect(nb[5][5]).toBe(P.GENERAL)
  })
})
