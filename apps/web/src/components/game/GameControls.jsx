/**
 * GameControls - 通用控制按钮组件
 * 
 * 提供新局、悔棋、认输等基本控制功能
 * 复用现有ControlButtons的设计和功能
 */
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
 * GameControls - 通用游戏控制组件
 * 
 * @param {Object} props
 * @param {Function} props.onNewGame - 新局回调
 * @param {Function} props.onUndo - 悔棋回调
 * @param {Function} props.onResign - 认输回调
 * @param {Function} props.onToggleAI - 切换AI模式回调
 * @param {Function} props.onExport - 导出回调
 * @param {Function} props.onReplay - 回放回调
 * @param {Function} props.onPass - 跳过回合回调（围棋专用）
 * @param {boolean} props.aiMode - 是否AI模式
 * @param {boolean} props.gameOver - 游戏是否结束
 * @param {boolean} props.canUndo - 是否可以悔棋
 * @param {boolean} props.canReplay - 是否可以回放
 * @param {string} props.mode - 显示模式: 'primary' | 'secondary' | 'all'
 * @param {string} props.className - 额外CSS类名
 * @param {React.ReactNode} props.children - 自定义按钮
 */
export default function GameControls({
  onNewGame,
  onUndo,
  onResign,
  onToggleAI,
  onExport,
  onReplay,
  onPass,
  aiMode,
  gameOver,
  canUndo,
  canReplay,
  mode = 'primary',
  className = '',
  children,
}) {
  const showHeader = mode !== 'secondary'
  const showPrimary = mode === 'primary' || mode === 'all'
  const showSecondary = mode === 'secondary' || mode === 'all'

  return (
    <div className={className}>
      {showHeader && (
        <div className="text-[11px] font-semibold tracking-[3px] uppercase text-ink-faint pb-2 border-b border-paper-dark mb-3">
          操作
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {/* 主要操作 */}
        {showPrimary && (
          <>
            <Btn label="新局 · New Game" onClick={onNewGame} variant="primary" />
            <Btn
              label="悔棋 · Undo"
              sub={aiMode ? 'Undo 2 moves' : 'Undo 1 move'}
              onClick={onUndo}
              disabled={!canUndo || gameOver}
            />
            {onPass && !gameOver && (
              <Btn label="跳过 · Pass" sub="Pass this turn" onClick={onPass} />
            )}
            {!gameOver && (
              <Btn label="认输 · Resign" sub="Forfeit current game" onClick={onResign} variant="danger" />
            )}
          </>
        )}

        {/* 次要操作 */}
        {showSecondary && (
          <>
            {onToggleAI && (
              <Btn
                label={aiMode ? '双人模式 · 2P' : '人机模式 · AI'}
                sub={aiMode ? 'Switch to 2-player' : 'Switch to AI opponent'}
                onClick={onToggleAI}
              />
            )}
            {onExport && (
              <Btn label="导出 · Export" sub="Download JSON record" onClick={onExport} />
            )}
            {canReplay && onReplay && (
              <Btn label="重放 · Replay" sub="Review game move by move" onClick={onReplay} />
            )}
          </>
        )}

        {/* 自定义按钮 */}
        {children}
      </div>
    </div>
  )
}