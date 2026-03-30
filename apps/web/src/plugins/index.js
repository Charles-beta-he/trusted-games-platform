/**
 * 热插拔游戏插件注册表
 *
 * GamePluginDescriptor 接口：
 *   id, name, nameEn, version, description, boardSize, players,
 *   status: 'installed' | 'coming_soon',
 *   icon, author, trustLevels,
 *   aiEngines: AIEngineDescriptor[],
 *   ranked, p2pEnabled, aiEnabled, eloKey,
 *   aiSide,            // AI 执哪一方（数值 = currentPlayer 的 AI 值），null 表示 player 2
 *   aiStyleEnabled,    // AI 面板是否展示风格选择器（Minimax 类游戏有风格）
 *   aiDescription,     // AI 面板底部额外说明文字（null = 无）
 *   localDescription,  // 本地对战说明文字
 *
 * 运行时只有 status==='installed' 的插件可以加载。
 * 接入新游戏只需在此注册描述符并提供对应页面/hook/AI handler。
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
    trustLevels: ['L3', 'L4', 'L5'],
    aiEngines: [
      {
        id: 'gomoku-minimax-v1',
        name: 'Minimax α-β',
        algorithm: 'minimax',
        version: '1.0.0',
        difficulties: ['easy', 'medium', 'hard', 'expert'],
      },
    ],
    ranked: true,
    p2pEnabled: true,
    aiEnabled: true,
    eloKey: 'elo',
    aiSide: 2,
    aiStyleEnabled: true,
    aiDescription: null,
    localDescription: '两名玩家在同一设备上轮流落子。黑方先行。',
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
    ranked: false,
    p2pEnabled: false,
    aiEnabled: false,
    eloKey: null,
    aiSide: null,
    aiStyleEnabled: false,
    aiDescription: null,
    localDescription: '两名玩家在同一设备上轮流落子。',
  },
  {
    id: 'xiangqi',
    name: '中国象棋',
    nameEn: 'Xiangqi',
    version: '0.2.0',
    description: '楚河汉界：本地/人机，规则在 @tg/core，P2P 待接',
    boardSize: { width: 9, height: 10 },
    players: { min: 2, max: 2 },
    status: 'installed',
    author: 'TrustedGames',
    icon: '🔴',
    trustLevels: [],
    aiEngines: [
      {
        id: 'xiangqi-heuristic-v1',
        name: '启发式评估',
        algorithm: 'heuristic',
        version: '1.0.0',
        difficulties: ['easy', 'medium', 'hard', 'expert'],
      },
    ],
    ranked: false,
    p2pEnabled: false,
    aiEnabled: true,
    eloKey: 'elo_xiangqi',
    aiSide: -1,
    aiStyleEnabled: false,
    aiDescription: '你执红先行，AI 执黑。棋力为启发式评估（非五子棋 Minimax）。',
    localDescription: '两名玩家在同一设备上轮流行棋。红方先行。',
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
    ranked: false,
    p2pEnabled: false,
    aiEnabled: false,
    eloKey: null,
    aiSide: null,
    aiStyleEnabled: false,
    aiDescription: null,
    localDescription: '两名玩家在同一设备上轮流行棋。白方先行。',
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

/** 支持 P2P 的默认游戏 ID（用于 LobbyPage 快速加入） */
export const P2P_GAME_ID = GAME_CATALOG.find((g) => g.p2pEnabled)?.id ?? 'gomoku'
