import { TRUST_LEVELS } from '../../lib/constants.js'

export default function TrustBadge({ level, moveCount }) {
  const config = TRUST_LEVELS[level]

  return (
    <div>
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5 border relative transition-all duration-300"
        style={{ borderColor: config.color, color: config.color, background: `${config.color}0f` }}
      >
        <span className="text-lg flex-shrink-0">{config.icon}</span>
        <div>
          <div className="font-mono text-xs font-semibold tracking-wide leading-tight">{config.label}</div>
          <div className="font-mono text-[9px] opacity-70 tracking-wide mt-0.5">{config.sub}</div>
        </div>
        <span className="absolute top-1 right-2 font-mono text-[9px] opacity-70">{level}</span>
      </div>

      <div className="flex gap-[3px] mt-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 transition-colors duration-300"
            style={{
              background: i <= config.activeBars ? '#c0392b' : '#d4c4a8'
            }}
          />
        ))}
      </div>

      <p className="font-mono text-[10px] text-ink-faint leading-relaxed mt-1">
        {moveCount >= 5 ? '签名链激活\n落子不可篡改' : '签名链记录中\n落子不可篡改'}
      </p>
    </div>
  )
}
