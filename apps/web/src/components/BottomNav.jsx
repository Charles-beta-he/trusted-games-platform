import { useNavigate, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  {
    id: 'home',
    label: '首页',
    path: '/',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8 6 4 10 4 14a8 8 0 1 0 16 0c0-4-4-8-8-12z" />
      </svg>
    ),
  },
  {
    id: 'discover',
    label: '发现',
    path: '/discover',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    ),
  },
  {
    id: 'chat',
    label: '消息',
    path: '/platform',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: '我的',
    path: '/styles',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

export default function BottomNav({ active }) {
  const navigate = useNavigate()
  const location = useLocation()

  // 如果没有传入 active，则根据当前路径推断
  const currentPath = location.pathname
  const activeId = active || NAV_ITEMS.find(item => {
    if (item.path === '/') return currentPath === '/'
    return currentPath.startsWith(item.path)
  })?.id || 'home'

  return (
    <nav
      role="navigation"
      aria-label="主导航"
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around bg-theme-surface border-t border-theme"
      style={{ height: 56, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeId === item.id
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full cursor-pointer bg-transparent border-none transition-all"
            style={{
              color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
            }}
          >
            <span className="transition-transform" style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)' }}>
              {item.icon}
            </span>
            <span className="font-theme text-[10px] tracking-wider">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
