export default function VictoryOverlay({
  show, winner, isDraw, lastHash, onNewGame, onReplay, onExport, moveCount,
}) {
  const winnerName = winner === 1 ? '黑方' : winner === 2 ? '白方' : ''
  const displayTitle = isDraw ? '平局' : `${winnerName}胜`
  const shortHash = lastHash ? lastHash.substring(0, 24) + '...' : '—'

  return (
    <div
      className={`
        absolute inset-0 flex flex-col items-center justify-center
        bg-paper/92 backdrop-blur-sm transition-opacity duration-500
        ${show ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `}
    >
      <div
        className="font-calligraphy text-5xl text-ink tracking-[12px]"
        style={{ animation: show ? 'victory-appear 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none' }}
      >
        {displayTitle}
      </div>

      {!isDraw && winner && (
        <div
          className={`w-12 h-12 rounded-full my-4 ${winner === 1 ? 'stone-black' : 'stone-white'}`}
          style={{ animation: show ? 'victory-spin 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.2s both' : 'none' }}
        />
      )}

      <div className="font-mono text-[10px] text-ink-faint tracking-wide mt-2 px-3 py-1.5 border border-paper-dark bg-white/50">
        GAME HASH: {shortHash}
      </div>

      <div className="flex gap-3 mt-5">
        <button
          onClick={onNewGame}
          className="px-8 py-3 bg-ink text-paper font-serif-sc text-sm tracking-[4px] hover:bg-ink-light transition-colors"
        >
          再来一局
        </button>
        {onReplay && moveCount > 0 && (
          <button
            onClick={onReplay}
            className="px-8 py-3 font-serif-sc text-sm tracking-[4px] transition-colors"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--accent-primary)',
              color: 'var(--accent-primary)',
            }}
          >
            回放
          </button>
        )}
        {onExport && moveCount > 0 && (
          <button
            type="button"
            onClick={onExport}
            className="px-8 py-3 font-serif-sc text-sm tracking-[4px] transition-colors"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
            }}
          >
            导出棋谱
          </button>
        )}
      </div>
    </div>
  )
}
