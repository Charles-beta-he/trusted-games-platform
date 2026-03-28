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
