## 1.0.0 (2026-04-17)

### ✨ Features

* add StyleCenter page with full style pipeline ([91342ce](https://github.com/Charles-beta-he/trusted-games-platform/commit/91342ce7e7445fdb19115a73989d1a6a1ba03812))
* **ai:** per-game engine model + xiangqi α-β negamax upgrade ([2afd2bd](https://github.com/Charles-beta-he/trusted-games-platform/commit/2afd2bd4bbc27004e17dc8365d31cfc98e741c3f))
* Cloudflare TURN + LAN-aware ICE + connection type display ([129cb5a](https://github.com/Charles-beta-he/trusted-games-platform/commit/129cb5ab01f38dc31a223e5b94c2a4b946fa8abc))
* decouple game-platform, per-game ranking, xiangqi UI polish ([16437fb](https://github.com/Charles-beta-he/trusted-games-platform/commit/16437fb8940e4c60b2966b4189d8b382262bb8fe))
* Go AI (MCTS) + replace alert() with console.error ([1b244bb](https://github.com/Charles-beta-he/trusted-games-platform/commit/1b244bbaf332af7b87b6033bf93cc0ba7a14759e))
* MPA routing, AI Web Worker, style profiles, personal style AI ([8ac641a](https://github.com/Charles-beta-he/trusted-games-platform/commit/8ac641aaf7fa768a0935fa824b77bcfcc36d0a06))
* online platform, Cloudflare deployment, mobile UX ([ba87251](https://github.com/Charles-beta-he/trusted-games-platform/commit/ba872517f68ed737e955bfa2f657a72f44166698))
* P10 审查修复 - 合规+做减法+稳定性 ([733d73b](https://github.com/Charles-beta-he/trusted-games-platform/commit/733d73bf9ddb54b972b5dca10b32a3584260cfda))
* path-B AI config — per-game custom params via plugin schema ([a5a5e49](https://github.com/Charles-beta-he/trusted-games-platform/commit/a5a5e49f1bbb6307a03509d07869f33a9d2950f4))
* remove P2P fallback, add H5 platform skeleton ([7464bd3](https://github.com/Charles-beta-he/trusted-games-platform/commit/7464bd30b1668223dd094a0e70d00ccefdf5c6e3))
* 参考 Lusion.co 优化动效系统 ([5f0d4d4](https://github.com/Charles-beta-he/trusted-games-platform/commit/5f0d4d43fa71e5bd5f75a5e8273d5ecf009b84d2))
* 完善核心交互动画 (P9 Loop) ([0862948](https://github.com/Charles-beta-he/trusted-games-platform/commit/08629486ea09a2f7091bb81077939e2713ec0b73))
* 补充异步 ([7348e8f](https://github.com/Charles-beta-he/trusted-games-platform/commit/7348e8f817baae5a0e9254fc51697cde55fef610))

### 🐛 Bug Fixes

* add try/catch to P2P host/guest setup in usePlatformConn ([7eec8bc](https://github.com/Charles-beta-he/trusted-games-platform/commit/7eec8bc5e390a2f0e2aebe7660a06f1c23a646e5))
* migrate core constant imports to @tg/core (was broken by constants.js deletion) ([67769dd](https://github.com/Charles-beta-he/trusted-games-platform/commit/67769dda43b495a1a665d722092eb5270bfb3449))
* P10 深度审查修复 - 动画稳定性 ([1b13c6b](https://github.com/Charles-beta-he/trusted-games-platform/commit/1b13c6b94312182292a5fd22b739a568ba5c61ee))
* QR code density + PC bottom nav visibility ([daf3604](https://github.com/Charles-beta-he/trusted-games-platform/commit/daf3604128a21d5d56dd9071a18ac5e79426eebe))
* restore p2pCrypto.js + fix duplicate RANK_TIERS breaking build ([1591389](https://github.com/Charles-beta-he/trusted-games-platform/commit/1591389b2169d8c924662952ec5ff85274660e08))
* restore p2pCrypto.js deleted by mistake (was not actually migrated to core) ([c82a0b6](https://github.com/Charles-beta-he/trusted-games-platform/commit/c82a0b699f024f83dcaabf83b86aaba9aa06db27))
* stone visibility, mobile single-screen layout, touch placement confirm ([e936c7c](https://github.com/Charles-beta-he/trusted-games-platform/commit/e936c7ce8b311781c67688a72cbad5b73d3cdc2a)), closes [#0e1a3a](https://github.com/Charles-beta-he/trusted-games-platform/issues/0e1a3a)

### ♻️ Refactoring

* data-driven game dispatch, eliminate per-game hardcodes ([4df3951](https://github.com/Charles-beta-he/trusted-games-platform/commit/4df3951e945e4305d349661bbd4fa791736aca70))
* extract platformConnUtils.js from usePlatformConn (Step 1/3) ([3fdd525](https://github.com/Charles-beta-he/trusted-games-platform/commit/3fdd5253cffab2f65d1274b7170e2c10e0e27e3c))
* extract router config to src/router/ ([79cf8fe](https://github.com/Charles-beta-he/trusted-games-platform/commit/79cf8fee853c2bcf2863d490ffb3bc450d9c125f))

# Changelog

All notable changes to this project will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Chess plugin
- Go (围棋) plugin
- Game replay / export
- Spectator mode

---

## [0.2.0] — 2026-03-28

### Added
- Online matchmaking via Cloudflare Durable Objects
- Public room list with join-by-code
- ELO leaderboard (K=32, ranks 初段→九段)
- User registration / persistent identity (localStorage + DO storage)
- `usePlatformConn` hook — WebSocket + WebRTC + ECDH handshake in one place
- Cloudflare Workers signaling server (`apps/signaling-cf`)
- Cloudflare Pages deployment config (`_headers`, `_redirects`, `wrangler.toml`)
- LAN address display + one-click copy in Game Lobby
- Quick Join — paste invite link or room code directly from lobby
- Mobile bottom navigation bar in PlatformView
- Theme-switcher arrow buttons `‹ ›` for keyboard-free cycling
- `.github` issue templates (Bug Report, Feature Request) + auto-label workflow
- `scroll-x-hidden` CSS utility — hides scrollbars on overflow-x elements

### Fixed
- JOIN button now correctly distinguishes 6-char room codes from SDP offer strings
- `isOnline` state now set correctly on WebSocket open regardless of credentials
- Durable Object hibernation: WebSocket metadata survives via `serializeAttachment`
- Room TTL: replaced broken timer with `pruneStaleRooms()` called on access
- `p2pCallbacks` now wired to `usePlatformConn` so matched-game moves reach the engine
- Removed `body { padding: env(safe-area-inset-*) }` that caused layout width shrinkage
- Fixed PlatformView height: `height: 100svh` + scrollable `<main>` eliminates blank space
- Removed horizontal scrollbar from bottom of all pages

### Changed
- Footer labels shortened: "NO SERVER · LOCAL FIRST · E2E · HASH CHAIN"
- PlatformView leaderboard condensed to 3-column grid with win-rate inline

---

## [0.1.0] — 2026-03-13

### Added
- Gomoku (五子棋) game engine — 15×15, Minimax α-β AI (4 levels)
- WebRTC P2P with ECDH E2E encryption and SHA-256 hash chain
- 4 visual themes: Sci-Fi, Classic Wood, Neon Cyber, Minimal Dark
- LAN signaling via WebSocket (Node.js)
- Game Lobby with plugin registry
- ModeSelect: Local PvP, vs AI, LAN Host/Join
- Victory overlay with win animation
- pnpm monorepo baseline
