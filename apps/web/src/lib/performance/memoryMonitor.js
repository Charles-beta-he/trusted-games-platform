/**
 * 内存监控器
 * 使用 performance.memory API (Chrome)
 */

class MemoryMonitor {
  constructor() {
    this.warningThreshold = 50 * 1024 * 1024 // 50MB
    this.criticalThreshold = 100 * 1024 * 1024 // 100MB
  }

  getMemoryInfo() {
    if (!performance.memory) {
      return { supported: false }
    }
    return {
      supported: true,
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    }
  }

  getFormattedMemoryInfo() {
    const info = this.getMemoryInfo()
    if (!info.supported) return { supported: false }
    return {
      ...info,
      usedMB: (info.usedJSHeapSize / 1024 / 1024).toFixed(1),
      totalMB: (info.totalJSHeapSize / 1024 / 1024).toFixed(1),
      limitMB: (info.jsHeapSizeLimit / 1024 / 1024).toFixed(1)
    }
  }

  getUsagePercent() {
    const info = this.getMemoryInfo()
    if (!info.supported) return 0
    return (info.usedJSHeapSize / info.jsHeapSizeLimit) * 100
  }

  isWarning() {
    const info = this.getMemoryInfo()
    return info.supported && info.usedJSHeapSize > this.warningThreshold
  }

  isCritical() {
    const info = this.getMemoryInfo()
    return info.supported && info.usedJSHeapSize > this.criticalThreshold
  }
}

export const memoryMonitor = new MemoryMonitor()
export default memoryMonitor
