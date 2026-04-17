export default function AIThinkingIndicator({ show }) {
  if (!show) return null

  return (
    <div 
      className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
    >
      <div 
        className="bg-paper/95 px-7 py-4 border border-paper-dark shadow-lg flex flex-col items-center gap-3 gpu-accelerated"
        style={{
          animation: show ? 'fade-scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
        }}
      >
        {/* 思考点 - 优化动画 */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-ink"
              style={{ 
                animation: 'thinking-dot 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>

        {/* 文字 */}
        <span className="font-mono text-[11px] text-ink-faint tracking-widest">
          AI 计算中
        </span>

        {/* 进度条装饰 */}
        <div className="w-24 h-0.5 bg-paper-dark rounded-full overflow-hidden">
          <div 
            className="h-full bg-ink-faint rounded-full"
            style={{
              animation: 'progress-fill 2s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </div>
  )
}
