/**
 * AI 棋风系统
 *
 * StyleProfile 影响评估函数的权重：
 *   attack  — 己方威胁评分倍率（越高越主动进攻）
 *   defense — 对方威胁压制倍率（越高越积极防守）
 *   center  — 中腹落子偏好（0 = 无偏好，1 = 强烈偏好中腹）
 *   noise   — 随机噪声系数（0 = 确定性，>0 增加随机性）
 */

export const STYLE_PRESETS = {
  balanced: {
    id: 'balanced',
    name: '均衡',
    nameEn: 'Balanced',
    desc: '攻守平衡，标准博弈',
    icon: '⚖',
    params: { attack: 1.0, defense: 1.1, center: 0.0, noise: 0.0 },
  },
  aggressive: {
    id: 'aggressive',
    name: '强攻',
    nameEn: 'Aggressive',
    desc: '优先构建威胁，主动进攻',
    icon: '⚔',
    params: { attack: 1.6, defense: 0.7, center: 0.3, noise: 0.0 },
  },
  defensive: {
    id: 'defensive',
    name: '稳守',
    nameEn: 'Defensive',
    desc: '优先封堵对手，稳健应对',
    icon: '🛡',
    params: { attack: 0.7, defense: 1.6, center: 0.0, noise: 0.0 },
  },
  chaotic: {
    id: 'chaotic',
    name: '随性',
    nameEn: 'Chaotic',
    desc: '带有随机性，走法难以预测',
    icon: '🎲',
    params: { attack: 1.0, defense: 1.0, center: 0.0, noise: 0.35 },
  },
}

export const STYLE_PRESET_LIST = Object.values(STYLE_PRESETS)

/** 个人棋风的 localStorage key */
export const PERSONAL_STYLE_KEY = 'tg_personal_style'

/** 读取已保存的个人棋风，无则返回 null */
export function loadPersonalStyle() {
  try {
    const raw = localStorage.getItem(PERSONAL_STYLE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** 保存个人棋风 */
export function savePersonalStyle(profile) {
  localStorage.setItem(PERSONAL_STYLE_KEY, JSON.stringify(profile))
}

/** 获取当前生效的样式参数（fallback 到 balanced） */
export function resolveStyle(styleId) {
  if (styleId === 'personal') {
    const personal = loadPersonalStyle()
    return personal?.params ?? STYLE_PRESETS.balanced.params
  }
  return STYLE_PRESETS[styleId]?.params ?? STYLE_PRESETS.balanced.params
}
