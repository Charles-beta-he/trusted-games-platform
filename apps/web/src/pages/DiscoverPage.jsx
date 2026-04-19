import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'

// ─── 今日精选卡片 ─────────────────────────────────────────────────────────────

function PickCard({ pick, onLike, onBookmark, onClose }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div
      className="relative rounded-lg overflow-hidden border border-theme bg-theme-surface"
      style={{ minHeight: 180 }}
    >
      {/* 内容区域 */}
      <div className="flex flex-col items-center justify-center h-[180px] text-theme-muted font-theme text-sm">
        <div className="text-3xl mb-2">{pick.icon ?? '🎮'}</div>
        <div className="font-bold text-theme-primary text-base tracking-wider">{pick.title}</div>
        <div className="text-[11px] text-theme-muted mt-1">{pick.subtitle}</div>
      </div>

      {/* 底部操作条 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-theme bg-theme-secondary">
        <span className="text-[10px] text-theme-muted tracking-wider">{pick.meta ?? '精选对局'}</span>
        <div className="flex gap-2">
          <button
            onClick={() => { setDismissed(true); onClose?.(pick.id) }}
            aria-label="关闭"
            className="w-7 h-7 rounded-full bg-theme-surface border border-theme flex items-center justify-center text-xs text-theme-muted cursor-pointer transition-all hover:border-theme-accent"
          >✕</button>
          <button
            onClick={() => onLike?.(pick.id)}
            aria-label="点赞"
            className="w-7 h-7 rounded-full bg-theme-surface border border-theme flex items-center justify-center text-xs cursor-pointer transition-all hover:border-theme-accent"
          >♡</button>
          <button
            onClick={() => onBookmark?.(pick.id)}
            aria-label="收藏"
            className="w-7 h-7 rounded-full bg-theme-surface border border-theme flex items-center justify-center text-xs cursor-pointer transition-all hover:border-theme-accent"
          >☆</button>
        </div>
      </div>
    </div>
  )
}

// ─── 浮动操作按钮 ─────────────────────────────────────────────────────────────

function FloatingActions({ onClose, onLike, onBookmark }) {
  return (
    <div className="fixed bottom-20 left-0 right-0 flex items-center justify-center gap-5 z-30 pointer-events-none">
      {/* 关闭 */}
      <button
        onClick={onClose}
        aria-label="跳过"
        className="pointer-events-auto w-12 h-12 rounded-full bg-theme-surface border border-theme flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-110 active:scale-95"
      >
        <span className="text-lg" style={{ color: 'var(--accent-danger, #ff4757)' }}>✕</span>
      </button>

      {/* 点赞 — 主操作 */}
      <button
        onClick={onLike}
        aria-label="点赞"
        className="pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center shadow-xl cursor-pointer transition-transform hover:scale-110 active:scale-95"
        style={{ background: 'var(--accent-danger, #ff4757)' }}
      >
        <span className="text-2xl text-white">♥</span>
      </button>

      {/* 收藏 */}
      <button
        onClick={onBookmark}
        aria-label="收藏"
        className="pointer-events-auto w-12 h-12 rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-110 active:scale-95"
        style={{ background: 'color-mix(in srgb, var(--accent-warning, #ff9f43) 20%, var(--bg-surface))' }}
      >
        <span className="text-lg" style={{ color: 'var(--accent-warning, #ff9f43)' }}>★</span>
      </button>
    </div>
  )
}

// ─── 空状态 ───────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      className="rounded-lg flex items-center justify-center text-theme-muted font-theme text-sm"
      style={{
        height: 180,
        border: '2px solid var(--accent-danger, #ff4757)',
        background: 'var(--bg-surface)',
      }}
    >
      暂无精选
    </div>
  )
}

// ─── 错误状态 ─────────────────────────────────────────────────────────────────

function ErrorState({ onRetry }) {
  return (
    <>
      <div
        className="rounded-lg flex items-center justify-center text-theme-muted font-theme text-sm"
        style={{
          height: 180,
          border: '2px solid var(--accent-danger, #ff4757)',
          background: 'var(--bg-surface)',
        }}
      >
        暂无精选
      </div>
      <button
        onClick={onRetry}
        className="w-full mt-3 py-3 rounded-lg font-theme text-sm tracking-wider cursor-pointer transition-all hover:opacity-80"
        style={{
          background: 'color-mix(in srgb, var(--accent-danger, #ff4757) 8%, var(--bg-surface))',
          border: '1px solid color-mix(in srgb, var(--accent-danger, #ff4757) 30%, transparent)',
          color: 'var(--accent-danger, #ff4757)',
        }}
      >
        加载失败，点击重试
      </button>
    </>
  )
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle') // idle | loading | loaded | error | empty
  const [picks, setPicks] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // 模拟加载 — 后续接真实 API
  const loadPicks = useCallback(() => {
    setStatus('loading')
    // 模拟异步请求
    setTimeout(() => {
      // 当前无数据，展示空状态
      setStatus('empty')
      setPicks([])
    }, 800)
  }, [])

  const handleRetry = () => {
    loadPicks()
  }

  const handleLike = (id) => {
    // TODO: 接入点赞 API
    console.log('like', id ?? 'current')
    if (picks.length > 0 && currentIndex < picks.length - 1) {
      setCurrentIndex(i => i + 1)
    }
  }

  const handleBookmark = (id) => {
    // TODO: 接入收藏 API
    console.log('bookmark', id ?? 'current')
  }

  const handleClose = (id) => {
    console.log('close', id ?? 'current')
    if (picks.length > 0 && currentIndex < picks.length - 1) {
      setCurrentIndex(i => i + 1)
    }
  }

  return (
    <div className="min-h-[100svh] bg-theme-primary text-theme-primary font-theme flex flex-col">
      {/* Skip to content */}
      <a
        href="#discover-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[999] focus:px-4 focus:py-2 focus:bg-theme-accent focus:text-black focus:rounded focus:font-mono focus:text-sm"
      >
        Skip to content
      </a>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header role="banner" className="flex items-center justify-between px-5 pt-6 pb-2">
        <h1 className="text-2xl font-bold tracking-wider text-theme-primary font-theme-display">
          发现
        </h1>
        <button
          aria-label="筛选"
          className="w-10 h-10 rounded-full bg-theme-surface border border-theme flex items-center justify-center cursor-pointer transition-all hover:border-theme-accent"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-theme-secondary">
            <line x1="2" y1="4" x2="16" y2="4" />
            <line x1="2" y1="9" x2="16" y2="9" />
            <line x1="2" y1="14" x2="16" y2="14" />
            <circle cx="6" cy="4" r="1.5" fill="currentColor" />
            <circle cx="11" cy="9" r="1.5" fill="currentColor" />
            <circle cx="8" cy="14" r="1.5" fill="currentColor" />
          </svg>
        </button>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main id="discover-content" role="main" className="flex-1 px-5 pb-28 overflow-y-auto">
        {/* 今日精选 标题栏 */}
        <div className="flex items-center justify-between mb-3 mt-2">
          <span className="text-base font-bold text-theme-primary tracking-wider">今日精选</span>
          <button
            className="text-sm font-theme cursor-pointer bg-transparent border-none transition-colors hover:opacity-80"
            style={{ color: 'var(--accent-danger, #ff4757)' }}
            aria-label="查看全部精选"
          >
            查看全部 &gt;
          </button>
        </div>

        {/* 内容区域 */}
        {status === 'loaded' && picks.length > 0 && (
          <PickCard
            pick={picks[currentIndex]}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onClose={handleClose}
          />
        )}

        {(status === 'idle' || status === 'empty') && <EmptyState />}
        {status === 'loading' && (
          <div className="rounded-lg flex items-center justify-center" style={{ height: 180, border: '2px solid var(--accent-danger, #ff4757)' }}>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-thinking"
                  style={{ background: 'var(--accent-primary)', animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}
        {status === 'error' && <ErrorState onRetry={handleRetry} />}
        {status === 'loaded' && picks.length === 0 && <EmptyState />}
      </main>

      {/* ── 浮动操作按钮 ──────────────────────────────────────────────────── */}
      <FloatingActions
        onClose={() => handleClose()}
        onLike={() => handleLike()}
        onBookmark={() => handleBookmark()}
      />

      {/* ── 底部导航 ──────────────────────────────────────────────────────── */}
      <BottomNav active="discover" />
    </div>
  )
}
