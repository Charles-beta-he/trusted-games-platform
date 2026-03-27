export const BOARD_SIZE = 15
export const CELL_SIZE = 36
export const PADDING = 18
export const CANVAS_PX = PADDING * 2 + CELL_SIZE * (BOARD_SIZE - 1)
export const COLS = 'ABCDEFGHJKLMNOP'

export const SCORE = {
  FIVE: 100000,
  OPEN_FOUR: 10000,
  HALF_FOUR: 1000,
  OPEN_THREE: 500,
  HALF_THREE: 100,
  OPEN_TWO: 50,
  HALF_TWO: 10,
  ONE: 1,
}

export const DIFFICULTY_CONFIG = {
  easy:   { depth: 1, delay: 200, label: '入门', desc: '贪心算法\n搜索深度: 1' },
  medium: { depth: 3, delay: 400, label: '初级', desc: 'Minimax + α-β剪枝\n搜索深度: 3' },
  hard:   { depth: 4, delay: 600, label: '中级', desc: 'Minimax + α-β剪枝\n搜索深度: 4' },
  expert: { depth: 5, delay: 900, label: '高级', desc: 'Minimax + α-β剪枝\n搜索深度: 5' },
}

export const TRUST_LEVELS = {
  L1: { color: '#2d6a4f', icon: '🔒', label: '完全可信',   sub: 'TEE · VERIFIED',     activeBars: 5 },
  L2: { color: '#52b788', icon: '📦', label: '缓存可信',   sub: 'CACHED · CROSS-VER', activeBars: 4 },
  L3: { color: '#f0a500', icon: '👥', label: '共识可信',   sub: 'LAN · BFT CONSENSUS', activeBars: 3 },
  L4: { color: '#e07b39', icon: '📝', label: '可追溯',     sub: 'SIGNED CHAIN',         activeBars: 2 },
  L5: { color: '#8b3a3a', icon: '🎮', label: '娱乐模式',   sub: 'LOCAL · UNVERIFIED',  activeBars: 1 },
}

export const NETWORK_MODES = {
  'offline-solo': { label: '单机娱乐模式', trustLevel: 'L5', netStatus: 'OFFLINE · SOLO', online: false },
  'offline-p2p':  { label: '局域网对战 (P2P)', trustLevel: 'L3', netStatus: 'LAN · P2P', online: false },
  'online':       { label: '在线模式', trustLevel: 'L1', netStatus: 'ONLINE (COMING SOON)', online: true },
}
