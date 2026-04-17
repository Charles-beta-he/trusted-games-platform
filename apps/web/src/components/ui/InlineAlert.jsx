import { useState, useEffect } from 'react'

/**
 * InlineAlert — dismissible error/warning banner.
 * Replaces alert() with non-blocking inline feedback.
 *
 * Usage:
 *   const [error, setError] = useState('')
 *   <InlineAlert message={error} onDismiss={() => setError('')} />
 */
export default function InlineAlert({ message, onDismiss, autoHideMs = 5000 }) {
  if (!message) return null

  return (
    <div
      role="alert"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', margin: '8px 0',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        borderRadius: 6,
        color: '#fca5a5',
        fontSize: 12,
        fontFamily: 'var(--font-primary, monospace)',
      }}
    >
      <span style={{ flexShrink: 0 }}>⚠️</span>
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none', border: 'none', color: '#fca5a5',
            cursor: 'pointer', fontSize: 14, padding: '0 4px',
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
