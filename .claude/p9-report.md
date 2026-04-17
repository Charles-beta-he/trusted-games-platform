# P9 项目全景报告 — Loop 8 轮总结
- Date: 2026-04-16 23:22
- 模式: PUA Loop (pua:pua + pua:loop)
- 轮次: 8 轮迭代
- PUA Level: L1 (第 7 轮), L0 (其余)

---

## 一、交付成果

### Git 提交 (3个)
```
67769dd fix: migrate core constant imports to @tg/core
7eec8bc fix: add try/catch to P2P host/guest setup
05c9360 feat+refactor: AI engine upgrade, P2P fixes, UI dedup
```

### 新增文件 (6个)
| 文件 | 大小 | 用途 |
|------|------|------|
| ui/CopyButton.jsx | 1.6KB | 共享复制按钮组件 |
| ui/QRCanvas.jsx | 1.1KB | 共享 QR 码组件 |
| ui/ErrorBoundary.jsx | 1.7KB | 错误边界防白屏 |
| hooks/useThemeCycle.js | 0.9KB | 主题循环 hook |
| lib/constants.js | 0.2KB | Web 端常量 (COPY_CONFIRM_MS) |
| lib/sharedStyles.js | 0.7KB | 共享样式工厂 (btn/card) |

### 修复清单 (9个)
| # | 类型 | 文件 | 问题 |
|---|------|------|------|
| 1 | 重复逻辑 | ModeSelect/P2PModal | CopyButton 重复 |
| 2 | 重复逻辑 | ModeSelect/P2PModal | QRCanvas 重复 |
| 3 | 重复逻辑 | ModeSelect/GameLobby/PlatformView | useThemeCycle 重复 |
| 4 | 重复逻辑 | PlatformView/StyleCenterPage | btn/card 样式重复 |
| 5 | 静默失败 | GameLobby/P2PModal/ModeSelect/WebRTC | .then() 无 .catch() |
| 6 | 静默失败 | usePlatformConn | setupAsHost/handleGuestOffer 无 try/catch |
| 7 | 白屏风险 | main.jsx | 无 ErrorBoundary |
| 8 | 运行时崩溃 | 5 个文件 | constants.js 删除后残留引用 |
| 9 | 常量管理 | 5 个文件 | 核心常量应从 @tg/core 导入 |

### 代码量变化
- 删除重复代码: ~150 行
- 新增共享代码: ~60 行
- 净减少: ~90 行

---

## 二、架构健康度

| 维度 | 状态 | 风险 |
|------|------|------|
| 测试覆盖 (core) | 3/9 = 33% | OK |
| 测试覆盖 (web) | 0/61 = 0% | HIGH ⚠️ |
| 错误边界 | 1 个 (root) | LOW |
| 未处理 Promise | hooks 层已修复 | LOW |
| 信令环境隔离 | dev=prod=同一地址 | MED |
| 平台 API | 生产地址缺失 | MED |
| Hooks 复杂度 | usePlatformConn(536L), useGameEngine(370L) | HIGH |
| 大函数 | 45 个 >50 行 | MED |

---

## 三、P9 Task Prompt — 下一步建议

### Task 1: Web 层测试覆盖
```
WHY: web 层 0% 覆盖 = 任何改动都可能引入回归，7 轮 loop 中 2 次因缺少测试差点引入 bug
WHAT: 为核心 hooks (useGameEngine, useSignaling, useWebRTC) 添加 vitest 测试
WHERE: apps/web/src/hooks/*.test.js (新建)
DONE: pnpm test 新增 >=10 个 web 层测试
DON'T: 不要测试 UI 渲染 (需要 playwright)，只测纯逻辑
```

### Task 2: 信令环境隔离
```
WHY: dev/prod/local 全指向同一 workers.dev 地址，开发调试影响线上用户
WHAT: .env.development 改为 ws://localhost:8787，仅 production 用 workers.dev
WHERE: apps/web/.env.development, apps/signaling-cf/wrangler.toml
DONE: npm run dev 后本地信令正常工作
DON'T: 不要改 workers.dev 的生产配置
```

### Task 3: Hooks 拆分
```
WHY: usePlatformConn 536 行 11 useEffect 19 useRef，任何改动都是雷区
WHAT: 拆为 usePlatformWS (WebSocket) + usePlatformP2P (WebRTC) + usePlatformAuth (认证)
WHERE: apps/web/src/hooks/usePlatform*.js
DONE: 原 usePlatformConn 改为组合三个子 hook，测试通过
DON'T: 不要改对外 API (返回值保持一致)
```
