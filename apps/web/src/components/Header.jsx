import { useTheme } from '../contexts/ThemeContext.jsx'

export default function Header({ moveCount, gameId, onBackToLobby }) {
  const { theme, setTheme, themes } = useTheme()

  return (
    <header
      className="flex justify-between items-center px-6 py-3 relative z-10"
      style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
    >
      {/* Left: title + back button */}
      <div className="flex items-center gap-4">
        {onBackToLobby && (
          <button
            onClick={onBackToLobby}
            className="font-mono text-[11px] tracking-widest px-2 py-1 transition-all"
            style={{
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              background: 'transparent',
            }}
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
        <div
          className="font-mono text-xl tracking-[4px]"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          五子棋
        </div>
        <div
          className="font-mono text-[11px] tracking-widest hidden sm:block"
          style={{ color: 'var(--text-muted)' }}
        >
          GOMOKU
        </div>
      </div>

      {/* Center: move count */}
      <div className="font-mono text-[13px] tracking-wide" style={{ color: 'var(--text-secondary)' }}>
        第 <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{moveCount}</span> 手
      </div>

      {/* Right: theme switcher + game id */}
      <div className="flex items-center gap-3">
        {/* Theme buttons */}
        <div className="flex items-center gap-1">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              title={`${t.label} — ${t.desc}`}
              className="font-mono text-[9px] tracking-widest px-2 py-1 transition-all"
              style={{
                border: theme === t.id
                  ? '1px solid var(--accent-primary)'
                  : '1px solid var(--border-color)',
                color: theme === t.id
                  ? 'var(--accent-primary)'
                  : 'var(--text-muted)',
                background: theme === t.id
                  ? 'color-mix(in srgb, var(--accent-primary) 10%, transparent)'
                  : 'transparent',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Game ID badge — truncated to 8 chars, full value in tooltip */}
        <div
          className="font-mono text-[10px] hidden lg:block"
          style={{ color: 'var(--text-muted)', cursor: 'default' }}
          title={gameId ? gameId.toUpperCase() : ''}
        >
          {gameId && gameId.substring(0, 8).toUpperCase()}…
        </div>
        <div
          className="px-3 py-1.5 font-mono text-xs leading-none select-none"
          style={{
            border: '1px solid var(--accent-primary)',
            color: 'var(--accent-primary)',
            fontFamily: 'var(--font-display)',
          }}
        >
          印
        </div>
      </div>
    </header>
  )
}
