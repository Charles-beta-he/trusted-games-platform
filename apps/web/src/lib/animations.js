/**
 * 动效工具库 - 参考 Lusion.co 的动效实现方案
 * 提供高性能的动画辅助函数和缓动曲线
 */

// ─── 缓动曲线（参考 Lusion.co 使用的 cubic-bezier）──────────────────────────
export const easings = {
  // 弹跳效果 - 用于落子
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  // 平滑进入 - 用于元素入场
  smoothIn: 'cubic-bezier(0.4, 0, 0.2, 1)',
  // 平滑退出 - 用于元素退场
  smoothOut: 'cubic-bezier(0, 0, 0.2, 1)',
  // 弹性效果 - 用于强调
  elastic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  // 快速进入 - 用于微交互
  snappy: 'cubic-bezier(0.2, 0, 0, 1)',
}

// ─── 动画持续时间 ─────────────────────────────────────────────────────────────
export const durations = {
  instant: 100,
  fast: 150,
  normal: 250,
  slow: 400,
  slower: 600,
}

// ─── RAF 驱动的动画函数（参考 Lusion.co 的 requestAnimationFrame 方案）────────
export function animate({
  from,
  to,
  duration = durations.normal,
  easing = easings.smoothIn,
  onUpdate,
  onComplete,
}) {
  let startTime = null
  let rafId = null

  // 解析缓动函数
  const easeFn = parseEasing(easing)

  function step(timestamp) {
    if (!startTime) startTime = timestamp
    const elapsed = timestamp - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easedProgress = easeFn(progress)

    // 计算当前值
    const current = from + (to - from) * easedProgress
    onUpdate?.(current, progress)

    if (progress < 1) {
      rafId = requestAnimationFrame(step)
    } else {
      onComplete?.()
    }
  }

  rafId = requestAnimationFrame(step)

  // 返回取消函数
  return () => {
    if (rafId) cancelAnimationFrame(rafId)
  }
}

// ─── 解析 cubic-bezier 缓动函数 ──────────────────────────────────────────────
function parseEasing(easingString) {
  // 预设缓动函数
  const presets = {
    'cubic-bezier(0.34, 1.56, 0.64, 1)': (t) => {
      // bounce
      const c4 = (2 * Math.PI) / 3
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
    },
    'cubic-bezier(0.4, 0, 0.2, 1)': (t) => t * t * (3 - 2 * t), // smoothIn (smoothstep)
    'cubic-bezier(0, 0, 0.2, 1)': (t) => 1 - Math.pow(1 - t, 3), // smoothOut
    'cubic-bezier(0.68, -0.55, 0.265, 1.55)': (t) => {
      // elastic
      const c4 = (2 * Math.PI) / 4.5
      return t === 0 ? 0 : t === 1 ? 1 : t < 0.5
        ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c4)) / 2
        : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c4)) / 2 + 1
    },
    'cubic-bezier(0.2, 0, 0, 1)': (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, // snappy
  }

  return presets[easingString] || ((t) => t) // 默认线性
}

// ─── 交错动画（Stagger）- 参考 Lusion.co 的卡片入场效果 ─────────────────────
export function stagger({
  items,
  delayBetween = 50,
  animationConfig,
}) {
  const cancelFns = []

  items.forEach((item, index) => {
    const timeoutId = setTimeout(() => {
      const cancel = animate({
        ...animationConfig,
        onUpdate: (value, progress) => {
          animationConfig.onUpdate?.(item, value, progress, index)
        },
        onComplete: () => {
          animationConfig.onComplete?.(item, index)
        },
      })
      cancelFns.push(cancel)
    }, index * delayBetween)
    cancelFns.push(() => clearTimeout(timeoutId))
  })

  // 返回取消所有动画的函数
  return () => cancelFns.forEach((cancel) => cancel?.())
}

// ─── 弹簧物理动画（参考 Lusion.co 的物理动效）──────────────────────────────
export function spring({
  from,
  to,
  stiffness = 100,
  damping = 10,
  mass = 1,
  onUpdate,
  onComplete,
  threshold = 0.01,
}) {
  let position = from
  let velocity = 0
  let rafId = null
  let lastTime = null

  function step(timestamp) {
    if (!lastTime) lastTime = timestamp
    const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.064) // 限制最大 delta
    lastTime = timestamp

    // 弹簧物理计算
    const displacement = position - to
    const springForce = -stiffness * displacement
    const dampingForce = -damping * velocity
    const acceleration = (springForce + dampingForce) / mass

    velocity += acceleration * deltaTime
    position += velocity * deltaTime

    onUpdate?.(position)

    // 检查是否停止
    if (Math.abs(velocity) < threshold && Math.abs(displacement) < threshold) {
      position = to
      onUpdate?.(position)
      onComplete?.()
    } else {
      rafId = requestAnimationFrame(step)
    }
  }

  rafId = requestAnimationFrame(step)

  return () => {
    if (rafId) cancelAnimationFrame(rafId)
  }
}

// ─── 序列动画（Sequence）─────────────────────────────────────────────────────
export function sequence(animations) {
  let currentIndex = 0
  let cancelFn = null

  function runNext() {
    if (currentIndex >= animations.length) return

    const config = animations[currentIndex]
    cancelFn = animate({
      ...config,
      onComplete: () => {
        currentIndex++
        config.onComplete?.()
        runNext()
      },
    })
  }

  runNext()

  return () => cancelFn?.()
}

// ─── 粒子效果生成器（参考 Lusion.co 的视觉效果）────────────────────────────
export function createParticles(container, {
  count = 20,
  colors = ['var(--accent-primary)', 'var(--accent-secondary)'],
  sizeRange = [2, 6],
  duration = 1000,
  spread = 100,
}) {
  const particles = []

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div')
    const size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0])
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
    const distance = spread * (0.5 + Math.random() * 0.5)
    const color = colors[Math.floor(Math.random() * colors.length)]

    Object.assign(particle.style, {
      position: 'absolute',
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      backgroundColor: color,
      pointerEvents: 'none',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      opacity: '1',
      transition: `all ${duration}ms ${easings.smoothOut}`,
    })

    container.appendChild(particle)
    particles.push({ element: particle, angle, distance })
  }

  // 触发动画
  requestAnimationFrame(() => {
    particles.forEach(({ element, angle, distance }) => {
      const x = Math.cos(angle) * distance
      const y = Math.sin(angle) * distance
      element.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
      element.style.opacity = '0'
    })
  })

  // 清理
  setTimeout(() => {
    particles.forEach(({ element }) => element.remove())
  }, duration + 100)
}

// ─── Canvas 动画辅助 ─────────────────────────────────────────────────────────
export const canvasAnimations = {
  // 绘制带动画的棋子
  drawStone(ctx, x, y, radius, color, progress = 1, glowColor = null) {
    const eased = 1 - Math.pow(1 - progress, 3) // easeOut
    const currentRadius = radius * eased
    const alpha = eased

    ctx.save()
    ctx.globalAlpha = alpha

    // 发光效果（参考 Lusion.co 的 glow 效果）
    if (glowColor && progress > 0.8) {
      const glowAlpha = (progress - 0.8) * 5 * 0.3
      ctx.shadowColor = glowColor
      ctx.shadowBlur = 15 * glowAlpha
    }

    // 棋子渐变
    const gradient = ctx.createRadialGradient(
      x - currentRadius * 0.3,
      y - currentRadius * 0.3,
      0,
      x,
      y,
      currentRadius
    )

    if (color === 'black') {
      gradient.addColorStop(0, '#4a4a4a')
      gradient.addColorStop(0.7, '#1a1a1a')
      gradient.addColorStop(1, '#0a0a0a')
    } else {
      gradient.addColorStop(0, '#ffffff')
      gradient.addColorStop(0.7, '#e8e0d4')
      gradient.addColorStop(1, '#c8c0b4')
    }

    ctx.beginPath()
    ctx.arc(x, y, currentRadius, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()

    // 高光
    const highlightGradient = ctx.createRadialGradient(
      x - currentRadius * 0.3,
      y - currentRadius * 0.4,
      0,
      x - currentRadius * 0.3,
      y - currentRadius * 0.4,
      currentRadius * 0.5
    )
    highlightGradient.addColorStop(0, 'rgba(255,255,255,0.4)')
    highlightGradient.addColorStop(1, 'rgba(255,255,255,0)')

    ctx.beginPath()
    ctx.arc(x, y, currentRadius, 0, Math.PI * 2)
    ctx.fillStyle = highlightGradient
    ctx.fill()

    ctx.restore()
  },

  // 绘制胜利线动画
  drawWinningLine(ctx, points, progress = 1, color = 'var(--accent-primary)') {
    if (points.length < 2) return

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.shadowColor = color
    ctx.shadowBlur = 10

    // 绘制渐进的线段
    const totalLength = points.length - 1
    const currentLength = totalLength * progress

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)

    for (let i = 1; i <= Math.floor(currentLength); i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }

    // 绘制部分线段
    const partialIndex = Math.floor(currentLength)
    if (partialIndex < totalLength) {
      const partialProgress = currentLength - partialIndex
      const start = points[partialIndex]
      const end = points[partialIndex + 1]
      const x = start.x + (end.x - start.x) * partialProgress
      const y = start.y + (end.y - start.y) * partialProgress
      ctx.lineTo(x, y)
    }

    ctx.stroke()
    ctx.restore()
  },
}
