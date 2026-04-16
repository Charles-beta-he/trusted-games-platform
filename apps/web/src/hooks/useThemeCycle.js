import { useTheme } from '../contexts/ThemeContext.jsx'
import { useCallback, useMemo } from 'react'

/**
 * Shared hook for theme cycling UI (prev/next buttons + theme grid).
 * Consolidates duplicated theme-cycling logic from ModeSelect, GameLobby, PlatformView.
 */
export default function useThemeCycle() {
  const { theme, themes, setTheme } = useTheme()
  const currentThemeIndex = useMemo(() => themes.findIndex(t => t.id === theme), [themes, theme])

  const prevTheme = useCallback(() => {
    const idx = (currentThemeIndex - 1 + themes.length) % themes.length
    setTheme(themes[idx].id)
  }, [currentThemeIndex, themes, setTheme])

  const nextTheme = useCallback(() => {
    const idx = (currentThemeIndex + 1) % themes.length
    setTheme(themes[idx].id)
  }, [currentThemeIndex, themes, setTheme])

  return { theme, themes, setTheme, currentThemeIndex, prevTheme, nextTheme }
}
