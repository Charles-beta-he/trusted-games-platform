import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { GAME_CATALOG } from '../plugins/index.js'
import { getLocalIP } from '../lib/lanIp.js'
import useThemeCycle from '../hooks/useThemeCycle.js'
import { useStaggerAnimation, useIntersectionObserver } from '../hooks/useIntersectionObserver.js'

export default function GameLobby({ onSelectGame, onQuickJoin, onOpenPlatform, onImportGomoku }) {
  const navigate = useNavigate()
  const { theme, setTheme, themes, prevTheme, nextTheme } = useThemeCycle()
  const [joinInput, setJoinInput] = useState('')
  const [localIP, setLocalIP] = useState(null)
  const [ipCopied, setIpCopied] = useState(false)
  const importInputRef = useRef(null)
  
  // 滚动入场动画
  const [titleRef, titleVisible] = useIntersectionObserver({ threshold: 0.2 })
  const [cardsRef, getCardStyle] = useStaggerAnimation(GAME_CATALOG.length, { staggerDelay: 80 })
  const [platformRef, platformVisible] = useIntersectionObserver({ threshold: 0.2 })
  const [quickJoinRef, quickJoinVisible] = useIntersectionObserver({ threshold: 0.2 })

  useEffect(() => {
    getLocalIP().then(ip => setLocalIP(ip)).catch(() => {})
  }, [])

  const lanOrigin = localIP
    ? `http://${localIP}${window.location.port ? ':' + window.location.port : ''}`
    : null

  const copyLanUrl = () => {
    if (!lanOrigin) return
    navigator.clipboard.writeText(lanOrigin).catch(() => {})
    setIpCopied(true)
    setTimeout(() => setIpCopied(false), 2000)
  }

  return (
    <div
      className="flex flex-col min-h-[100svh] bg-theme-primary text-theme-primary font-theme relative overflow-hidden"
    >
      {/* Skip to content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[999] focus:px-4 focus:py-2 focus:bg-theme-accent focus:text-black focus:rounded focus:font-mono focus:text-sm"
      >
        Skip to content
      </a>

      {/* Sci-fi grid overlay */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `
            linear-gradient(var(--board-line-glow) 1px, transparent 1px),
            linear-gradient(90deg, var(--board-line-glow) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.5,
        }}
      />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header
        role="banner"
        className="relative z-10 flex justify-between items-center px-4 sm:px-8 py-3 sm:py-4 border-b border-theme bg-theme-secondary"
      >
        <div className="flex items-center gap-4">
          <div
            className="font-mono text-2xl text-theme-accent font-theme-display"
            style={{ letterSpacing: '0.3em' }}
          >
            TRUSTED GAMES
          </div>
          <div
            className="font-mono text-[10px] tracking-widest hidden md:block text-theme-muted"
          >
            v2026 · SECURE ARENA
          </div>
        </div>

        {/* Theme switcher */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={prevTheme}
            aria-label="Previous theme"
            className="text-sm text-theme-accent select-none px-1.5 py-1 cursor-pointer bg-transparent border-none"
          >‹</button>
          <div className="scroll-x-hidden flex gap-1 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch', maxWidth: 180 }}>
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                aria-label={`切换到${t.label}主题`}
                title={`${t.label} — ${t.desc}`}
                className="font-mono text-[11px] tracking-widest transition-all shrink-0 cursor-pointer"
                style={{
                  padding: '7px 10px',
                  border: theme === t.id
                    ? '1px solid var(--accent-primary)'
                    : '1px solid var(--border-color)',
                  color: theme === t.id
                    ? 'var(--accent-primary)'
                    : 'var(--text-muted)',
                  background: theme === t.id
                    ? 'color-mix(in srgb, var(--accent-primary) 12%, transparent)'
                    : 'transparent',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={nextTheme}
            aria-label="Next theme"
            className="text-sm text-theme-accent select-none px-1.5 py-1 cursor-pointer bg-transparent border-none"
          >›</button>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main id="main-content" role="main" className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-6 sm:py-12">

        {/* Title block - 带入场动画 */}
        <div 
          ref={titleRef}
          className={`text-center mb-12 transition-all duration-700 ${titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div
            className="font-mono font-bold tracking-[0.25em] mb-2 text-theme-primary font-theme-display"
            style={{
              fontSize: 'clamp(2rem, 5vw, 4rem)',
              textShadow: '0 0 20px var(--accent-primary), 0 0 40px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
            }}
          >
            GAME LOBBY
          </div>
          <div
            className="font-mono text-[11px] tracking-[0.4em] uppercase text-theme-muted"
            style={{ 
              opacity: titleVisible ? 1 : 0,
              transform: titleVisible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s',
            }}
          >
            SELECT YOUR BATTLE
          </div>
        </div>

        {/* Game card grid - 交错入场 */}
        <div
          ref={cardsRef}
          className="grid gap-3 sm:gap-4 w-full"
          style={{ maxWidth: '900px', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}
        >
          {GAME_CATALOG.map((game, index) => {
            const isInstalled = game.status === 'installed'
            return (
              <div
                key={game.id}
                role="button"
                tabIndex={isInstalled ? 0 : -1}
                aria-label={`${game.nameEn} - ${game.name} - ${game.description} - ${game.boardSize.width}×${game.boardSize.height}`}
                aria-disabled={!isInstalled}
                onClick={() => isInstalled && onSelectGame(game.id)}
                onKeyDown={e => { if (isInstalled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelectGame(game.id) }}}
                className="relative flex flex-col gap-2 sm:gap-3 p-3 sm:p-5 transition-all hover-lift gpu-accelerated bg-theme-surface border border-theme"
                style={{
                  cursor: isInstalled ? 'pointer' : 'not-allowed',
                  opacity: isInstalled ? 1 : 0.5,
                  ...getCardStyle(index),
                }}
                onMouseEnter={e => {
                  if (!isInstalled) return
                  const el = e.currentTarget
                  el.style.borderColor = 'var(--border-glow, var(--accent-primary))'
                  el.style.boxShadow = '0 0 16px color-mix(in srgb, var(--border-glow, var(--accent-primary)) 25%, transparent)'
                  el.style.backgroundColor = 'color-mix(in srgb, var(--accent-primary) 5%, var(--bg-surface))'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget
                  el.style.borderColor = 'var(--border-color)'
                  el.style.boxShadow = 'none'
                  el.style.backgroundColor = 'var(--bg-surface)'
                }}
              >
                {/* Coming soon overlay */}
                {!isInstalled && (
                  <div
                    className="absolute inset-0 flex items-center justify-center font-mono text-[10px] tracking-[0.3em] z-10 text-theme-muted"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--bg-primary) 60%, transparent)',
                      backdropFilter: 'blur(2px)',
                    }}
                  >
                    COMING SOON
                  </div>
                )}

                {/* Icon */}
                <div className="text-3xl leading-none">{game.icon}</div>

                {/* Names */}
                <div>
                  <div
                    className="font-mono font-bold text-xs sm:text-sm tracking-wider text-theme-primary font-theme-display"
                  >
                    {game.nameEn.toUpperCase()}
                  </div>
                  <div
                    className="font-mono text-xs mt-0.5 text-theme-secondary"
                  >
                    {game.name}
                  </div>
                </div>

                {/* Description */}
                <div
                  className="font-mono text-[11px] leading-relaxed text-theme-muted"
                >
                  {game.description}
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-theme">
                  <div
                    className="font-mono text-[9px] tracking-widest"
                    style={{ color: isInstalled ? 'var(--accent-success)' : 'var(--text-muted)' }}
                  >
                    {isInstalled ? '● READY' : '○ LOCKED'}
                  </div>
                  <div
                    className="font-mono text-[9px] text-theme-muted"
                  >
                    {game.boardSize.width}×{game.boardSize.height}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Platform entry - 带入场动画 */}
        <div 
          ref={platformRef}
          style={{ 
            marginTop: 24, 
            width: '100%', 
            maxWidth: '900px',
            opacity: platformVisible ? 1 : 0,
            transform: platformVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <button
            onClick={onOpenPlatform}
            className="w-full hover-lift px-6 py-4 bg-theme-surface border border-theme rounded-lg cursor-pointer font-theme text-theme-primary flex items-center justify-between transition-all"
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent-primary)'
              e.currentTarget.style.boxShadow = '0 0 16px color-mix(in srgb, var(--accent-primary) 20%, transparent)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-color)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div className="flex items-center gap-4 min-w-0">
              <span className="text-2xl shrink-0">🌐</span>
              <div className="text-left min-w-0 shrink">
                <div className="text-[13px] font-bold tracking-wider text-theme-accent">
                  ONLINE PLATFORM
                </div>
                <div className="text-[11px] text-theme-muted mt-0.5">
                  在线对弈平台 · 匹配对手 · 排行榜
                </div>
              </div>
            </div>
            <div className="text-xs text-theme-muted tracking-wide">
              进入 →
            </div>
          </button>
        </div>

        {/* Style Center entry */}
        <div 
          style={{ 
            marginTop: 12, 
            width: '100%', 
            maxWidth: '900px',
            opacity: platformVisible ? 1 : 0,
            transform: platformVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.5s ease 0.1s, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s',
          }}
        >
          <button
            onClick={() => navigate('/styles')}
            className="w-full hover-lift px-6 py-3.5 bg-theme-surface border border-theme rounded-lg cursor-pointer font-theme text-theme-primary flex items-center justify-between transition-all"
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent-primary)'
              e.currentTarget.style.boxShadow = '0 0 16px color-mix(in srgb, var(--accent-primary) 20%, transparent)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-color)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div className="flex items-center gap-4 min-w-0">
              <span className="text-2xl shrink-0">🎭</span>
              <div className="text-left min-w-0">
                <div className="text-xs font-bold tracking-wider text-theme-primary">
                  STYLE CENTER
                </div>
                <div className="text-[11px] text-theme-muted mt-0.5">
                  棋风中心 · 生成 / 导入 / 分享个人棋风
                </div>
              </div>
            </div>
            <div className="text-xs text-theme-muted tracking-wide">
              进入 →
            </div>
          </button>
        </div>

        {/* LAN IP banner - 带入场动画 */}
        {lanOrigin && (
          <div 
            ref={quickJoinRef}
            style={{
              marginTop: 24,
              maxWidth: 480,
              width: '100%',
              padding: '14px 20px',
              border: '1px solid var(--accent-primary)',
              borderRadius: 8,
              background: 'color-mix(in srgb, var(--accent-primary) 6%, var(--bg-surface))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              opacity: quickJoinVisible ? 1 : 0,
              transform: quickJoinVisible ? 'translateY(0) scale(1)' : 'translateY(15px) scale(0.98)',
              transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div>
              <div className="font-mono text-[10px] tracking-wider text-theme-accent mb-1">
                📡 局域网地址 · LAN ADDRESS
              </div>
              <div className="font-mono text-[15px] font-bold text-theme-primary tracking-wide">
                {lanOrigin}
              </div>
              <div className="font-mono text-[9px] text-theme-muted mt-0.5 tracking-wide">
                同一 WiFi / 热点设备打开此地址即可加入
              </div>
            </div>
            <button
              onClick={copyLanUrl}
              aria-label={ipCopied ? 'LAN address copied' : 'Copy LAN address'}
              className="transition-smooth shrink-0 px-4 py-2.5 rounded cursor-pointer font-mono text-[11px] tracking-wide"
              style={{
                background: ipCopied ? 'var(--accent-success, #2d6a4f)' : 'var(--bg-primary)',
                border: `1px solid ${ipCopied ? 'var(--accent-success, #2d6a4f)' : 'var(--accent-primary)'}`,
                color: ipCopied ? '#fff' : 'var(--accent-primary)',
              }}
            >
              {ipCopied ? '✓ 已复制' : '复制'}
            </button>
          </div>
        )}

        {/* Quick join room - 带入场动画 */}
        <div
          className="mt-4 p-5 px-6 border border-dashed border-theme rounded-lg text-center bg-theme-surface max-w-[480px] w-full"
          style={{
            opacity: quickJoinVisible ? 1 : 0,
            transform: quickJoinVisible ? 'translateY(0)' : 'translateY(15px)',
            transition: 'opacity 0.5s ease 0.15s, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.15s',
          }}
        >
          <label htmlFor="quick-join-input" className="text-[11px] text-theme-muted tracking-widest mb-3 font-theme block">
            QUICK JOIN — 已有邀请码？
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="quick-join-input"
              type="text"
              placeholder="粘贴邀请链接或房间码..."
              value={joinInput}
              onChange={e => setJoinInput(e.target.value)}
              aria-label="输入邀请链接或房间码"
              onKeyDown={e => {
                if (e.key === 'Enter' && joinInput.trim() && onQuickJoin) {
                  onQuickJoin(joinInput.trim())
                }
              }}
              className="flex-[1_1_200px] px-3 py-2 bg-theme-primary border border-theme rounded text-theme-primary font-theme text-xs outline-none"
            />
            <button
              onClick={() => {
                if (joinInput.trim() && onQuickJoin) onQuickJoin(joinInput.trim())
              }}
              className="px-4 py-2.5 rounded cursor-pointer font-theme text-xs font-bold tracking-wide"
              style={{
                background: 'var(--accent-primary)',
                color: '#000',
                border: 'none',
              }}
            >
              JOIN →
            </button>
          </div>
          {onImportGomoku && (
            <div className="mt-3.5">
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onImportGomoku(f)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                aria-label="导入五子棋棋谱 JSON 文件"
                className="w-full px-4 py-2.5 bg-transparent border border-dashed border-theme rounded text-theme-muted font-theme text-[11px] tracking-wider cursor-pointer"
              >
                导入五子棋棋谱（JSON）· 进入回放
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer
        role="contentinfo"
        className="relative z-10 flex justify-center items-center gap-4 sm:gap-6 px-4 sm:px-8 py-3 sm:py-4 border-t border-theme bg-theme-secondary"
      >
        {[
          { label: '无服务端', hidden: false },
          { label: '加密互证', hidden: false },
          { label: '本地存储', hidden: true },
        ].map(({ label, hidden }) => (
          <div
            key={label}
            className={`font-mono text-[10px] tracking-[0.2em] flex items-center gap-1.5 text-theme-muted${hidden ? ' hidden sm:flex' : ''}`}
          >
            <span className="text-theme-success">◆</span>
            {label}
          </div>
        ))}
      </footer>
    </div>
  )
}
