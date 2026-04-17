# gomoku-react 动效实现现状调研报告

调研时间: 2025-04-17

---

## 一、已实现的动效清单

### 1.1 CSS Keyframes 动画 (index.css + tailwind.config.js)

| 动效名称 | 实现位置 | 用途 | 技术方案 |
|---------|---------|------|---------|
| victory-appear | index.css:211-214 | 胜利标题入场 | scale + opacity |
| victory-spin | index.css:216-219 | 胜利棋子旋转入场 | scale + rotate |
| scan-line | index.css:222-225 | 扫描线效果(科技感) | translateY |
| glow-pulse | index.css:228-231 | 发光脉冲 | opacity + brightness |
| border-sweep | index.css:234-238 | 边框扫光 | box-shadow |
| stone-drop | index.css:243-259 | 落子弹跳效果 | scale + translateY |
| stone-ripple | index.css:262-271 | 落子涟漪 | scale + opacity |
| card-enter | index.css:274-283 | 卡片入场 | opacity + translateY + scale |
| card-hover | index.css:286-295 | 卡片悬停提升 | translateY + box-shadow |
| typewriter | index.css:298-301 | 文字打字机 | width |
| blink-cursor | index.css:304-307 | 光标闪烁 | border-color |
| ripple | index.css:310-319 | 按钮点击波纹 | scale + opacity |
| thinking-dot | index.css:322-331 | AI思考点 | scale + opacity |
| progress-fill | index.css:334-337 | 进度条加载 | width |
| slide-in-left | index.css:340-349 | 从左滑入 | translateX |
| slide-in-right | index.css:352-361 | 从右滑入 | translateX |
| slide-in-up | index.css:364-373 | 从下滑入 | translateY |
| fade-scale-in | index.css:376-385 | 淡入缩放 | opacity + scale |
| number-roll | index.css:388-391 | 数字滚动 | translateY |
| particle-float | index.css:394-403 | 粒子飘散 | translate + scale + opacity |
| breathe | index.css:406-413 | 呼吸灯效果 | box-shadow |
| draw-line | index.css:416-419 | 赢线绘制 | stroke-dashoffset |
| page-enter | index.css:422-431 | 页面进入 | opacity + blur |
| page-exit | index.css:433-442 | 页面退出 | opacity + blur |
| pulse-bar | tailwind.config.js:46-49 | 活跃玩家指示条 | opacity |
| net-pulse | tailwind.config.js:54-57 | 网络状态脉冲 | opacity + boxShadow |
| flash | tailwind.config.js:66-69 | 背景闪烁 | background |

### 1.2 CSS 动效工具类 (index.css utilities 层)

| 工具类名 | 用途 | 动效类型 |
|---------|------|---------|
| .animate-stone-drop | 落子弹跳 | animation |
| .animate-stone-ripple | 落子涟漪 | animation |
| .animate-card-enter | 卡片入场 | animation |
| .animate-slide-in-left | 左滑入 | animation |
| .animate-slide-in-right | 右滑入 | animation |
| .animate-slide-in-up | 下滑入 | animation |
| .animate-fade-scale-in | 淡入缩放 | animation |
| .animate-breathe | 呼吸灯 | animation |
| .animate-thinking | 思考点 | animation |
| .animate-page-enter | 页面入场 | animation |
| .stagger-1 ~ .stagger-6 | 交错延迟 | animation-delay |
| .transition-smooth | 平滑过渡 | transition |
| .transition-bounce | 弹跳过渡 | transition |
| .transition-fast | 快速过渡 | transition |
| .gpu-accelerated | GPU加速 | will-change + transform |
| .hover-lift | 悬停提升 | transition + transform |
| .hover-glow | 悬停发光 | transition + box-shadow |
| .initial-hidden | 初始隐藏 | opacity + transform |

### 1.3 JavaScript 动画库 (lib/animations.js)

| 函数/工具 | 功能 | 技术实现 |
|----------|------|---------|
| animate() | RAF驱动的补间动画 | requestAnimationFrame |
| stagger() | 交错动画 | setTimeout + animate |
| spring() | 弹簧物理动画 | RAF + 物理公式 |
| sequence() | 序列动画 | 链式调用animate |
| createParticles() | DOM粒子效果 | DOM创建 + CSS transition |
| canvasAnimations.drawStone() | Canvas棋子绘制动画 | Canvas 2D API |
| canvasAnimations.drawWinningLine() | Canvas赢线动画 | Canvas 2D API |
| easings | 缓动曲线常量 | cubic-bezier字符串 |
| durations | 动画时长常量 | 毫秒数值 |

### 1.4 Intersection Observer 滚动动画 (hooks/useIntersectionObserver.js)

| Hook | 功能 | 用途 |
|------|------|------|
| useIntersectionObserver | 滚动触发动画 | 元素进入视口时触发 |
| useStaggerAnimation | 交错入场动画 | 列表元素依次入场 |

### 1.5 Canvas 渲染动效 (lib/drawing.js + BoardCanvas.jsx)

| 动效点 | 实现方式 | 说明 |
|-------|---------|------|
| 棋子渐变渲染 | radialGradient | 黑白棋子3D效果 |
| 棋子高光 | 叠加渐变 | 模拟光线反射 |
| Hover预览 | 半透明绘制 | 鼠标悬停预览落子位置 |
| Pending确认 | 外环脉冲 | 触屏二次确认 |
| 胜利线发光 | shadowBlur | 胜利线发光效果 |
| 棋盘网格发光 | shadowBlur (sci-fi) | 科技感主题 |
| OffscreenCanvas | 预渲染 | 性能优化 |
| RAF渲染循环 | requestAnimationFrame | 60fps渲染 |
| 局部重绘 | destination-out | 减少全量重绘 |

### 1.6 各组件中的动效

| 组件 | 动效实现 |
|------|---------|
| VictoryOverlay | victory-appear, victory-spin, glow-pulse, fade-scale-in, slide-in-up, breathe, 粒子效果 |
| AIThinkingIndicator | fade-scale-in, thinking-dot, progress-fill |
| GameLobby | useStaggerAnimation, IntersectionObserver, hover-lift |
| Header | hover边框变色 |
| PlayerCard | animate-pulse-bar |
| Collapsible | transform旋转箭头 |
| CopyButton | 颜色过渡 |
| P2PModal | animate-thinking, animate-net-pulse |
| ModeSelect | msPulse, hover效果, 过渡 |
| ReplayBar | opacity变化 |

---

## 二、缺失/可优化的动效清单

| 动效点 | 当前状态 | 建议优化 | 优先级 |
|-------|---------|---------|--------|
| 落子动画 | Canvas直接绘制，无动画 | 添加scale弹跳动画，参考stone-drop | P0 |
| 悔棋动画 | 直接消失 | 添加淡出+缩放动画 | P1 |
| 胜利线绘制 | 静态线条 | 添加draw-line渐进绘制动画 | P1 |
| 棋盘入场 | 无入场动画 | 添加fade-scale-in | P2 |
| 主题切换 | 硬切换 | 添加平滑过渡(morph) | P2 |
| 模态框 | 无入场/退场动画 | 添加fade-scale-in + backdrop blur | P1 |
| 按钮点击反馈 | 无波纹 | 添加ripple效果 | P2 |
| 历史记录列表 | 无交错入场 | 添加stagger动画 | P2 |
| 计时器数字变化 | 直接跳变 | 添加number-roll动画 | P2 |
| 网络状态变化 | 无反馈 | 添加flash闪烁 | P2 |
| 错误提示 | 直接显示 | 添加slide-in-up | P2 |

---

## 三、性能优化现状

### 已实现的优化

| 优化措施 | 位置 | 说明 |
|---------|------|------|
| OffscreenCanvas | BoardCanvas.jsx | 预渲染减少主线程压力 |
| RAF渲染循环 | BoardCanvas.jsx | 60fps流畅渲染 |
| 局部重绘 | BoardCanvas.jsx:63-71 | hover时只重绘受影响区域 |
| 渲染节流 | BoardCanvas.jsx:35 | drawThrottleMs=16ms |
| GPU加速类 | index.css | .gpu-accelerated (will-change + translateZ) |
| 交错延迟类 | index.css | .stagger-1~6 |
| 缓动预设 | animations.js | 避免运行时解析 |
| 木纹预生成 | drawing.js | WOOD_GRAIN模块加载时生成 |
| DPR适配 | BoardCanvas.jsx | 高清屏渲染 |

### 可优化点

| 问题 | 建议 | 影响 |
|------|------|------|
| RAF循环始终运行 | 空闲时暂停，有变化时恢复 | 降低CPU占用 |
| 每帧完整重绘 | 增量渲染，脏矩形标记 | 性能提升 |
| DOM粒子创建 | 改用Canvas绘制 | 减少DOM操作 |
| 大量内联style | 提取为CSS类 | 减少JS执行 |
| 动画库未被组件使用 | animations.js函数未在Board中使用 | 落子无动画 |
| spring函数未使用 | 动画库已实现但未应用 | 可用于落子物理效果 |

---

## 四、优先级排序

### P0 - 核心体验 (必须修复)

1. **落子动画**: 游戏核心交互，当前Canvas直接绘制无任何动画反馈
   - 建议: 在BoardCanvas中使用animations.js的animate函数实现棋子弹跳
   - 参考: canvasAnimations.drawStone已有progress参数，但未被使用

### P1 - 体验增强 (尽快实现)

2. **胜利线绘制动画**: 用draw-line替代静态线段
3. **悔棋/回退动画**: 添加淡出效果
4. **模态框动画**: P2PModal添加入场/退场动效

### P2 - 锦上添花 (有时间再做)

5. **主题切换平滑过渡**: morph效果
6. **按钮点击波纹**: ripple效果
7. **历史记录交错入场**: stagger
8. **计时器数字滚动**: number-roll
9. **错误提示动画**: slide-in-up

---

## 五、总结

gomoku-react 项目已建立了较为完善的动效基础设施:
- 完整的CSS keyframes库 (25+ 动画定义)
- 强大的JS动画工具库 (animate, spring, stagger, sequence, particles)
- IntersectionObserver滚动触发动画
- Canvas渲染优化 (OffscreenCanvas, RAF, 局部重绘)

**核心问题**: 动效基础设施完善但落子等核心交互未使用动画。animations.js中实现了多种动画函数，但BoardCanvas的落子逻辑是纯Canvas静态绘制，没有调用动画库。

**建议**: 优先将animations.js中的canvasAnimations.drawStone集成到BoardCanvas的渲染循环中，实现落子弹跳效果。
