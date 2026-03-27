import { useState } from 'react'

export default function Collapsible({ title, icon = '⚙', children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none',
          borderTop: '1px solid var(--border-color)',
          padding: '8px 0',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-primary)',
          fontSize: 11, letterSpacing: 1,
        }}
      >
        <span>{icon} {title}</span>
        <span style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>
          ▾
        </span>
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          {children}
        </div>
      )}
    </div>
  )
}
