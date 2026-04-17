# P10 战略输入: gomoku-react (trusted-games-platform)

> 收到命题，进入战略规划。头部三板斧：定战略、造土壤、断事用人。

---

## 方向

**Serverless 棋类对战平台** — P2P 去中心化对弈，支持五子棋 + 中国象棋，插件化架构可扩展更多棋种。

## 成功标准

| 指标 | 目标 | 当前 |
|------|------|------|
| 测试覆盖 (web) | >30% | 0% → 本轮提升中 |
| 测试覆盖 (core) | >80% | 33% |
| 构建状态 | 通过 | ✅ |
| 包体积 (gzip) | <200KB | ~180KB ✅ |
| P2P 连接成功率 | >90% | 未知 (无监控) |
| 插件扩展 | 新棋种 <1天 | ✅ 架构已支持 |

## 约束条件

- **技术约束**: React 19 + Vite 8 + Cloudflare Workers，无后端服务器
- **资源约束**: 单人开发，无团队预算，依赖 AI agent 自动化
- **合规约束**: P2P 加密 (ECDH + AES-GCM)，无用户数据存储

## 风险预判

| # | 风险 | 缓解策略 |
|---|------|---------|
| 1 | web 层 0% 测试覆盖 → 每次改动都是盲飞 | 优先补核心 hooks 测试 |
| 2 | usePlatformConn 536 行 → 改动易引入回归 | 拆分为 3 个子 hook |
| 3 | 信令无环境隔离 → 开发影响线上 | .env.development 指向 localhost |
| 4 | 无监控 → P2P 连接失败无感知 | 添加 Sentry 或 console 埋点 |
| 5 | 插件接口虽好但无文档 → 新棋种门槛高 | 写插件开发指南 |

## 不做什么

- ❌ **不做 SSR** — 棋盘交互重，CSR 更合适
- ❌ **不做用户系统** — P2P 无需注册，房间码即身份
- ❌ **不做移动端原生** — PWA 足够，原生是另一个项目
- ❌ **不做 AI 对战云服务** — AI 在浏览器端 Worker 运行
- ❌ **不做游戏内聊天** — P2P DataChannel 带宽留给棋局同步

## P9 编制

本项目适合 **2 个 P9** 驱动：

### P9-A: 后端架构 + 可靠性
- 管辖: signaling-cf, useSignaling, useWebRTC, usePlatformConn, crypto, P2P 加密
- 任务: 信令环境隔离、hooks 拆分、错误处理、连接监控

### P9-B: 前端体验 + 质量
- 管辖: 组件层, hooks(useGameEngine, useAI, useReplay), 测试, 构建优化
- 任务: 测试覆盖、组件拆分、bundle 优化、插件文档

### P9 间接口
- 共享: `@tg/core` (packages/core) — 两边都只读，修改需双方确认
- 边界: P9-A 不动组件渲染，P9-B 不动 WebSocket/WebRTC

## 基础能力清单

- [x] Memory: 用户偏好已记录
- [x] Skills: pua, p9, p10, loop, systematic-debugging 已加载
- [x] MCP: filesystem, time, memory 已配置
- [ ] 质量门禁: 仅 pnpm test，无 lint 强制、无 pre-commit hook
- [ ] 方法论: auto-optimize-prompt.md 已创建，但未绑定 cron job

---

## 下一步: P10 → P9 → P8 驱动链

P10 战略输入已就绪。接下来由 P9 接收战略输入，拆解为 Task Prompt 六要素，分发给 P8 执行。
