import { describe, it, expect } from 'vitest'
import { COPY_CONFIRM_MS } from './constants.js'

describe('constants', () => {
  it('COPY_CONFIRM_MS is 2000', () => {
    expect(COPY_CONFIRM_MS).toBe(2000)
  })
})
