import { useState } from 'react'
import { GAME_CATALOG } from '../plugins/index.js'
import { useTheme } from '../contexts/ThemeContext.jsx'

export default function GameLobby({ onSelectGame, onQuickJoin }) {
  const { theme, setTheme, themes } = useTheme()
  const [joinInput, setJoinInput] = useState('')

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
        <div className="flex items-center gap-1">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              title={`${t.label} — ${t.desc}`}
              className="font-mono text-[9px] tracking-widest px-2 py-1.5 transition-all"
              style={{
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
          style={{ maxWidth: '900px', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
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

        {/* Quick join room */}
        <div style={{
          marginTop: 32,
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
          <div style={{ display: 'flex', gap: 8 }}>
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
                flex: 1,
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
                padding: '8px 16px',
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
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer
        className="relative z-10 flex justify-center items-center gap-6 px-8 py-4"
        style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
      >
        {['无服务端', '加密互证', '本地存储'].map((item) => (
          <div
            key={item}
            className="font-mono text-[10px] tracking-[0.2em] flex items-center gap-1.5"
            style={{ color: 'var(--text-muted)' }}
          >
            <span style={{ color: 'var(--accent-success)' }}>◆</span>
            {item}
          </div>
        ))}
      </footer>
    </div>
  )
}
