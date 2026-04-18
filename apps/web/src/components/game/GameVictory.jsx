import { useEffect, useState } from 'react'
import { createParticles } from '../../lib/animations.js'

/**
 * GameVictory - 通用胜利覆盖层组件
 * 
 * 显示胜利/平局信息，提供操作按钮
 * 复用现有VictoryOverlay的动画效果
 */
export default function GameVictory({
  show,
  winner,
  isDraw,
  lastHash,
  onNewGame,
  onReplay,
  onExport,
  moveCount,
  winnerNames = { 1: '黑方', 2: '白方' },
  title,
  subtitle,
  children,
}) {
  const [particlesCreated, setParticlesCreated] = useState(false)

  // 确定显示的标题
  const winnerName = winner ? winnerNames[winner] || `玩家${winner}` : ''
  const displayTitle = title || (isDraw ? '平局' : `${winnerName}胜`)
  const displaySubtitle = subtitle || ''
  const shortHash = lastHash ? lastHash.substring(0, 24) + '...' : '—'

  // 粒子效果
  useEffect(() => {
    if (show && !particlesCreated && !isDraw && winner) {
      // 延迟创建粒子，配合动画时间
      const timer = setTimeout(() => {
        const container = document.querySelector('.victory-particles-container')
        if (container) {
          const cleanup = createParticles(container, {
            count: 30,
            colors: winner === 1 
              ? ['var(--accent-primary)', '#7c3aed', '#00d4ff']
              : ['var(--accent-primary)', '#00ff88', '#00d4ff'],
            sizeRange: [3, 8],
            duration: 1200,
            spread: 150,
          })
          setParticlesCreated(true)
          // Store cleanup for unmount
          return cleanup
        }
      }, 400)

      return () => {
        clearTimeout(timer)
        // If createParticles was called, its cleanup is already handled by timeout
      }
    }
  }, [show, winner, isDraw, particlesCreated])

  // 重置粒子状态
  useEffect(() => {
    if (!show) {
      setParticlesCreated(false)
    }
  }, [show])

  return (
    <div
      className={`
        absolute inset-0 flex flex-col items-center justify-center
        bg-paper/92 backdrop-blur-sm transition-opacity duration-500
        ${show ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `}
    >
      {/* 粒子容器 */}
      <div className="victory-particles-container absolute inset-0 overflow-hidden pointer-events-none" />

      {/* 胜利标题 - 增强动画 */}
      <div
        className="font-calligraphy text-5xl text-ink tracking-[12px] relative"
        style={{ 
          animation: show ? 'victory-appear 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
          transform: 'scale(3)',
          opacity: 0,
        }}
      >
        {displayTitle}
        {/* 发光效果 */}
        {show && (
          <div 
            className="absolute inset-0 font-calligraphy text-5xl tracking-[12px]"
            style={{
              color: 'var(--accent-primary)',
              filter: 'blur(20px)',
              opacity: 0.4,
              animation: 'glow-pulse 2s ease-in-out infinite',
            }}
          >
            {displayTitle}
          </div>
        )}
      </div>

      {/* 副标题 */}
      {displaySubtitle && (
        <div 
          className="font-mono text-[11px] tracking-widest mt-3 text-ink-faint"
          style={{
            animation: show ? 'fade-scale-in 0.4s cubic-bezier(0.4,0,0.2,1) 0.3s both' : 'none',
          }}
        >
          {displaySubtitle}
        </div>
      )}

      {/* 获胜棋子 - 增强动画 */}
      {!isDraw && winner && (
        <div
          className={`w-12 h-12 rounded-full my-4 ${winner === 1 ? 'stone-black' : 'stone-white'} relative`}
          style={{ 
            animation: show ? 'victory-spin 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.2s both' : 'none',
          }}
        >
          {/* 棋子光环 */}
          {show && (
            <div 
              className="absolute -inset-2 rounded-full animate-breathe"
              style={{
                background: 'transparent',
                border: `2px solid ${winner === 1 ? 'var(--accent-secondary)' : 'var(--accent-primary)'}`,
                opacity: 0.6,
              }}
            />
          )}
        </div>
      )}

      {/* 哈希值 */}
      {lastHash && (
        <div 
          className="font-mono text-[10px] text-ink-faint tracking-wide mt-2 px-3 py-1.5 border border-paper-dark bg-white/50"
          style={{
            animation: show ? 'fade-scale-in 0.4s cubic-bezier(0.4,0,0.2,1) 0.5s both' : 'none',
          }}
        >
          GAME HASH: {shortHash}
        </div>
      )}

      {/* 移动计数 */}
      {moveCount !== undefined && (
        <div 
          className="font-mono text-[9px] text-ink-faint tracking-widest mt-2"
          style={{
            animation: show ? 'slide-in-up 0.3s ease 0.6s both' : 'none',
          }}
        >
          {moveCount} MOVES
        </div>
      )}

      {/* 自定义内容 */}
      {children}

      {/* 按钮组 - 交错入场 */}
      <div className="flex gap-3 mt-5">
        <button
          onClick={onNewGame}
          className="px-8 py-3 bg-ink text-paper font-serif-sc text-sm tracking-[4px] hover:bg-ink-light transition-colors hover-lift"
          style={{
            animation: show ? 'slide-in-up 0.3s ease 0.7s both' : 'none',
          }}
        >
          再来一局
        </button>
        {onReplay && moveCount > 0 && (
          <button
            onClick={onReplay}
            className="px-8 py-3 font-serif-sc text-sm tracking-[4px] transition-colors hover-glow"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--accent-primary)',
              color: 'var(--accent-primary)',
              animation: show ? 'slide-in-up 0.3s ease 0.85s both' : 'none',
            }}
          >
            回放
          </button>
        )}
        {onExport && moveCount > 0 && (
          <button
            type="button"
            onClick={onExport}
            className="px-8 py-3 font-serif-sc text-sm tracking-[4px] transition-colors hover-glow"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              animation: show ? 'slide-in-up 0.3s ease 1.0s both' : 'none',
            }}
          >
            导出棋谱
          </button>
        )}
      </div>
    </div>
  )
}