/**
 * 热插拔游戏插件注册表
 *
 * GamePluginDescriptor 接口：
 *   id, name, nameEn, version, description, boardSize, players,
 *   status: 'installed' | 'coming_soon',
 *   icon, author, trustLevels,
 *   aiEngines: AIEngineDescriptor[],
 *   ranked, p2pEnabled, aiEnabled, eloKey,
 *   aiSide,          // AI 执哪一方（currentPlayer 等于此值时 AI 行棋）
 *   aiDescription,   // AI 面板底部补充说明（可选）
 *   localDescription,// 本地双人说明文字
 *   aiParams: AiParamSchema[]  // AI 可配置参数声明，空数组 = 无额外配置
 *
 * AiParamSchema:
 *   { id, label, type: 'select', options: [{ id, label, desc, icon }], default }
 *
 * 接入新游戏：注册此描述符 + 创建页面 + PlayPage 加一行 lazy + ai.worker 加一个 handler。
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
        name: 'Minimax α-β + Zobrist',
        algorithm: 'minimax',
        version: '1.0.0',
        difficulties: {
          easy:   { label: '贪心 1-ply',      depth: 1 },
          medium: { label: 'Minimax α-β d3',  depth: 3 },
          hard:   { label: 'Minimax α-β d4',  depth: 4 },
          expert: { label: 'Minimax α-β d5',  depth: 5 },
        },
      },
    ],
    ranked: true,
    p2pEnabled: true,
    aiEnabled: true,
    eloKey: 'elo',
    aiSide: 2,
    aiDescription: null,
    localDescription: '两名玩家在同一设备上轮流落子。黑方先行。',
    aiParams: [
      {
        id: 'style',
        label: '棋风 · STYLE',
        type: 'select',
        options: [
          { id: 'balanced',   label: '均衡', nameEn: 'Balanced',   desc: '攻守平衡，标准博弈',    icon: '⚖' },
          { id: 'aggressive', label: '强攻', nameEn: 'Aggressive', desc: '优先构建威胁，主动进攻', icon: '⚔' },
          { id: 'defensive',  label: '稳守', nameEn: 'Defensive',  desc: '优先封堵对手，稳健应对', icon: '🛡' },
          { id: 'chaotic',    label: '随性', nameEn: 'Chaotic',    desc: '带有随机性，走法难以预测', icon: '🎲' },
          { id: 'personal',   label: '个人', nameEn: 'Personal',   desc: '使用 Style Center 中的自定义参数', icon: '✦' },
        ],
        default: 'balanced',
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
    ranked: false,
    p2pEnabled: false,
    aiEnabled: false,
    eloKey: null,
    aiSide: null,
    aiDescription: null,
    localDescription: '两名玩家在同一设备上轮流落子。',
    aiParams: [],
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
        id: 'xiangqi-negamax-v2',
        name: 'α-β Negamax + PST',
        algorithm: 'negamax',
        version: '2.0.0',
        difficulties: {
          easy:   { label: '随机走法',          depth: 0 },
          medium: { label: '贪心吃子',           depth: 0 },
          hard:   { label: 'α-β Negamax d2',    depth: 2 },
          expert: { label: 'α-β Negamax d3',    depth: 3 },
        },
      },
    ],
    ranked: false,
    p2pEnabled: false,
    aiEnabled: true,
    eloKey: 'elo_xiangqi',
    aiSide: -1,
    aiDescription: '你执红先行，AI 执黑。',
    localDescription: '两名玩家在同一设备上轮流行棋。红方先行。',
    aiParams: [
      {
        id: 'aggression',
        label: '进取性 · AGGRESSION',
        type: 'select',
        options: [
          { id: 'conservative', label: '稳健', nameEn: 'Conservative', desc: '轻吃子，重守势', icon: '🛡' },
          { id: 'balanced',     label: '均衡', nameEn: 'Balanced',     desc: '攻守兼备',       icon: '⚖' },
          { id: 'aggressive',   label: '凶猛', nameEn: 'Aggressive',   desc: '重吃子，求将军', icon: '⚔' },
        ],
        default: 'balanced',
      },
      {
        id: 'noise',
        label: '随机性 · RANDOMNESS',
        type: 'select',
        options: [
          { id: 'none',   label: '确定', nameEn: 'Deterministic', desc: '走法固定，最优解', icon: '📐' },
          { id: 'slight', label: '轻微', nameEn: 'Slight',        desc: '偶有变化，较难预测', icon: '〰' },
          { id: 'high',   label: '高度', nameEn: 'Chaotic',       desc: '飘忽不定，风格多变', icon: '🎲' },
        ],
        default: 'slight',
      },
    ],
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
    aiDescription: null,
    localDescription: '两名玩家在同一设备上轮流行棋。白方先行。',
    aiParams: [],
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
