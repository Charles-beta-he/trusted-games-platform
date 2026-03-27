function Btn({ label, sub, onClick, variant = 'default', disabled = false }) {
  const base = 'px-3 py-2.5 font-mono text-[11px] tracking-wide border transition-all w-full text-left leading-tight'
  const variants = {
    default: 'border-paper-dark text-ink-faint hover:border-ink-faint hover:text-ink',
    primary: 'border-ink bg-ink text-paper hover:bg-ink-light',
    danger: 'border-seal-red/60 text-seal-red hover:bg-seal-red hover:text-paper',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <div>{label}</div>
      {sub && <div className="text-[9px] opacity-50 mt-0.5">{sub}</div>}
    </button>
  )
}

/**
 * mode:
 *   'primary'   — show section header + primary actions only (新局/悔棋/认输)
 *   'secondary' — show secondary actions only (AI toggle/export/replay), no header
 *   'all'       — show section header + all actions (legacy / full)
 * Default: 'primary'
 */
export default function ControlButtons({
  onNewGame, onUndo, onToggleAI, onExport, onResign,
  aiMode, gameOver, canUndo,
  onReplay, canReplay,
  mode = 'primary',
}) {
  const showHeader    = mode !== 'secondary'
  const showPrimary   = mode === 'primary' || mode === 'all'
  const showSecondary = mode === 'secondary' || mode === 'all'

  return (
    <div>
      {showHeader && (
        <div className="text-[11px] font-semibold tracking-[3px] uppercase text-ink-faint pb-2 border-b border-paper-dark mb-3">
          操作
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {/* Primary actions */}
        {showPrimary && (
          <>
            <Btn label="新局 · New Game" onClick={onNewGame} variant="primary" />
            <Btn
              label="悔棋 · Undo"
              sub={aiMode ? 'Undo 2 moves' : 'Undo 1 move'}
              onClick={onUndo}
              disabled={!canUndo || gameOver}
            />
            {!gameOver && (
              <Btn label="认输 · Resign" sub="Forfeit current game" onClick={onResign} variant="danger" />
            )}
          </>
        )}

        {/* Secondary actions */}
        {showSecondary && (
          <>
            <Btn
              label={aiMode ? '双人模式 · 2P' : '人机模式 · AI'}
              sub={aiMode ? 'Switch to 2-player' : 'Switch to AI opponent'}
              onClick={onToggleAI}
            />
            <Btn label="导出 · Export" sub="Download JSON record" onClick={onExport} />
            {canReplay && (
              <Btn label="重放 · Replay" sub="Review game move by move" onClick={onReplay} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
