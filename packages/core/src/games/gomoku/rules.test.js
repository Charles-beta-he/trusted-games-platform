import { describe, it, expect } from 'vitest'
import { validateMove } from './rules.js'

const empty = () => Array.from({ length: 15 }, () => new Array(15).fill(0))

describe('gomoku rules', () => {
  it('standard 允许占子', () => {
    const b = empty()
    expect(validateMove(b, 7, 7, 1, 'standard').valid).toBe(true)
  })

  it('renju 黑方长连禁手', () => {
    const b = empty()
    const r = 7
    const c = 7
    for (let i = 0; i < 5; i++) b[r][c - 2 + i] = 1
    const vm = validateMove(b, r, c + 3, 1, 'renju')
    expect(vm.valid).toBe(false)
    expect(vm.reason).toBe('renju_overline')
  })

  it('白方不受黑长连限制', () => {
    const b = empty()
    const r = 7
    for (let i = 0; i < 5; i++) b[r][i] = 2
    const vm = validateMove(b, r, 5, 2, 'renju')
    expect(vm.valid).toBe(true)
  })
})
