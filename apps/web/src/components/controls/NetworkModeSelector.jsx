import { NETWORK_MODES } from '../../lib/constants.js'

const CONNECTION_STATUS_DISPLAY = {
  idle:       { label: 'NOT CONNECTED', color: 'var(--text-muted, #999)' },
  connecting: { label: 'CONNECTING...', color: '#d4a017', blink: true },
  connected:  { label: 'CONNECTED',     color: 'var(--accent-success, #2d6a4f)' },
  encrypted:  { label: '🔐 ENCRYPTED',  color: '#00bcd4' },
}

export default function NetworkModeSelector({ mode, onChange, onOpenP2P, connectionStatus }) {
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-[3px] uppercase text-ink-faint pb-2 border-b border-paper-dark mb-3">
        网络模式
      </div>
      <div className="flex flex-col gap-1.5">
        {Object.entries(NETWORK_MODES).map(([key, cfg]) => {
          const isSelected = mode === key
          const showStatus = key === 'offline-p2p' && isSelected && connectionStatus

          return (
            <button
              key={key}
              onClick={() => {
                onChange(key)
                if (key === 'offline-p2p' && onOpenP2P) onOpenP2P()
              }}
              className={`
                px-3 py-2.5 border text-left transition-all font-mono text-[11px] tracking-wide leading-tight
                ${isSelected
                  ? 'border-ink bg-ink text-paper'
                  : 'border-paper-dark text-ink-faint hover:border-ink-faint hover:text-ink'}
              `}
            >
              <div className="font-semibold">{cfg.label}</div>
              <div className="text-[9px] opacity-60 mt-0.5">{cfg.netStatus}</div>
              {showStatus && (() => {
                const info = CONNECTION_STATUS_DISPLAY[connectionStatus] || CONNECTION_STATUS_DISPLAY.idle
                return (
                  <div
                    className="text-[9px] mt-0.5 font-mono tracking-widest"
                    style={{
                      color: isSelected ? 'rgba(255,255,255,0.75)' : info.color,
                      animation: info.blink ? 'pulse 1s ease-in-out infinite' : undefined,
                    }}
                  >
                    {info.label}
                  </div>
                )
              })()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
