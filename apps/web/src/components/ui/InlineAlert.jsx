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
      className="flex items-center gap-2 py-2 px-3 my-2 bg-red-500/10 border border-red-500/40 rounded-md text-red-300 text-xs font-mono"
    >
      <span className="flex-shrink-0">⚠️</span>
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="关闭提示"
          className="bg-transparent border-none text-red-300 cursor-pointer text-sm px-1"
        >
          ✕
        </button>
      )}
    </div>
  )
}
