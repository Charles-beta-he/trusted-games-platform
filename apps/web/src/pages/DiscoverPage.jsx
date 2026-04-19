import { useState, useCallback, useEffect } from 'react'
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
        <span className="text-lg text-danger">✕</span>
      </button>

      {/* 点赞 — 主操作 */}
      <button
        onClick={onLike}
        aria-label="点赞"
        className="pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center shadow-xl cursor-pointer transition-transform hover:scale-110 active:scale-95"
        className="bg-danger"
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
      className="rounded-lg flex items-center justify-center text-theme-muted font-theme text-sm border-2 border-danger"
      style={{
        height: 180,
        
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
        className="rounded-lg flex items-center justify-center text-theme-muted font-theme text-sm border-2 border-danger"
        style={{
          height: 180,
          
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
  const [status, setStatus] = useState('loading')
  const [picks, setPicks] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [filter, setFilter] = useState('all') // all | gomoku | go | chess | xiangqi
  const [liked, setLiked] = useState(new Set())
  const [bookmarked, setBookmarked] = useState(new Set())
  const [showAll, setShowAll] = useState(false)

  // 精选数据 — 本地生成 demo，后续接 API
  const generatePicks = useCallback((f) => {
    const allPicks = [
      { id: 'g1', icon: '⚫', title: '五子棋 · 经典开局', subtitle: '黑方花月定式 · 42 手', meta: 'AI 对局 · 难度中级', game: 'gomoku' },
      { id: 'g2', icon: '⚫', title: '五子棋 · 疏星局', subtitle: '交换规则下的经典博弈', meta: 'P2P 对局 · 38 手', game: 'gomoku' },
      { id: 'g3', icon: '⚫', title: '五子棋 · 连珠禁手', subtitle: '黑方三三禁手实战', meta: 'AI 对局 · 难度高级', game: 'gomoku' },
      { id: 'o1', icon: '⬜', title: '围棋 · 小目定式', subtitle: '二间高夹后的经典变化', meta: '本地对局 · 86 手', game: 'go' },
      { id: 'o2', icon: '⬜', title: '围棋 · 大模样作战', subtitle: '三连星布局实战', meta: 'AI 对局 · 124 手', game: 'go' },
      { id: 'c1', icon: '♟', title: '国际象棋 · 意大利开局', subtitle: '1.e4 e5 2.Nf3 Nc6 3.Bc4', meta: 'AI 对局 · 28 手', game: 'chess' },
      { id: 'c2', icon: '♟', title: '国际象棋 · 西西里防御', subtitle: 'Najdorf 变例深度解析', meta: '本地对局 · 45 手', game: 'chess' },
      { id: 'x1', icon: '🔴', title: '中国象棋 · 中炮对屏风马', subtitle: '经典开局体系', meta: '本地对局 · 52 步', game: 'xiangqi' },
      { id: 'x2', icon: '🔴', title: '中国象棋 · 仙人指路', subtitle: '灵活多变的试探性开局', meta: 'AI 对局 · 36 步', game: 'xiangqi' },
    ]
    return f === 'all' ? allPicks : allPicks.filter(p => p.game === f)
  }, [])

  // 首次加载
  useEffect(() => {
    const timer = setTimeout(() => {
      const data = generatePicks(filter)
      setPicks(data)
      setCurrentIndex(0)
      setStatus(data.length > 0 ? 'loaded' : 'empty')
    }, 600)
    return () => clearTimeout(timer)
  }, [filter, generatePicks])

  const handleRetry = () => {
    setStatus('loading')
    const timer = setTimeout(() => {
      const data = generatePicks(filter)
      setPicks(data)
      setCurrentIndex(0)
      setStatus(data.length > 0 ? 'loaded' : 'empty')
    }, 600)
  }

  const handleLike = (id) => {
    const targetId = id ?? picks[currentIndex]?.id
    if (!targetId) return
    setLiked(prev => {
      const next = new Set(prev)
      next.has(targetId) ? next.delete(targetId) : next.add(targetId)
      return next
    })
    if (!id && picks.length > 0 && currentIndex < picks.length - 1) {
      setCurrentIndex(i => i + 1)
    }
  }

  const handleBookmark = (id) => {
    const targetId = id ?? picks[currentIndex]?.id
    if (!targetId) return
    setBookmarked(prev => {
      const next = new Set(prev)
      next.has(targetId) ? next.delete(targetId) : next.add(targetId)
      return next
    })
  }

  const handleClose = (id) => {
    if (!id && picks.length > 0 && currentIndex < picks.length - 1) {
      setCurrentIndex(i => i + 1)
    }
  }

  const filterLabels = { all: '全部', gomoku: '五子棋', go: '围棋', chess: '象棋', xiangqi: '中国象棋' }

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
        <div className="flex gap-1.5">
          {Object.entries(filterLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setFilter(key); setShowAll(false) }}
              aria-pressed={filter === key}
              aria-label={`筛选: ${label}`}
              className={`px-2.5 py-1 rounded text-[10px] font-theme tracking-wider cursor-pointer transition-all border duration-200 ${
                filter === key
                  ? 'bg-theme-accent text-black border-theme-accent font-bold shadow-sm'
                  : 'bg-theme-surface text-theme-muted border-theme hover:border-theme-accent hover:text-theme-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main id="discover-content" role="main" className="flex-1 px-5 pb-28 overflow-y-auto">
        {/* 今日精选 标题栏 */}
        <div className="flex items-center justify-between mb-3 mt-2">
          <span className="text-base font-bold text-theme-primary tracking-wider">
            今日精选
            {picks.length > 0 && status === 'loaded' && (
              <span className="text-[11px] text-theme-muted font-normal ml-2">{picks.length} 条</span>
            )}
          </span>
          <button
            onClick={() => setShowAll(v => !v)}
            className="text-sm font-theme cursor-pointer bg-transparent border-none transition-colors hover:opacity-80"
            style={{ color: 'var(--accent-danger, #ff4757)' }}
            aria-label={showAll ? '返回卡片视图' : '查看全部精选'}
          >
            {showAll ? '‹ 返回' : '查看全部 >'}
          </button>
        </div>

        {/* 列表视图 — 查看全部 */}
        {showAll && status === 'loaded' && picks.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {picks.map((pick) => (
              <div
                key={pick.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-theme-surface border border-theme transition-all duration-200 hover:border-theme-accent hover:bg-theme-secondary cursor-pointer"
              >
                <div className="text-2xl shrink-0 w-8 text-center">{pick.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-theme-primary tracking-wider truncate">{pick.title}</div>
                  <div className="text-[11px] text-theme-secondary mt-0.5 truncate">{pick.subtitle}</div>
                  <div className="text-[10px] text-theme-muted mt-0.5 opacity-70">{pick.meta}</div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleLike(pick.id)}
                    aria-label={liked.has(pick.id) ? '取消点赞' : '点赞'}
                    aria-pressed={liked.has(pick.id)}
                    className="w-8 h-8 rounded-full border border-theme flex items-center justify-center text-sm cursor-pointer transition-all bg-transparent"
                    style={{
                      color: liked.has(pick.id) ? 'var(--accent-danger, #ff4757)' : 'var(--text-muted)',
                      borderColor: liked.has(pick.id) ? 'var(--accent-danger, #ff4757)' : undefined,
                    }}
                  >
                    {liked.has(pick.id) ? '♥' : '♡'}
                  </button>
                  <button
                    onClick={() => handleBookmark(pick.id)}
                    aria-label={bookmarked.has(pick.id) ? '取消收藏' : '收藏'}
                    aria-pressed={bookmarked.has(pick.id)}
                    className="w-8 h-8 rounded-full border border-theme flex items-center justify-center text-sm cursor-pointer transition-all bg-transparent"
                    style={{
                      color: bookmarked.has(pick.id) ? 'var(--accent-warning, #ff9f43)' : 'var(--text-muted)',
                      borderColor: bookmarked.has(pick.id) ? 'var(--accent-warning, #ff9f43)' : undefined,
                    }}
                  >
                    {bookmarked.has(pick.id) ? '★' : '☆'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 卡片视图 — 单张滑动 */}
        {!showAll && status === 'loaded' && picks.length > 0 && (
          <PickCard
            pick={picks[currentIndex]}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onClose={handleClose}
          />
        )}

        {!showAll && (status === 'idle' || status === 'empty') && <EmptyState />}
        {!showAll && status === 'loading' && (
          <div className="rounded-lg flex items-center justify-center" className="border-2 border-danger">
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
        {!showAll && status === 'error' && <ErrorState onRetry={handleRetry} />}
        {!showAll && status === 'loaded' && picks.length === 0 && <EmptyState />}
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
