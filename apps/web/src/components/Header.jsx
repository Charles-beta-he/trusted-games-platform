import { useTheme } from '../contexts/ThemeContext.jsx'

export default function Header({ moveCount, gameId, onBackToLobby }) {
  const { theme, setTheme, themes, animationsEnabled, toggleAnimations } = useTheme()

  return (
    <header
      className="flex justify-between items-center px-6 py-3 relative z-10 border-b border-theme bg-theme-secondary"
    >
      {/* Left: title + back button */}
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
        <div
          className="font-mono text-xl tracking-[4px] text-theme-primary font-theme-display"
        >
          五子棋
        </div>
        <div
          className="font-mono text-[11px] tracking-widest hidden sm:block text-theme-muted"
        >
          GOMOKU
        </div>
      </div>

      {/* Center: move count */}
      <div className="font-mono text-[13px] tracking-wide text-theme-secondary">
        第 <span className="text-theme-primary font-semibold">{moveCount}</span> 手
      </div>

      {/* Right: theme switcher + animation toggle + game id */}
      <div className="flex items-center gap-3">
        {/* Theme buttons */}
        <div className="flex items-center gap-1">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              title={`${t.label} — ${t.desc}`}
              className="font-mono text-[9px] tracking-widest px-2 py-1 transition-all cursor-pointer"
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
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Animation toggle */}
        <button
          onClick={toggleAnimations}
          title={animationsEnabled ? '动效: 开启' : '动效: 关闭'}
          className="font-mono text-[9px] tracking-widest px-2 py-1 transition-all border border-theme bg-transparent cursor-pointer"
          style={{
            color: animationsEnabled ? 'var(--accent-primary)' : 'var(--text-muted)',
          }}
        >
          {animationsEnabled ? '✦' : '○'}
        </button>

        {/* Game ID badge — truncated to 8 chars, full value in tooltip */}
        <div
          className="font-mono text-[10px] hidden lg:block text-theme-muted"
          title={gameId ? gameId.toUpperCase() : ''}
        >
          {gameId && gameId.substring(0, 8).toUpperCase()}…
        </div>
        <div
          className="px-3 py-1.5 font-mono text-xs leading-none select-none border border-theme-accent text-theme-accent font-theme-display"
        >
          印
        </div>
      </div>
    </header>
  )
}
