import { createContext, useContext, useState, useEffect } from 'react'

export const THEMES = [
  { id: 'sci-fi',       label: 'SCI-FI',  icon: '🚀', desc: 'Deep Space' },
  { id: 'classic-wood', label: 'CLASSIC', icon: '♟',  desc: 'Wood Board' },
  { id: 'neon-cyber',   label: 'CYBER',   icon: '⚡', desc: 'Neon City'  },
  { id: 'minimal-dark', label: 'MINIMAL', icon: '◼',  desc: 'Dark Mode'  },
]

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('tg-theme') || 'sci-fi')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('tg-theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
