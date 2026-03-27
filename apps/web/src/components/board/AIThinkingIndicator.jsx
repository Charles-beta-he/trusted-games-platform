export default function AIThinkingIndicator({ show }) {
  if (!show) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="bg-paper/95 px-7 py-4 border border-paper-dark shadow-lg flex flex-col items-center gap-2.5">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-ink animate-thinking"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <span className="font-mono text-[11px] text-ink-faint tracking-widest">AI 计算中</span>
      </div>
    </div>
  )
}
