import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { GAME_CATALOG } from '../plugins/index.js'
import { useTheme } from '../contexts/ThemeContext.jsx'
import { getLocalIP } from '../lib/lanIp.js'

export default function GameLobby({ onSelectGame, onQuickJoin, onOpenPlatform, onImportGomoku }) {
  const navigate = useNavigate()
  const { theme, setTheme, themes } = useTheme()
  const [joinInput, setJoinInput] = useState('')
  const [localIP, setLocalIP] = useState(null)
  const [ipCopied, setIpCopied] = useState(false)
  const importInputRef = useRef(null)

  const currentThemeIndex = themes.findIndex(t => t.id === theme)
  const prevTheme = () => {
    const idx = (currentThemeIndex - 1 + themes.length) % themes.length
    setTheme(themes[idx].id)
  }
  const nextTheme = () => {
    const idx = (currentThemeIndex + 1) % themes.length
    setTheme(themes[idx].id)
  }

  useEffect(() => {
    getLocalIP().then(ip => setLocalIP(ip))
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
      className="flex flex-col"
      style={{
        minHeight: '100svh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-primary)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
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
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header
        className="relative z-10 flex justify-between items-center px-8 py-4"
        style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="font-mono tracking-[8px] text-2xl"
            style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.3em' }}
          >
            TRUSTED GAMES
          </div>
          <div
            className="font-mono text-[10px] tracking-widest hidden md:block"
            style={{ color: 'var(--text-muted)' }}
          >
            v2026 · SECURE ARENA
          </div>
        </div>

        {/* Theme switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <span
            onClick={prevTheme}
            style={{ fontSize: 14, color: 'var(--accent-primary)', userSelect: 'none', padding: '4px 6px', cursor: 'pointer' }}
          >‹</span>
          <div className="scroll-x-hidden" style={{ display: 'flex', gap: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: 180 }}>
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                title={`${t.label} — ${t.desc}`}
                className="font-mono text-[11px] tracking-widest transition-all"
                style={{
                  padding: '7px 10px',
                  flexShrink: 0,
                  border: theme === t.id
                    ? '1px solid var(--accent-primary)'
                    : '1px solid var(--border-color)',
                  color: theme === t.id
                    ? 'var(--accent-primary)'
                    : 'var(--text-muted)',
                  background: theme === t.id
                    ? 'color-mix(in srgb, var(--accent-primary) 12%, transparent)'
                    : 'transparent',
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span
            onClick={nextTheme}
            style={{ fontSize: 14, color: 'var(--accent-primary)', userSelect: 'none', padding: '4px 6px', cursor: 'pointer' }}
          >›</span>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 py-12">

        {/* Title block */}
        <div className="text-center mb-12">
          <div
            className="font-mono font-bold tracking-[0.25em] mb-2"
            style={{
              fontSize: 'clamp(2rem, 5vw, 4rem)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              textShadow: '0 0 20px var(--accent-primary), 0 0 40px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
            }}
          >
            GAME LOBBY
          </div>
          <div
            className="font-mono text-[11px] tracking-[0.4em] uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            SELECT YOUR BATTLE
          </div>
        </div>

        {/* Game card grid */}
        <div
          className="grid gap-4 w-full"
          style={{ maxWidth: '900px', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
        >
          {GAME_CATALOG.map((game) => {
            const isInstalled = game.status === 'installed'
            return (
              <div
                key={game.id}
                onClick={() => isInstalled && onSelectGame(game.id)}
                className="relative flex flex-col gap-3 p-5 transition-all"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  cursor: isInstalled ? 'pointer' : 'not-allowed',
                  opacity: isInstalled ? 1 : 0.5,
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
                    className="absolute inset-0 flex items-center justify-center font-mono text-[10px] tracking-[0.3em] z-10"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--bg-primary) 60%, transparent)',
                      color: 'var(--text-muted)',
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
                    className="font-mono font-bold text-sm tracking-wider"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                  >
                    {game.nameEn.toUpperCase()}
                  </div>
                  <div
                    className="font-mono text-xs mt-0.5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {game.name}
                  </div>
                </div>

                {/* Description */}
                <div
                  className="font-mono text-[11px] leading-relaxed"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {game.description}
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <div
                    className="font-mono text-[9px] tracking-widest"
                    style={{ color: isInstalled ? 'var(--accent-success)' : 'var(--text-muted)' }}
                  >
                    {isInstalled ? '● READY' : '○ LOCKED'}
                  </div>
                  <div
                    className="font-mono text-[9px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {game.boardSize.width}×{game.boardSize.height}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Platform entry */}
        <div style={{ marginTop: 24, width: '100%', maxWidth: '900px' }}>
          <button
            onClick={onOpenPlatform}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'var(--font-primary)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent-primary)'
              e.currentTarget.style.boxShadow = '0 0 16px color-mix(in srgb, var(--accent-primary) 20%, transparent)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-color)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>🌐</span>
              <div style={{ textAlign: 'left', minWidth: 0, flexShrink: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 'bold', letterSpacing: '0.15em', color: 'var(--accent-primary)' }}>
                  ONLINE PLATFORM
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  在线对弈平台 · 匹配对手 · 排行榜
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
              进入 →
            </div>
          </button>
        </div>

        {/* Style Center entry */}
        <div style={{ marginTop: 12, width: '100%', maxWidth: '900px' }}>
          <button
            onClick={() => navigate('/styles')}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'var(--font-primary)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent-primary)'
              e.currentTarget.style.boxShadow = '0 0 16px color-mix(in srgb, var(--accent-primary) 20%, transparent)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-color)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>🎭</span>
              <div style={{ textAlign: 'left', minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 'bold', letterSpacing: '0.15em', color: 'var(--text-primary)' }}>
                  STYLE CENTER
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  棋风中心 · 生成 / 导入 / 分享个人棋风
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
              进入 →
            </div>
          </button>
        </div>

        {/* LAN IP banner */}
        {lanOrigin && (
          <div style={{
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
          }}>
            <div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: 10,
                letterSpacing: '0.2em',
                color: 'var(--accent-primary)',
                marginBottom: 4,
              }}>
                📡 局域网地址 · LAN ADDRESS
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: 15,
                fontWeight: 'bold',
                color: 'var(--text-primary)',
                letterSpacing: '0.05em',
              }}>
                {lanOrigin}
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: 9,
                color: 'var(--text-muted)',
                marginTop: 3,
                letterSpacing: '0.1em',
              }}>
                同一 WiFi / 热点设备打开此地址即可加入
              </div>
            </div>
            <button
              onClick={copyLanUrl}
              style={{
                flexShrink: 0,
                padding: '10px 16px',
                background: ipCopied ? 'var(--accent-success, #2d6a4f)' : 'var(--bg-primary)',
                border: `1px solid ${ipCopied ? 'var(--accent-success, #2d6a4f)' : 'var(--accent-primary)'}`,
                borderRadius: 4,
                color: ipCopied ? '#fff' : 'var(--accent-primary)',
                fontFamily: 'monospace',
                fontSize: 11,
                cursor: 'pointer',
                letterSpacing: '0.1em',
                transition: 'all 0.2s',
              }}
            >
              {ipCopied ? '✓ 已复制' : '复制'}
            </button>
          </div>
        )}

        {/* Quick join room */}
        <div style={{
          marginTop: 16,
          padding: '20px 24px',
          border: '1px dashed var(--border-color)',
          borderRadius: 8,
          textAlign: 'center',
          background: 'var(--bg-surface)',
          maxWidth: 480,
          width: '100%',
        }}>
          <div style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            letterSpacing: '0.2em',
            marginBottom: 12,
            fontFamily: 'var(--font-primary)',
          }}>
            QUICK JOIN — 已有邀请码？
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <input
              type="text"
              placeholder="粘贴邀请链接或房间码..."
              value={joinInput}
              onChange={e => setJoinInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && joinInput.trim() && onQuickJoin) {
                  onQuickJoin(joinInput.trim())
                }
              }}
              style={{
                flex: '1 1 200px',
                padding: '8px 12px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 4,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-primary)',
                fontSize: 12,
                outline: 'none',
              }}
            />
            <button
              onClick={() => {
                if (joinInput.trim() && onQuickJoin) onQuickJoin(joinInput.trim())
              }}
              style={{
                padding: '10px 16px',
                background: 'var(--accent-primary)',
                color: '#000',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'var(--font-primary)',
                fontSize: 12,
                fontWeight: 'bold',
                letterSpacing: '0.05em',
              }}
            >
              JOIN →
            </button>
          </div>
          {onImportGomoku && (
            <div style={{ marginTop: 14 }}>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onImportGomoku(f)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 4,
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-primary)',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  cursor: 'pointer',
                }}
              >
                导入五子棋棋谱（JSON）· 进入回放
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer
        className="relative z-10 flex justify-center items-center gap-6 px-8 py-4"
        style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
      >
        {[
          { label: '无服务端', hidden: false },
          { label: '加密互证', hidden: false },
          { label: '本地存储', hidden: true },
        ].map(({ label, hidden }) => (
          <div
            key={label}
            className={`font-mono text-[10px] tracking-[0.2em] flex items-center gap-1.5${hidden ? ' hidden sm:flex' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          >
            <span style={{ color: 'var(--accent-success)' }}>◆</span>
            {label}
          </div>
        ))}
      </footer>
    </div>
  )
}
