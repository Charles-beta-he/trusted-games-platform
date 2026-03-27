import { formatTime } from '../../hooks/useTimer.js'

export default function PlayerCard({ player, name, type, timer, isActive }) {
  return (
    <div
      className={`
        flex items-center gap-3 p-3 border transition-all relative overflow-hidden
        ${isActive ? 'border-ink-faint bg-ink/[0.03]' : 'border-paper-dark'}
      `}
    >
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-ink animate-pulse-bar" />
      )}

      <div
        className={`w-8 h-8 rounded-full flex-shrink-0 ${player === 1 ? 'stone-black' : 'stone-white'}`}
      />

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-ink">{name}</div>
        <div className="font-mono text-[10px] text-ink-faint tracking-wide">{type}</div>
      </div>

      <div className="font-mono text-xl font-semibold text-ink min-w-[48px] text-right">
        {formatTime(timer)}
      </div>
    </div>
  )
}
