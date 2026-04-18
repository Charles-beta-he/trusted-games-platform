/**
 * FPS 监控器
 * 使用 requestAnimationFrame 计算帧率
 */

class FPSMonitor {
  constructor() {
    this.frames = 0
    this.lastTime = performance.now()
    this.fps = 60
    this.running = false
    this.rafId = null
    this.onLowFPS = null
    this.threshold = 30
  }

  start(onLowFPS, threshold = 30) {
    if (this.running) return
    this.running = true
    this.onLowFPS = onLowFPS
    this.threshold = threshold
    this.lastTime = performance.now()
    this.loop()
  }

  stop() {
    this.running = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  loop() {
    if (!this.running) return
    this.frames++
    const now = performance.now()
    if (now >= this.lastTime + 1000) {
      this.fps = Math.round((this.frames * 1000) / (now - this.lastTime))
      this.frames = 0
      this.lastTime = now
      if (this.fps < this.threshold && this.onLowFPS) {
        this.onLowFPS(this.fps)
      }
    }
    this.rafId = requestAnimationFrame(() => this.loop())
  }

  getFPS() {
    return this.fps
  }

  isRunning() {
    return this.running
  }
}

export const fpsMonitor = new FPSMonitor()
export default fpsMonitor
