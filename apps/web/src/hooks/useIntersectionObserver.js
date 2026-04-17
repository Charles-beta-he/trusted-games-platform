import { useEffect, useRef, useState } from 'react'

/**
 * Intersection Observer Hook
 * 参考 Lusion.co 的滚动触发动画实现
 * 
 * @param {Object} options - IntersectionObserver 选项
 * @param {number} options.threshold - 可见比例阈值 (0-1)
 * @param {string} options.rootMargin - 根元素边距
 * @param {boolean} options.triggerOnce - 是否只触发一次
 * @returns {[ref, isVisible]} - ref 绑定元素，isVisible 是否可见
 */
export function useIntersectionObserver({
  threshold = 0.1,
  rootMargin = '0px',
  triggerOnce = true,
} = {}) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (triggerOnce) {
            observer.unobserve(element)
          }
        } else if (!triggerOnce) {
          setIsVisible(false)
        }
      },
      {
        threshold,
        rootMargin,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold, rootMargin, triggerOnce])

  return [ref, isVisible]
}

/**
 * 交错动画 Hook
 * 为列表元素添加交错入场效果
 * 
 * @param {number} count - 元素数量
 * @param {Object} options - 配置选项
 * @param {number} options.baseDelay - 基础延迟 (ms)
 * @param {number} options.staggerDelay - 交错延迟 (ms)
 * @returns {[containerRef, getItemStyle]} - 容器 ref 和获取子元素样式的函数
 */
export function useStaggerAnimation(count, {
  baseDelay = 0,
  staggerDelay = 50,
} = {}) {
  const [containerRef, isVisible] = useIntersectionObserver({ threshold: 0.1 })

  const getItemStyle = (index) => ({
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
    transition: `opacity 0.4s ease ${baseDelay + index * staggerDelay}ms, transform 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${baseDelay + index * staggerDelay}ms`,
  })

  return [containerRef, getItemStyle, isVisible]
}

export default useIntersectionObserver
