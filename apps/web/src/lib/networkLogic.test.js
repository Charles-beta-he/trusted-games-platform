import { describe, it, expect } from 'vitest'

// Test trust level display logic
const TRUST_DISPLAY = {
  L1: { bars: 5, label: '完全可信' },
  L2: { bars: 4, label: '缓存可信' },
  L3: { bars: 3, label: '共识可信' },
  L4: { bars: 2, label: '可追溯' },
  L5: { bars: 1, label: '娱乐模式' },
}

describe('trust level display', () => {
  it('has 5 levels', () => {
    expect(Object.keys(TRUST_DISPLAY)).toHaveLength(5)
  })

  it('bars decrease from L1 to L5', () => {
    expect(TRUST_DISPLAY.L1.bars).toBe(5)
    expect(TRUST_DISPLAY.L5.bars).toBe(1)
  })

  it('each level has label', () => {
    for (const [, info] of Object.entries(TRUST_DISPLAY)) {
      expect(info.label).toBeTruthy()
    }
  })
})

// Test network mode logic
function canPlayOnline(networkMode, isServerAvailable) {
  if (!isServerAvailable) return false
  return networkMode === 'online' || networkMode === 'offline-p2p'
}

describe('network mode', () => {
  it('allows online when server available', () => {
    expect(canPlayOnline('online', true)).toBe(true)
  })

  it('blocks online when server unavailable', () => {
    expect(canPlayOnline('online', false)).toBe(false)
  })

  it('allows p2p when server available', () => {
    expect(canPlayOnline('offline-p2p', true)).toBe(true)
  })

  it('blocks solo check (solo does not need server)', () => {
    expect(canPlayOnline('offline-solo', true)).toBe(false)
  })
})

// Test room code validation
function isValidRoomCode(code) {
  return /^[A-HJ-NP-Z2-9]{6}$/i.test(code)
}

describe('room code validation', () => {
  it('accepts valid 6-char code', () => {
    expect(isValidRoomCode('ABCD23')).toBe(true)
  })

  it('rejects too short', () => {
    expect(isValidRoomCode('ABC')).toBe(false)
  })

  it('rejects with I or O', () => {
    expect(isValidRoomCode('ABCDEF')).toBe(true)
    expect(isValidRoomCode('ABCIEF')).toBe(false)
    expect(isValidRoomCode('ABCOEF')).toBe(false)
  })

  it('rejects with 0 or 1', () => {
    expect(isValidRoomCode('ABC023')).toBe(false)
    expect(isValidRoomCode('ABC123')).toBe(false)
  })

  it('case insensitive', () => {
    expect(isValidRoomCode('abcd23')).toBe(true)
  })
})
