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
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center font-mono text-text-muted bg-bg-primary">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg text-text-primary mb-2">
            出错了
          </h2>
          <p className="text-sm max-w-sm leading-relaxed mb-6">
            页面渲染时发生错误。请尝试刷新。
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded cursor-pointer bg-accent text-black font-inherit text-sm border-none"
          >
            刷新页面
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
