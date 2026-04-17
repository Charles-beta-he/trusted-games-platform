import { createContext, useContext, useState, useEffect, useCallback } from 'react'

export const THEMES = [
  { id: 'sci-fi',       label: 'SCI-FI',  icon: '🚀', desc: 'Deep Space' },
  { id: 'classic-wood', label: 'CLASSIC', icon: '♟',  desc: 'Wood Board' },
  { id: 'neon-cyber',   label: 'CYBER',   icon: '⚡', desc: 'Neon City'  },
  { id: 'minimal-dark', label: 'MINIMAL', icon: '◼',  desc: 'Dark Mode'  },
]

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('tg-theme') || 'sci-fi')
  const [animationsEnabled, setAnimationsEnabled] = useState(() => {
    const saved = localStorage.getItem('tg-animations')
    return saved !== 'false' // default: true
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('tg-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-animations',
      animationsEnabled ? 'on' : 'off',
    )
    localStorage.setItem('tg-animations', String(animationsEnabled))
  }, [animationsEnabled])

  const toggleAnimations = useCallback(() => {
    setAnimationsEnabled(prev => !prev)
  }, [])

  return (
    <ThemeContext.Provider value={{
      theme, setTheme, themes: THEMES,
      animationsEnabled, toggleAnimations,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
