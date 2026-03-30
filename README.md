# Trusted Games Platform

> P2P 对局 · 端到端加密 · 哈希链可追溯 · 天梯弱中继见证  
> P2P play · E2E encryption · hash-chain audit · ranked move witness on signaling

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Deploy](https://img.shields.io/badge/Demo-Live-brightgreen)](https://trusted-games-platform.pages.dev)
[![Cloudflare Workers](https://img.shields.io/badge/Signaling-Cloudflare%20Workers-orange)](https://developers.cloudflare.com/workers/)

浏览器棋类平台：**着法在 WebRTC DataChannel 上端到端加密传输**；双方用与 `@tg/core/crypto` 一致的 **SHA-256 哈希链**（`GENESIS` + 结构化着法字段）在本地互验。  
**天梯（ranked）** 还会在信令 WebSocket 上提交 **move witness**（坐标、序号、链尖哈希等元数据），由 Cloudflare Worker / 本地 Node 信令校验手顺与终局后，才允许 `report_result` 更新 Elo——**服务器看得见见证包，但摸不着 DataChannel 密文着法本体**。

---

## Features

| | |
|---|---|
| **P2P WebRTC** | 着法走 DataChannel，协议层不经过业务中继 |
| **E2E Encryption** | ECDH 协商会话密钥 + AES-GCM |
| **Hash Chain** | `generateGenesisHash` / `computeMoveHash`（见 `packages/core/src/crypto.js`） |
| **Move Witness** | 可选弱中继校验链路与终局，用于天梯防简单作弊 |
| **Online Matchmaking** | Cloudflare Durable Objects 信令 |
| **LAN Play** | 同网分享地址 / SDP |
| **ELO Ranking** | K=32，初始 1200，段位初段→九段 |
| **4 Themes** | Sci-Fi · Classic Wood · Neon Cyber · Minimal Dark |
| **Mobile-first** | Safe-area、底部导航、触摸优化 |

**Games available today**

- **五子棋 / Gomoku** — 15×15，Minimax α-β AI（4 档）

**Coming soon** — Chess · Go · Reversi · Connect Four · Tic-Tac-Toe

---

## Architecture

```
Browser A                          Browser B
   │                                   │
   │   WebRTC DataChannel (E2E 着法)    │
   └──────────────────────────────────►│

   │   WebSocket：SDP / 房间 / 队列     │
   │   + move_witness（天梯元数据）        │
   ▼                                   ▼
        Cloudflare Workers (Durable Objects)
        房间码 · 匹配 · Elo · 见证校验
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+

```bash
git clone https://github.com/Charles-beta-he/trusted-games-platform.git
cd trusted-games-platform
pnpm install
pnpm dev           # 前端 http://localhost:5173
pnpm test          # Vitest：crypto + witnessLogic
```

### Run signaling server locally

```bash
pnpm sig:dev       # Worker 本地 http://localhost:8787
```

在 `apps/web/.env.local` 设置 `VITE_SIGNALING_URL=ws://localhost:8787`（或 Node 信令 `ws://localhost:4001`，见 `apps/web/.env.example`）。

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | **Production** — Cloudflare Pages 自动部署 |
| `master` | Development / staging — 合并进 `main` 触发生产 |

```bash
git checkout main
git merge master
git push origin main
git checkout master
```

---

## Deployment

### Frontend → Cloudflare Pages

`main` 推送触发构建。手动：

```bash
pnpm build
npx wrangler pages deploy apps/web/dist --project-name trusted-games-platform --branch main
```

### Signaling → Cloudflare Workers

```bash
cd apps/signaling-cf
npx wrangler deploy
```

---

## Project Structure

```
trusted-games-platform/
├── apps/
│   ├── web/                    # React + Vite，入口 main.jsx → router
│   └── signaling-cf/         # Worker + DO；src/witnessLogic.js 与 Node 共用逻辑
├── apps/signaling/             # 可选本地 Node 信令（开发）
├── packages/
│   └── core/                   # crypto、棋规、AI
└── vitest.config.js            # pnpm test
```

---

## Adding a New Game

1. 在 `apps/web/src/plugins/index.js` 增加描述（如 `coming_soon`）
2. 实现棋类 hook（可参考 `useGameEngine` / 五子棋）
3. 在路由与棋盘页接入（如 `PlayPage`、`router/index.jsx`）
4. 需要天梯见证时，扩展 `witnessLogic.js` 与客户端 `sendMoveWitness` 形状
5. 将插件 `status` 改为 `installed`

---

## Security Model

- **密钥交换**：信令通道上传 ECDH 公钥，会话密钥不落服务器。
- **着法保密性**：DataChannel 载荷为 AES-GCM；**见证包**为明文 JSON（仅元数据 + 哈希），用于服务端校验手顺。
- **哈希链**：实现以 `packages/core/src/crypto.js` 为准（`GENESIS` 与 `computeMoveHash` 的字段集）；篡改任意一手会破坏链尖。
- **天梯**：`report_result` 需通过 `validateRankedReport`（`gameId`、`chainHash`、终局状态与胜负声明一致）；**不防双方串通**，也不等同于 TEE。

信令角色为 **不可完全信任的中继**：可拒绝错误见证或篡改 Elo 逻辑，客户端仍以链上导出与对局记录自行存证。

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

[MIT](./LICENSE) © 2026 Charles-beta-he
