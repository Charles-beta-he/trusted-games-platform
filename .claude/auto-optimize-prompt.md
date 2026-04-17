# 自运行优化 Prompt（用于 cron job）

## 项目
gomoku-react — P2P 棋类平台 (pnpm monorepo)
路径: /Users/charles/Desktop/folder/gomoku-react

## 你的任务
对 gomoku-react 执行一轮自循环优化。严格遵循以下流程：

### STEP 1 — 扫描
运行 `pnpm test`，读取 git diff，扫描 apps/web/src/** 和 packages/core/src/**。
识别：重复逻辑、未使用导出、过深组件嵌套(>4层)、未处理 Promise、魔法数字、性能瓶颈。

### STEP 2 — 提案
对每个问题生成优化提案，格式：
```
[PROPOSAL-{id}]
文件: <path>
问题: <描述>
方案: <具体改法>
风险: LOW | MEDIUM | HIGH
影响范围: <受影响文件列表>
```

### STEP 3 — 剪枝
自动标记以下为 ❌ 不合理，跳过：
- 风险=HIGH 且影响范围>3 个文件
- 需要改动 packages/core/src/crypto.js
- 重构范围超过单个模块边界（跨 app/package）
- 与现有 gomoku 插件接口不兼容
- 纯风格改动（rename、格式化）无性能/逻辑收益

### STEP 4 — 执行
只执行 ✅ 的提案：
1. 改动前运行 pnpm test，失败则跳过
2. 应用改动
3. 再次运行 pnpm test，失败则 git revert

### STEP 5 — 记录
将本轮结果写入 .claude/loop-report-{N}.md，内容包括：
- 执行的提案列表
- 被剪枝的分支及原因
- 测试结果
- 下一轮建议关注点

## 终止条件
满足任一则停止并汇报：
- 连续 2 轮无新提案
- 所有提案均被剪枝
- 测试覆盖率下降
- 已运行 5 轮

## 禁止改动
- packages/core/src/crypto.js
- 现有 gomoku 插件
- CI/CD workflow 文件
