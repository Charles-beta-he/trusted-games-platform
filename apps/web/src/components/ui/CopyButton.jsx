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
        aria-label={copied ? '已复制到剪贴板' : '复制到剪贴板'}
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
      aria-label={copied ? '已复制到剪贴板' : '复制到剪贴板'}
      className="w-full mt-1.5 py-2 px-3 rounded font-mono text-xs tracking-wider cursor-pointer transition-all duration-200"
      style={{
        background: copied ? 'transparent' : 'var(--bg-surface)',
        border: `1px solid ${copied ? 'var(--accent-success, #2d6a4f)' : 'var(--border-color)'}`,
        color: copied ? 'var(--accent-success, #2d6a4f)' : 'var(--text-muted)',
      }}
    >
      {copied ? '✓ 已复制' : (label || '复制')}
    </button>
  )
}
