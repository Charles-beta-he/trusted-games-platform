import { useEffect, useRef } from 'react'
import { fpsMonitor } from '../lib/performance/fpsMonitor.js'
import { memoryMonitor } from '../lib/performance/memoryMonitor.js'

/**
 * 性能监控 Hook
 * 开发环境自动启动，监控 FPS 和内存
 */
export function usePerformanceMonitor({
  enabled = process.env.NODE_ENV === 'development',
  fpsThreshold = 30,
  logInterval = 10000,
} = {}) {
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!enabled) return

    // 启动 FPS 监控
    fpsMonitor.start((fps) => {
      console.warn(`[Performance] Low FPS detected: ${fps}`)
    }, fpsThreshold)

    // 定期输出性能数据
    intervalRef.current = setInterval(() => {
      const fps = fpsMonitor.getFPS()
      const memory = memoryMonitor.getFormattedMemoryInfo()

      console.log(
        `%c[Performance] FPS: ${fps}` +
        (memory.supported ? ` | Memory: ${memory.usedMB}MB / ${memory.limitMB}MB` : ''),
        'color: #00d4ff; font-weight: bold'
      )

      if (memoryMonitor.isWarning()) {
        console.warn('[Performance] Memory usage warning:', memory)
      }
    }, logInterval)

    return () => {
      fpsMonitor.stop()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, fpsThreshold, logInterval])

  return {
    getFPS: () => fpsMonitor.getFPS(),
    getMemory: () => memoryMonitor.getFormattedMemoryInfo(),
    fpsMonitor,
    memoryMonitor
  }
}

export default usePerformanceMonitor
