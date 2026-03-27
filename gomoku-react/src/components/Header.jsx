export default function Header({ moveCount, gameId }) {
  return (
    <header className="flex justify-between items-center px-10 py-5 border-b border-paper-dark relative z-10">
      <div className="flex items-center gap-4">
        <div className="font-calligraphy text-2xl text-ink tracking-[6px]">五子棋</div>
        <div className="font-mono text-[11px] text-ink-faint tracking-widest hidden sm:block">GOMOKU</div>
      </div>

      <div className="font-mono text-[13px] text-ink-faint tracking-wide">
        第 <span className="text-ink font-semibold">{moveCount}</span> 手
      </div>

      <div className="flex items-center gap-3">
        <div className="font-mono text-[10px] text-ink-faint hidden lg:block">
          {gameId.toUpperCase()}
        </div>
        <div className="px-3 py-1.5 border border-seal-red/70 text-seal-red font-calligraphy text-lg leading-none select-none">
          印
        </div>
      </div>
    </header>
  )
}
