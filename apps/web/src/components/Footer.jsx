import { NETWORK_MODES } from '../lib/constants.js'

const DOT_COLORS = {
  'offline-solo': '#8b3a3a',
  'offline-p2p': '#f0a500',
  'online': '#2d6a4f',
}

export default function Footer({ gameId, networkMode, isEncrypted }) {
  const cfg = NETWORK_MODES[networkMode] || NETWORK_MODES['offline-solo']
  const dotColor = DOT_COLORS[networkMode] || DOT_COLORS['offline-solo']

  return (
    <footer className="flex justify-between items-center px-10 py-3 border-t border-paper-dark font-mono text-[10px] text-ink-faint tracking-wide">
      <div className="hidden sm:block">GAME · {gameId.toUpperCase()}</div>
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full animate-net-pulse flex-shrink-0"
          style={{ background: dotColor }}
        />
        <span className="tracking-widest">{cfg.netStatus}</span>
        {isEncrypted && (
          <span
            className="ml-1 px-1 border border-current rounded tracking-widest"
            title="End-to-end encrypted (ECDH + AES-GCM)"
          >
            E2E
          </span>
        )}
      </div>
      <div className="hidden sm:block">v1.0.0</div>
    </footer>
  )
}
