export default function ReplayBar({
  isReplaying,
  replayIndex,
  totalMoves,
  onStepBack,
  onStepForward,
  onGoToStart,
  onGoToEnd,
  onGoTo,
  onExit,
  isAutoPlaying,
  isLooping,
  playbackSpeed,
  onToggleAutoPlay,
  onToggleLooping,
  onSetSpeed,
}) {
  if (!isReplaying) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-theme-surface border-t border-theme font-theme flex-wrap">
      {/* 首步 / 上一步 */}
      <button onClick={onGoToStart} aria-label="跳到首步" title="首步" className="cursor-pointer bg-transparent border-none text-xl text-theme-primary">⏮</button>
      <button
        onClick={onStepBack}
        aria-label="上一步"
        title="上一步"
        disabled={replayIndex === 0}
        className="cursor-pointer bg-transparent border-none text-xl text-theme-primary"
        style={{ cursor: replayIndex === 0 ? 'not-allowed' : 'pointer', opacity: replayIndex === 0 ? 0.4 : 1 }}
      >◀</button>

      {/* 自动播放 / 暂停 */}
      <button
        onClick={onToggleAutoPlay}
        aria-label={isAutoPlaying ? '暂停回放' : '自动播放'}
        title={isAutoPlaying ? '暂停' : '自动播放'}
        className="cursor-pointer bg-transparent border-none text-lg text-theme-primary"
      >
        {isAutoPlaying ? '⏸' : '▶▶'}
      </button>

      {/* 进度条 */}
      <input
        type="range" min={0} max={totalMoves} value={replayIndex}
        onChange={(e) => onGoTo(Number(e.target.value))}
        aria-label="回放进度"
        className="flex-1 min-w-[80px]"
        style={{ accentColor: 'var(--accent-primary)' }}
      />

      {/* 下一步 / 末步 */}
      <button
        onClick={onStepForward}
        aria-label="下一步"
        title="下一步"
        disabled={replayIndex === totalMoves}
        className="cursor-pointer bg-transparent border-none text-xl text-theme-primary"
        style={{ cursor: replayIndex === totalMoves ? 'not-allowed' : 'pointer', opacity: replayIndex === totalMoves ? 0.4 : 1 }}
      >▶</button>
      <button onClick={onGoToEnd} aria-label="跳到末步" title="末步" className="cursor-pointer bg-transparent border-none text-xl text-theme-primary">⏭</button>

      {/* 循环按钮 */}
      <button
        onClick={onToggleLooping}
        aria-label={isLooping ? '关闭循环回放' : '开启循环回放'}
        title="循环回放"
        className="cursor-pointer bg-transparent border-none text-sm text-theme-primary"
        style={{ color: isLooping ? 'var(--accent-primary)' : 'var(--text-muted)' }}
      >
        🔁
      </button>

      {/* 速度选择 */}
      {[2000, 1000, 500].map(speed => (
        <button
          key={speed}
          onClick={() => onSetSpeed(speed)}
          className="cursor-pointer bg-transparent border px-1.5 py-0.5 font-theme text-[10px] tracking-wide text-theme-muted"
          style={{
            color: playbackSpeed === speed ? 'var(--accent-primary)' : 'var(--text-muted)',
            borderColor: playbackSpeed === speed ? 'var(--accent-primary)' : 'var(--border-color)',
          }}
        >
          {speed === 2000 ? '0.5×' : speed === 1000 ? '1×' : '2×'}
        </button>
      ))}

      {/* 步数显示 */}
      <span className="text-theme-muted text-xs min-w-[60px] text-right">
        {replayIndex} / {totalMoves}
      </span>

      {/* 退出按钮 */}
      <button
        onClick={onExit}
        className="ml-2 cursor-pointer bg-transparent border border-accent-danger text-accent-danger px-2 py-0.5 font-theme text-[11px] tracking-wide"
      >
        EXIT
      </button>
    </div>
  )
}
