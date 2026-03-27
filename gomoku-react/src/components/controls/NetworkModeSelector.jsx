import { NETWORK_MODES } from '../../lib/constants.js'

export default function NetworkModeSelector({ mode, onChange, onOpenP2P }) {
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-[3px] uppercase text-ink-faint pb-2 border-b border-paper-dark mb-3">
        网络模式
      </div>
      <div className="flex flex-col gap-1.5">
        {Object.entries(NETWORK_MODES).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => {
              onChange(key)
              if (key === 'offline-p2p' && onOpenP2P) onOpenP2P()
            }}
            className={`
              px-3 py-2.5 border text-left transition-all font-mono text-[11px] tracking-wide leading-tight
              ${mode === key
                ? 'border-ink bg-ink text-paper'
                : 'border-paper-dark text-ink-faint hover:border-ink-faint hover:text-ink'}
            `}
          >
            <div className="font-semibold">{cfg.label}</div>
            <div className="text-[9px] opacity-60 mt-0.5">{cfg.netStatus}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
