import { useState } from 'react'
import { COPY_CONFIRM_MS } from '../../lib/constants.js'

/**
 * Shared CopyButton — copies `text` to clipboard with a brief confirmation.
 * Accepts optional `className` for Tailwind consumers and falls back to inline styles.
 */
export default function CopyButton({ text, label, className }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), COPY_CONFIRM_MS)
  }

  if (className) {
    return (
      <button
        onClick={copy}
        className={className}
        style={{
          borderColor: copied ? 'var(--accent-success, #2d6a4f)' : undefined,
          color: copied ? 'var(--accent-success, #2d6a4f)' : undefined,
        }}
      >
        {copied ? '✓ 已复制' : (label || '复制')}
      </button>
    )
  }

  return (
    <button
      onClick={copy}
      style={{
        width: '100%',
        marginTop: 6,
        padding: '7px 12px',
        background: copied ? 'transparent' : 'var(--bg-surface)',
        border: `1px solid ${copied ? 'var(--accent-success, #2d6a4f)' : 'var(--border-color)'}`,
        borderRadius: 4,
        color: copied ? 'var(--accent-success, #2d6a4f)' : 'var(--text-muted)',
        fontFamily: 'var(--font-primary)',
        fontSize: 11,
        letterSpacing: '0.1em',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {copied ? '✓ 已复制' : (label || '复制')}
    </button>
  )
}
