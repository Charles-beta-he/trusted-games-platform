# P9 Task Prompts — gomoku-react 功能完善

> P9 的产出物是 Task Prompt，不是代码。你是导演不是演员。

---

## Task 1: 围棋 AI 实现 (Go MCTS)

### WHY — 为什么做
围棋插件 (packages/core/src/games/go/) 已有棋规但 AI 抛出 "not implemented"。
用户选择围棋后无法人机对战——这是功能阻断，不是 nice-to-have。

### WHAT — 交付物
- [ ] 在 `packages/core/src/games/go/index.js` 实现 `getBestMove(board, difficulty)`
- [ ] 使用 MCTS (Monte Carlo Tree Search) 算法
- [ ] difficulty 控制模拟次数: easy=100, medium=500, hard=2000, expert=10000
- [ ] 验收: 用户选择围棋 → AI 模式 → AI 能落子且不崩

### WHERE — 在哪里改
- 只动: `packages/core/src/games/go/index.js` (实现 getBestMove)
- 可能新增: `packages/core/src/games/go/mcts.js` (MCTS 引擎)
- 不动: `packages/core/src/crypto.js`, 五子棋插件, 前端组件

### HOW MUCH — 资源边界
- 模型: sonnet 级别即可
- 时间: 1-2 轮迭代
- 复杂度: MCTS 核心 ~150 行，单文件可完成

### DONE — 完成的定义
- `pnpm test` 通过 (不破坏现有 59 个测试)
- 围棋 AI 能在 easy/medium/hard 模式下返回合法落点
- 返回值格式: `{ r, c }` 与五子棋 AI 一致

### DON'T — 禁区
- 不要做 AlphaGo 级别的神经网络 (MCTS 够用)
- 不要改棋规逻辑 (现有的 `validateMove` 已正确)
- 不要改前端 UI

---

## Task 2: alert() → 内联错误提示

### WHY — 为什么做
`alert()` 阻塞 UI、样式丑陋、移动端体验差。2 处仍在使用：
- `LobbyPage.jsx:37` — 导入棋谱失败
- `GomokuPlayPage.jsx:371` — 棋谱加载失败

### WHAT — 交付物
- [ ] 创建 `apps/web/src/components/ui/InlineAlert.jsx` 组件
- [ ] 替换 2 处 `alert()` 调用
- [ ] 样式: 红色边框 + 错误图标 + 自动消失 (3s)

### WHERE — 在哪里改
- 新建: `apps/web/src/components/ui/InlineAlert.jsx`
- 修改: `apps/web/src/pages/LobbyPage.jsx` (line 37)
- 修改: `apps/web/src/pages/GomokuPlayPage.jsx` (line 371)

### HOW MUCH — 资源边界
- 模型: haiku 级别即可
- 复杂度: < 50 行新代码

### DONE — 完成的定义
- 0 个 `alert()` 调用 (grep 验证)
- `pnpm test` 通过
- `pnpm -F web build` 通过

### DON'T — 禁区
- 不要引入 toast 库 (自写简单组件即可)
- 不要改其他功能逻辑

---

## Task 3: usePlatformConn 拆分 (P9-A)

### WHY — 为什么做
536 行、11 useEffect、19 useRef——改任何一行都可能引入 WebSocket/P2P/加密三层联动 bug。
不拆分就没法安全地加功能。

### WHAT — 交付物
- [ ] 拆为 3 个子 hook: `usePlatformWS`, `usePlatformP2P`, `usePlatformAuth`
- [ ] `usePlatformConn` 变为 ~100L 组合层，对外 API 不变
- [ ] 每个子 hook 独立可测试

### WHERE — 在哪里改
- 新建: `apps/web/src/hooks/usePlatformWS.js`
- 新建: `apps/web/src/hooks/usePlatformP2P.js`
- 新建: `apps/web/src/hooks/usePlatformAuth.js`
- 修改: `apps/web/src/hooks/usePlatformConn.js` (改为组合)
- 不动: 消费方 (PlatformView, GomokuPlayPage 等)

### HOW MUCH — 资源边界
- 模型: sonnet/opus
- 时间: 2-3 轮迭代
- 前置条件: 先补 usePlatformConn 测试 (至少覆盖 wsSend, step 状态机)

### DONE — 完成的定义
- `pnpm test` 通过
- `pnpm -F web build` 通过
- 对外返回的 21 个属性不变
- grep usePlatformConn 的消费方无需修改

### DON'T — 禁区
- 不要改对外 API
- 不要加新功能 (纯重构)
- 不要改 WebSocket/WebRTC 底层协议
