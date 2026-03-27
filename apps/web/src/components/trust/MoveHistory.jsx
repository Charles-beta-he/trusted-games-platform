import { useEffect, useRef } from 'react'

function SectionTitle({ children }) {
  return (
    <div className="text-[11px] font-semibold tracking-[3px] uppercase text-ink-faint pb-2 border-b border-paper-dark">
      {children}
    </div>
  )
}

export default function MoveHistory({ moveHistory, genesisHash, highlightIndex = -1 }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [moveHistory.length])

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <SectionTitle>落子记录</SectionTitle>

      <div
        ref={scrollRef}
        className="flex flex-col gap-0.5 overflow-y-auto"
        style={{ maxHeight: '220px' }}
      >
        {moveHistory.length === 0 ? (
          <div className="font-mono text-[11px] text-ink-faint text-center py-4">— 等待落子 —</div>
        ) : (
          moveHistory.map((m, idx) => (
            <div
              key={m.num}
              className={`flex items-center gap-2 px-2 py-1.5 font-mono text-[12px] rounded-sm transition-colors hover:bg-ink/[0.04] ${idx === highlightIndex ? 'text-ink' : idx === moveHistory.length - 1 && highlightIndex === -1 ? 'bg-ink/[0.05] text-ink' : 'text-ink-faint'}`}
              style={idx === highlightIndex ? { backgroundColor: 'color-mix(in srgb, var(--accent-primary) 18%, transparent)' } : {}}
            >
              <span className="w-6 text-right text-[10px] opacity-50">{m.num}</span>
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${m.player === 1 ? 'stone-black-sm' : 'stone-white-sm'}`} />
              <span className="flex-1 tracking-wide">{m.coord}</span>
              {/* Verification badge: only shown for remote moves (verified !== null) */}
              {m.verified === true  && <span className="text-[9px] text-trust-l1 font-bold" title="哈希验证通过">✓</span>}
              {m.verified === false && <span className="text-[9px] text-seal-red font-bold" title="哈希验证失败！">✗</span>}
              <span className="text-[9px] opacity-40">{m.hash?.substring(0, 8)}</span>
            </div>
          ))
        )}
      </div>

      <SectionTitle>签名链</SectionTitle>

      <div className="flex flex-col gap-1.5">
        <div className="px-2.5 py-2 bg-ink/[0.03] border-l-2 border-paper-dark font-mono text-[10px] text-ink-faint leading-relaxed">
          <div className="text-[9px] tracking-wide uppercase text-trust-l1 mb-1">Genesis Block</div>
          <div className="break-all opacity-70">{genesisHash ? genesisHash.substring(0, 40) + '...' : '—'}</div>
        </div>

        {moveHistory.slice(-3).map((m) => (
          <div
            key={m.num}
            className={`px-2.5 py-2 bg-ink/[0.03] border-l-2 font-mono text-[10px] text-ink-faint leading-relaxed ${m.verified === false ? 'border-seal-red' : 'border-paper-dark'}`}
          >
            <div className="flex items-center gap-1.5 text-[9px] tracking-wide uppercase mb-1">
              <span className={m.verified === false ? 'text-seal-red' : 'text-trust-l1'}>
                Move #{m.num} · {m.player === 1 ? 'Black' : 'White'} · {m.coord}
              </span>
              {m.verified === true  && <span className="text-trust-l1 font-bold">✓</span>}
              {m.verified === false && <span className="text-seal-red font-bold">✗ TAMPER</span>}
            </div>
            <div className="break-all opacity-70">{m.hash?.substring(0, 40)}...</div>
          </div>
        ))}
      </div>
    </div>
  )
}
