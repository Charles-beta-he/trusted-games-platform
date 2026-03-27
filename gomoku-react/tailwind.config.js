/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1a1008',
          light: '#3d2b1a',
          faint: '#6b4c2a',
        },
        paper: {
          DEFAULT: '#f5ede0',
          warm: '#ede0c8',
          dark: '#d4c4a8',
        },
        seal: {
          red: '#c0392b',
          gold: '#b8860b',
        },
        trust: {
          l1: '#2d6a4f',
          l2: '#52b788',
          l3: '#f0a500',
          l4: '#e07b39',
          l5: '#8b3a3a',
        },
        board: {
          wood: '#c8955c',
          line: '#7a5c3a',
        },
      },
      fontFamily: {
        'serif-sc': ['"Noto Serif SC"', 'serif'],
        calligraphy: ['"Ma Shan Zheng"', 'cursive'],
        mono: ['"Inconsolata"', 'monospace'],
      },
      keyframes: {
        'pulse-bar': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        thinking: {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.3' },
          '30%': { transform: 'translateY(-6px)', opacity: '1' },
        },
        'net-pulse': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(45,106,79,0.4)' },
          '50%': { opacity: '0.7', boxShadow: '0 0 0 4px rgba(45,106,79,0)' },
        },
        'victory-appear': {
          from: { transform: 'scale(0.5)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        'victory-spin': {
          from: { transform: 'scale(0) rotate(-180deg)' },
          to: { transform: 'scale(1) rotate(0deg)' },
        },
        flash: {
          '0%': { background: 'rgba(192,57,43,0.2)' },
          '100%': { background: 'transparent' },
        },
      },
      animation: {
        'pulse-bar': 'pulse-bar 1.2s ease-in-out infinite',
        thinking: 'thinking 1.2s ease-in-out infinite',
        'net-pulse': 'net-pulse 2s ease-in-out infinite',
        'victory-appear': 'victory-appear 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'victory-spin': 'victory-spin 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.2s forwards',
        flash: 'flash 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
}
