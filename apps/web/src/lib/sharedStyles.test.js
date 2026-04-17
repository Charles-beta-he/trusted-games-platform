import { describe, it, expect } from 'vitest'
import { btn, btnPrimary, card } from './sharedStyles.js'

describe('btn', () => {
  it('returns base button styles', () => {
    const styles = btn()
    expect(styles.fontFamily).toBeTruthy()
    expect(styles.cursor).toBe('pointer')
    expect(styles.borderRadius).toBe(4)
  })

  it('merges extra styles', () => {
    const styles = btn({ background: 'red', fontSize: 16 })
    expect(styles.background).toBe('red')
    expect(styles.fontSize).toBe(16)
  })

  it('does not mutate base', () => {
    const s1 = btn()
    const s2 = btn({ padding: '10px' })
    expect(s1.padding).toBe('7px 16px')
    expect(s2.padding).toBe('10px')
  })
})

describe('btnPrimary', () => {
  it('overrides background to accent color', () => {
    const styles = btnPrimary()
    expect(styles.background).toBe('var(--accent-primary)')
    expect(styles.fontWeight).toBe('bold')
  })

  it('merges extra styles', () => {
    const styles = btnPrimary({ fontSize: 14 })
    expect(styles.fontSize).toBe(14)
  })
})

describe('card', () => {
  it('returns base card styles', () => {
    const styles = card()
    expect(styles.borderRadius).toBe(8)
    expect(styles.background).toBe('var(--bg-surface)')
  })

  it('merges extra styles', () => {
    const styles = card({ padding: '20px' })
    expect(styles.padding).toBe('20px')
  })
})
