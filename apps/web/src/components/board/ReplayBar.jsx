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

  const btnBase = {
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontSize: 16,
    color: 'var(--text-primary)',
  }

  const smallBtnBase = {
    cursor: 'pointer',
    background: 'none',
    border: '1px solid var(--border-color)',
    padding: '2px 6px',
    fontFamily: 'var(--font-primary)',
    fontSize: 10,
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 16px',
      background: 'var(--bg-surface)',
      borderTop: '1px solid var(--border-color)',
      fontFamily: 'var(--font-primary)',
      flexWrap: 'wrap',
    }}>
      {/* 首步 / 上一步 */}
      <button onClick={onGoToStart} title="首步" style={btnBase}>⏮</button>
      <button
        onClick={onStepBack}
        title="上一步"
        disabled={replayIndex === 0}
        style={{ ...btnBase, cursor: replayIndex === 0 ? 'not-allowed' : 'pointer', opacity: replayIndex === 0 ? 0.4 : 1 }}
      >◀</button>

      {/* 自动播放 / 暂停 */}
      <button
        onClick={onToggleAutoPlay}
        title={isAutoPlaying ? '暂停' : '自动播放'}
        style={{ ...btnBase, fontSize: 15 }}
      >
        {isAutoPlaying ? '⏸' : '▶▶'}
      </button>

      {/* 进度条 */}
      <input
        type="range" min={0} max={totalMoves} value={replayIndex}
        onChange={(e) => onGoTo(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--accent-primary)', minWidth: 80 }}
      />

      {/* 下一步 / 末步 */}
      <button
        onClick={onStepForward}
        title="下一步"
        disabled={replayIndex === totalMoves}
        style={{ ...btnBase, cursor: replayIndex === totalMoves ? 'not-allowed' : 'pointer', opacity: replayIndex === totalMoves ? 0.4 : 1 }}
      >▶</button>
      <button onClick={onGoToEnd} title="末步" style={btnBase}>⏭</button>

      {/* 循环按钮 */}
      <button
        onClick={onToggleLooping}
        title="循环回放"
        style={{ ...btnBase, fontSize: 14, color: isLooping ? 'var(--accent-primary)' : 'var(--text-muted)' }}
      >
        🔁
      </button>

      {/* 速度选择 */}
      {[2000, 1000, 500].map(speed => (
        <button
          key={speed}
          onClick={() => onSetSpeed(speed)}
          style={{
            ...smallBtnBase,
            color: playbackSpeed === speed ? 'var(--accent-primary)' : 'var(--text-muted)',
            borderColor: playbackSpeed === speed ? 'var(--accent-primary)' : 'var(--border-color)',
          }}
        >
          {speed === 2000 ? '0.5×' : speed === 1000 ? '1×' : '2×'}
        </button>
      ))}

      {/* 步数显示 */}
      <span style={{ color: 'var(--text-muted)', fontSize: 12, minWidth: 60, textAlign: 'right' }}>
        {replayIndex} / {totalMoves}
      </span>

      {/* 退出按钮 */}
      <button
        onClick={onExit}
        style={{
          color: 'var(--accent-danger)',
          marginLeft: 8,
          cursor: 'pointer',
          background: 'none',
          border: '1px solid var(--accent-danger)',
          padding: '2px 8px',
          fontFamily: 'var(--font-primary)',
          fontSize: 11,
          letterSpacing: '0.05em',
        }}
      >
        EXIT
      </button>
    </div>
  )
}
