# gomoku-react 动效优化方案

## 概述

参考 [Lusion.co](https://lusion.co/) 的动效实现方案，对 gomoku-react 项目进行了全面的动效优化。Lusion.co 是一个获奖的 3D 交互网站工作室，其网站展示了高端的 WebGL/Three.js 动效、流畅的 CSS 过渡和精心设计的交互体验。

---

## 优化内容

### 1. 动效工具库 (`/src/lib/animations.js`)

创建了完整的动画工具库，包含：

- **缓动曲线**：bounce、smoothIn、smoothOut、elastic、snappy
- **RAF 驱动动画**：高性能的 requestAnimationFrame 动画函数
- **弹簧物理动画**：模拟真实物理的弹性效果
- **交错动画**：列表元素的交错入场效果
- **序列动画**：按顺序执行的动画链
- **粒子效果**：胜利时的粒子爆发效果
- **Canvas 动画辅助**：棋子绘制、赢线动画

### 2. CSS 动效增强 (`/src/index.css`)

新增动画关键帧：

| 动画名称 | 用途 | 时长 |
|---------|------|------|
| `stone-drop` | 落子弹跳效果 | 400ms |
| `stone-ripple` | 落子涟漪效果 | 600ms |
| `card-enter` | 卡片交错入场 | 500ms |
| `thinking-dot` | AI 思考点优化 | 1400ms |
| `progress-fill` | 进度条加载 | 2000ms |
| `slide-in-*` | 滑入动画(上下左右) | 400ms |
| `fade-scale-in` | 淡入缩放 | 300ms |
| `breathe` | 呼吸灯效果 | 2000ms |
| `page-enter/exit` | 页面过渡 | 300ms |

新增工具类：

- `.animate-*` - 动画类
- `.stagger-*` - 交错延迟类
- `.transition-smooth/bounce/fast` - 过渡增强类
- `.gpu-accelerated` - GPU 加速优化
- `.hover-lift/glow` - 悬停效果
- `.initial-hidden` - 入场动画初始状态

### 3. Intersection Observer Hook (`/src/hooks/useIntersectionObserver.js`)

创建了滚动触发动画的 React Hook：

- `useIntersectionObserver` - 元素进入视口时触发
- `useStaggerAnimation` - 列表交错入场动画

### 4. 组件优化

#### VictoryOverlay（胜利界面）
- 粒子爆发效果
- 胜利标题发光效果
- 棋子光环呼吸动画
- 按钮交错入场

#### AIThinkingIndicator（AI 思考指示器）
- 优化的三点跳动动画
- 进度条装饰
- 淡入缩放入场效果

#### GameLobby（游戏大厅）
- 标题滚动入场动画
- 游戏卡片交错入场
- Platform/Style Center 按钮入场
- LAN IP Banner 入场动画

---

## 性能优化

参考 Lusion.co 的性能策略：

1. **GPU 加速**
   ```css
   .gpu-accelerated {
     will-change: transform, opacity;
     transform: translateZ(0);
     backface-visibility: hidden;
   }
   ```

2. **RAF 节流**
   - 使用 requestAnimationFrame 驱动动画
   - 16ms 节流（约 60fps）

3. **CSS 动画优先**
   - 简单动画使用 CSS transitions/animations
   - 复杂动画使用 JavaScript RAF

4. **Intersection Observer**
   - 滚动动画只在元素可见时触发
   - 减少不必要的计算

---

## 技术对比

| 特性 | Lusion.co | gomoku-react (优化后) |
|-----|-----------|---------------------|
| 渲染引擎 | Three.js (WebGL) | Canvas 2D |
| 动画驱动 | RAF + CSS | RAF + CSS |
| 缓动曲线 | cubic-bezier | cubic-bezier |
| 粒子效果 | WebGL 粒子 | DOM 粒子 |
| 滚动动画 | Intersection Observer | Intersection Observer |
| 性能优化 | GPU 加速 | GPU 加速 |

---

## 文件清单

```
apps/web/src/
├── lib/
│   └── animations.js          # 新增：动效工具库
├── hooks/
│   └── useIntersectionObserver.js  # 新增：滚动动画 Hook
├── components/
│   └── board/
│       ├── VictoryOverlay.jsx      # 优化：增强胜利动画
│       └── AIThinkingIndicator.jsx # 优化：AI 思考动画
│   └── GameLobby.jsx               # 优化：滚动入场动画
└── index.css                       # 优化：新增动画和工具类
```

---

## 使用示例

### 1. 使用 CSS 动画类

```jsx
<div className="animate-card-enter stagger-1">
  卡片内容
</div>
```

### 2. 使用 JavaScript 动画

```javascript
import { animate, easings, durations } from '../lib/animations.js'

animate({
  from: 0,
  to: 1,
  duration: durations.normal,
  easing: easings.bounce,
  onUpdate: (value) => {
    element.style.opacity = value
    element.style.transform = `scale(${value})`
  },
})
```

### 3. 使用滚动入场

```javascript
import { useIntersectionObserver } from '../hooks/useIntersectionObserver.js'

function MyComponent() {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.2 })
  
  return (
    <div 
      ref={ref}
      className={`transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      内容
    </div>
  )
}
```

### 4. 粒子效果

```javascript
import { createParticles } from '../lib/animations.js'

createParticles(container, {
  count: 30,
  colors: ['#00d4ff', '#7c3aed'],
  duration: 1200,
  spread: 150,
})
```

---

## 测试结果

- ✅ 143 个测试全部通过
- ✅ 构建成功
- ✅ CSS 动画无语法错误
- ✅ 组件渲染正常

---

## 未来扩展

可进一步参考 Lusion.co 实现：

1. **Three.js 3D 棋盘** - 使用 WebGL 渲染 3D 棋盘和棋子
2. **着色器动画** - GLSL 着色器实现高级视觉效果
3. **物理引擎** - Matter.js 实现棋子物理效果
4. **音频可视化** - Web Audio API 音频反馈
5. **页面过渡动画** - View Transitions API
