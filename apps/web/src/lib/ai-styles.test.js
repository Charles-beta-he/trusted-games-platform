import { describe, it, expect } from 'vitest'
import { STYLE_PRESETS, STYLE_PRESET_LIST, resolveStyle } from './ai-styles.js'

describe('STYLE_PRESETS', () => {
  it('has 4 presets', () => {
    expect(Object.keys(STYLE_PRESETS)).toHaveLength(4)
  })

  it('each preset has required fields', () => {
    for (const [id, preset] of Object.entries(STYLE_PRESETS)) {
      expect(preset.id).toBe(id)
      expect(preset.name).toBeTruthy()
      expect(preset.params).toHaveProperty('attack')
      expect(preset.params).toHaveProperty('defense')
      expect(preset.params).toHaveProperty('center')
      expect(preset.params).toHaveProperty('noise')
    }
  })

  it('STYLE_PRESET_LIST has 4 entries', () => {
    expect(STYLE_PRESET_LIST).toHaveLength(4)
  })
})

describe('resolveStyle', () => {
  it('returns balanced params for unknown style', () => {
    expect(resolveStyle('nonexistent')).toEqual(STYLE_PRESETS.balanced.params)
  })

  it('returns aggressive params', () => {
    const params = resolveStyle('aggressive')
    expect(params.attack).toBe(1.6)
    expect(params.defense).toBe(0.7)
  })

  it('returns defensive params', () => {
    const params = resolveStyle('defensive')
    expect(params.attack).toBe(0.7)
    expect(params.defense).toBe(1.6)
  })

  it('returns chaotic params with noise', () => {
    const params = resolveStyle('chaotic')
    expect(params.noise).toBe(0.35)
  })

  it('falls back to balanced for personal without saved data', () => {
    const params = resolveStyle('personal')
    expect(params).toEqual(STYLE_PRESETS.balanced.params)
  })
})
