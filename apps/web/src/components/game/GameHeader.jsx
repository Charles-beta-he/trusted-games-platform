/**
 * GameHeader - 通用游戏头部组件
 * 
 * 显示当前行棋方、步数和游戏状态
 * 可作为现有Header组件的通用抽象层
 */
export default function GameHeader({
  currentPlayer,
  moveCount,
  gameOver,
  player1Name = '黑方',
  player2Name = '白方',
  statusText,
  onBackToLobby,
  gameId,
  children,
}) {
  // 确定当前玩家名称
  const currentPlayerName = currentPlayer === 1 ? player1Name : player2Name
  
  // 确定状态文本
  const displayStatus = statusText || (gameOver ? 'GAME OVER' : 'GAME IN PROGRESS')
  
  return (
    <header
      className="flex justify-between items-center px-6 py-3 relative z-10 border-b border-theme bg-theme-secondary"
    >
      {/* 左侧：返回按钮 + 游戏标识 */}
      <div className="flex items-center gap-4">
        {onBackToLobby && (
          <button
            onClick={onBackToLobby}
            className="font-mono text-[11px] tracking-widest px-2 py-1 transition-all border border-theme text-theme-muted bg-transparent"
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--accent-primary)'
              e.currentTarget.style.borderColor = 'var(--accent-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-muted)'
              e.currentTarget.style.borderColor = 'var(--border-color)'
            }}
          >
            ← LOBBY
          </button>
        )}
        <div className="font-mono text-xl tracking-[4px] text-theme-primary font-theme-display">
          {gameId?.toUpperCase() || 'GAME'}
        </div>
      </div>

      {/* 中间：当前玩家 + 步数 + 状态 */}
      <div className="flex items-center gap-6">
        {/* 当前玩家 */}
        <div className="font-mono text-[13px] tracking-wide text-theme-secondary">
          当前: <span className="text-theme-primary font-semibold">{currentPlayerName}</span>
        </div>
        
        {/* 步数 */}
        <div className="font-mono text-[13px] tracking-wide text-theme-secondary">
          第 <span className="text-theme-primary font-semibold">{moveCount}</span> 手
        </div>
        
        {/* 状态 */}
        <div 
          className={`font-mono text-[11px] tracking-widest px-3 py-1 border ${
            gameOver 
              ? 'border-seal-red/60 text-seal-red' 
              : 'border-theme text-theme-muted'
          }`}
        >
          {displayStatus}
        </div>
      </div>

      {/* 右侧：自定义内容 + 印章 */}
      <div className="flex items-center gap-3">
        {children}
        <div
          className="px-3 py-1.5 font-mono text-xs leading-none select-none border border-theme-accent text-theme-accent font-theme-display"
        >
          印
        </div>
      </div>
    </header>
  )
}