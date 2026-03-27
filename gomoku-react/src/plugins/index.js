/**
 * 热插拔游戏插件注册表
 *
 * 每个插件描述符实现 GamePluginDescriptor 接口：
 *   id, name, version, description, boardSize, players,
 *   status: 'installed' | 'coming_soon',
 *   aiEngines: AIEngineDescriptor[],
 *   trustLevels: TrustLevel[]
 *
 * 运行时只有 status==='installed' 的插件可以加载。
 * 后续接入新游戏只需在此注册描述符并提供对应 hook/lib。
 */

export const GAME_CATALOG = [
  {
    id: 'gomoku',
    name: '五子棋',
    nameEn: 'Gomoku',
    version: '1.0.0',
    description: '经典五子棋，先连成五子者胜',
    boardSize: { width: 15, height: 15 },
    players: { min: 2, max: 2 },
    status: 'installed',
    author: 'TrustedGames',
    icon: '⚫',
    trustLevels: ['L4', 'L5'],
    aiEngines: [
      {
        id: 'gomoku-minimax-v1',
        name: 'Minimax α-β',
        algorithm: 'minimax',
        version: '1.0.0',
        difficulties: ['easy', 'medium', 'hard', 'expert'],
      },
    ],
  },
  {
    id: 'go',
    name: '围棋',
    nameEn: 'Go',
    version: '0.1.0',
    description: '中国传统棋类，天元落子，谋局布阵',
    boardSize: { width: 19, height: 19 },
    players: { min: 2, max: 2 },
    status: 'coming_soon',
    author: 'TrustedGames',
    icon: '⬜',
    trustLevels: [],
    aiEngines: [],
  },
  {
    id: 'xiangqi',
    name: '中国象棋',
    nameEn: 'Xiangqi',
    version: '0.1.0',
    description: '楚河汉界，马走日象走田',
    boardSize: { width: 9, height: 10 },
    players: { min: 2, max: 2 },
    status: 'coming_soon',
    author: 'TrustedGames',
    icon: '🔴',
    trustLevels: [],
    aiEngines: [],
  },
  {
    id: 'chess',
    name: '国际象棋',
    nameEn: 'Chess',
    version: '0.1.0',
    description: '经典策略对战，王车易位，将军制胜',
    boardSize: { width: 8, height: 8 },
    players: { min: 2, max: 2 },
    status: 'coming_soon',
    author: 'TrustedGames',
    icon: '♟',
    trustLevels: [],
    aiEngines: [],
  },
]

export function getInstalledGames() {
  return GAME_CATALOG.filter((g) => g.status === 'installed')
}

export function getGameById(id) {
  return GAME_CATALOG.find((g) => g.id === id)
}

export function getAllGames() {
  return GAME_CATALOG
}
