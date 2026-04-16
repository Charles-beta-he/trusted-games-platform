/** Shared inline style factories for consistent UI across components. */

export const btn = (extra = {}) => ({
  fontFamily: 'var(--font-primary)',
  fontSize: 11,
  letterSpacing: '0.12em',
  cursor: 'pointer',
  border: '1px solid var(--border-color)',
  borderRadius: 4,
  padding: '7px 16px',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  transition: 'all 0.15s',
  ...extra,
})

export const btnPrimary = (extra = {}) => btn({
  background: 'var(--accent-primary)',
  borderColor: 'var(--accent-primary)',
  color: '#000',
  fontWeight: 'bold',
  ...extra,
})

export const card = (extra = {}) => ({
  border: '1px solid var(--border-color)',
  borderRadius: 8,
  background: 'var(--bg-surface)',
  ...extra,
})
