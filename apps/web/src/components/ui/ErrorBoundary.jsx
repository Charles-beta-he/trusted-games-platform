import { Component } from 'react'

/**
 * ErrorBoundary — catches render errors and shows a friendly fallback
 * instead of a white screen of death.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: 24, textAlign: 'center',
          fontFamily: 'var(--font-primary, monospace)', color: 'var(--text-muted, #999)',
          background: 'var(--bg-primary, #050a14)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 18, color: 'var(--text-primary, #fff)', marginBottom: 8 }}>
            出错了
          </h2>
          <p style={{ fontSize: 13, maxWidth: 400, lineHeight: 1.6, marginBottom: 24 }}>
            页面渲染时发生错误。请尝试刷新。
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 24px', borderRadius: 4, cursor: 'pointer',
              background: 'var(--accent-primary, #00d4ff)', color: '#000',
              border: 'none', fontFamily: 'inherit', fontSize: 13,
            }}
          >
            刷新页面
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
