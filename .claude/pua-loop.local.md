# PUA Loop State
task: "按 P10 战略输入驱动项目优化 — P9-A 后端可靠性 + P9-B 前端质量，双线并行"
project: /Users/charles/Desktop/folder/gomoku-react
max_iterations: 30
completion_promise: LOOP_DONE
active: true
current_iteration: 12
last_report: loop-report-11.md
strategy: .claude/p10-strategy.md
p9_report: .claude/p9-report.md

## P10 战略约束
- 测试覆盖 (web): 目标 >30%
- 构建: 必须通过
- 不动: packages/core/src/crypto.js, 现有 gomoku 插件
- 优先: hooks 拆分, 测试覆盖, 信令环境隔离

## P9 双线任务
### P9-A (后端架构 + 可靠性)
- usePlatformConn 拆分 (536L → 3 子 hook)
- 信令环境隔离 (dev ≠ prod)

### P9-B (前端体验 + 质量)
- 核心 hooks 测试覆盖
- 大组件拆分分析
- bundle 优化
