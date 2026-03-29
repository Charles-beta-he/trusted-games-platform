/**
 * 页面级 Suspense fallback
 * 在 chunk 下载期间全屏显示，风格跟随主题 CSS 变量
 */
export default function PageLoader() {
  return (
    <div style={{
      minHeight: '100svh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-muted)',
      fontFamily: 'monospace',
      fontSize: 12,
      letterSpacing: '0.2em',
    }}>
      LOADING...
    </div>
  )
}
