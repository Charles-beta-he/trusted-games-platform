# Trusted Games Platform

> 无服务端 · 端到端加密 · 哈希链验证
> Serverless · E2E Encrypted · Hash Chain Verified

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Deploy](https://img.shields.io/badge/Demo-Live-brightgreen)](https://trusted-games-platform.pages.dev)
[![Cloudflare Workers](https://img.shields.io/badge/Signaling-Cloudflare%20Workers-orange)](https://developers.cloudflare.com/workers/)

A browser-based board game platform where **no server ever sees your moves**. Players connect peer-to-peer with WebRTC, negotiate a shared secret via ECDH, and every move is encrypted and hash-chained so neither side can cheat or dispute the game record.

---

## Features

| | |
|---|---|
| **P2P WebRTC** | Moves travel directly between browsers, zero relay latency |
| **E2E Encryption** | ECDH key exchange + AES-GCM per move |
| **Hash Chain** | Every move commits to the previous hash — tamper-evident game log |
| **Online Matchmaking** | Cloudflare Durable Objects signaling — free, globally distributed |
| **LAN Play** | Same WiFi? Share the displayed LAN address, no accounts needed |
| **ELO Ranking** | K=32, initial 1200, ranks 初段→九段 |
| **4 Themes** | Sci-Fi · Classic Wood · Neon Cyber · Minimal Dark |
| **Mobile-first** | Safe-area aware, bottom nav, touch-optimized |

**Games available today**

- **五子棋 / Gomoku** — 15×15, Minimax α-β AI (4 levels)

**Coming soon** — Chess · Go · Reversi · Connect Four · Tic-Tac-Toe

---

## Architecture

```
Browser A                    Browser B
   │                             │
   │   WebRTC DataChannel (E2E)  │
   └────────────────────────────►│

   ▲ only for signaling (SDP)    ▲
   │                             │
   └──── Cloudflare Workers ─────┘
         Durable Objects
         (room codes, matchmaking, ELO)
```

The signaling server only sees room codes and SDP offers — never game moves.

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+

```bash
git clone https://github.com/Charles-beta-he/trusted-games-platform.git
cd trusted-games-platform
pnpm install
pnpm dev           # starts frontend at http://localhost:5173
```

### Run signaling server locally

```bash
pnpm sig:dev       # starts Cloudflare Worker locally at http://localhost:8787
```

Set `VITE_SIGNALING_URL=ws://localhost:8787` in `apps/web/.env.local` to use the local server.

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | **Production** — Cloudflare Pages auto-deploys on every push |
| `master` | Development / staging — merge into `main` to trigger production deploy |

To release to production:

```bash
git checkout main
git merge master
git push origin main   # triggers Cloudflare Pages deployment
git checkout master
```

---

## Deployment

### Frontend → Cloudflare Pages

Cloudflare Pages is connected to the GitHub repository and watches the **`main` branch**.
Every push to `main` automatically builds and deploys the frontend.

```bash
# Manual deploy (if needed)
pnpm build
npx wrangler pages deploy apps/web/dist --project-name trusted-games-platform --branch main
```

### Signaling → Cloudflare Workers

```bash
cd apps/signaling-cf
npx wrangler deploy
```

Both are free on Cloudflare's free tier. No credit card required.

---

## Project Structure

```
trusted-games-platform/
├── apps/
│   ├── web/                   # React 19 + Vite 8 frontend
│   │   ├── src/
│   │   │   ├── components/    # UI components
│   │   │   ├── hooks/         # usePlatformConn, useSignaling, useGameEngine
│   │   │   ├── lib/           # crypto, hash chain, drawing
│   │   │   └── plugins/       # game plugin registry
│   │   └── public/
│   └── signaling-cf/          # Cloudflare Workers + Durable Objects
│       └── src/worker.js
├── packages/                  # shared types (future)
└── package.json               # pnpm workspace root
```

---

## Adding a New Game

1. Add a descriptor to `apps/web/src/plugins/index.js` with `status: 'coming_soon'`
2. Implement the game hook (see `useGomokuEngine` as reference)
3. Wire it up in `App.jsx`'s `loadGame(id)` switch
4. Change `status` to `'installed'` when ready

---

## Security Model

- **Key exchange**: ECDH P-256 over the signaling channel (one-time, never reused)
- **Move encryption**: AES-GCM 256-bit, IV derived per move
- **Hash chain**: `hash[n] = SHA-256(hash[n-1] + move[n])` — any tampering breaks the chain
- **Trust levels**: L3 (local verify) → L5 (full chain audit, post-game export)

The signaling server is **not trusted** — it cannot read, modify, or replay moves.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Bug reports and feature requests welcome via [GitHub Issues](https://github.com/Charles-beta-he/trusted-games-platform/issues).

---

## License

[MIT](./LICENSE) © 2026 Charles-beta-he
