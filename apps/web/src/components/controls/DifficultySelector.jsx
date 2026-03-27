import { DIFFICULTY_CONFIG } from '../../lib/constants.js'

export default function DifficultySelector({ difficulty, onChange, disabled }) {
  const entries = Object.entries(DIFFICULTY_CONFIG)

  return (
    <div>
      <div className="text-[11px] font-semibold tracking-[3px] uppercase text-ink-faint pb-2 border-b border-paper-dark mb-3">
        难度设置
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {entries.map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => !disabled && onChange(key)}
            className={`
              px-2 py-2.5 text-center border transition-all font-mono text-[11px] tracking-wide
              ${difficulty === key
                ? 'border-ink bg-ink text-paper'
                : 'border-paper-dark text-ink-faint hover:border-ink-faint hover:text-ink'}
              ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="font-semibold">{cfg.label}</div>
            <div className="text-[9px] opacity-70 mt-0.5">深度 {cfg.depth}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
