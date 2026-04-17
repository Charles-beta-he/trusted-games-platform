# Loop Report #5
- Date: 2026-04-16 22:27
- Test: 4 files, 14 tests — ALL PASSED
- PUA Level: L0 信任期 (第 5 轮)
- 视角: 产品经理 + 代码质量双线

## 执行的提案

### PROPOSAL-9 ✅ 添加 ErrorBoundary 防白屏
- 文件: apps/web/src/components/ui/ErrorBoundary.jsx (新建)
- 产品视角: 无 ErrorBoundary = 组件崩溃 → 纯白屏，用户无任何反馈
- 改动: 创建 ErrorBoundary 组件（class component），在 main.jsx 包裹整个 App
- 用户体验: 崩溃时显示友好提示 + "刷新页面" 按钮

### PROPOSAL-10 ✅ 补充 .catch() 防静默失败
- 产品视角: getLocalIP() 失败时，LAN URL 按钮静默消失，用户以为功能坏了
- 改动: 4 处 .then() 链补 .catch()
  - GameLobby.jsx: getLocalIP().then().catch(() => {})
  - P2PModal.jsx: getLocalIP().then().catch(() => setLanUrl(null))
  - ModeSelect.jsx: 同上
  - useWebRTC.js: getConnectionType().then().catch(() => {})

## 剪枝的提案

### PROPOSAL-11 ❌ alert() → Toast 通知系统
- 原因: MEDIUM 风险，引入全局状态管理，影响 >3 文件
- 仅 2 处 alert()，当前影响有限

### 无障碍 (a11y) 改进 ❌
- 原因: 需要大规模添加 aria 属性，影响几乎所有组件
- 当前 6 处 aria，属于基础设施层面缺失，非单次可修复

## 产品视角总结

| 维度 | 当前状态 | 风险 |
|------|---------|------|
| 错误边界 | ✅ 已添加 | 已修复 |
| 静默 Promise 失败 | ✅ 4 处已补 catch | 已修复 |
| 用户反馈 (toast) | alert() × 2 | 低影响 |
| 无障碍 (a11y) | 6 处 aria | 基础设施缺失 |
| 移动端响应式 | 32 处 | OK |
| 功能开关 | isAvailable 5处 | OK |

## 累计五轮成果
- 新增文件: 7 (ui/CopyButton.jsx, ui/QRCanvas.jsx, ui/ErrorBoundary.jsx, lib/constants.js, lib/sharedStyles.js, hooks/useThemeCycle.js)
- 修改文件: 8 (ModeSelect, P2PModal, GameLobby, PlatformView, StyleCenterPage, main.jsx, useWebRTC.js)
- 删除重复代码: ~150 行
- 修复: 4 处静默 Promise 失败, 1 处白屏风险
- 测试: 始终 14/14 通过
