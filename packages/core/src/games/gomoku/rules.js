/**
 * 五子棋规则：标准 free-style 与连珠（Renju）黑方禁手。
 * 棋盘坐标与 @tg/core/constants BOARD_SIZE=15 一致。
 */

export const RULES = {
  standard: {
    id: 'standard',
    name: '自由五子棋',
    winLength: 5,
    /** 允许多于五子一线仍判胜（常见休闲规则） */
    allowOverline: true,
    blackRestrictions: false,
  },
  renju: {
    id: 'renju',
    name: '连珠（黑禁手）',
    winLength: 5,
    /** 黑方连成六子或以上为禁手；白方无此限 */
    allowOverline: false,
    blackRestrictions: true,
  },
}

export const DEFAULT_RULE = 'standard'

const DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
]

export function validateMove(board, r, c, player, ruleId = DEFAULT_RULE) {
  const size = board.length
  if (r < 0 || r >= size || c < 0 || c >= size) {
    return { valid: false, reason: 'out_of_bounds' }
  }
  if (board[r][c] !== 0) return { valid: false, reason: 'occupied' }

  const rule = RULES[ruleId] ?? RULES.standard

  const trial = board.map((row) => [...row])
  trial[r][c] = player

  /** 连珠：仅黑方禁止长连；标准且无 allowOverline 时对双方都禁 */
  if (!rule.allowOverline) {
    const forbidOverline = rule.blackRestrictions ? player === 1 : true
    if (forbidOverline) {
      for (const [dr, dc] of DIRS) {
        const len = consecutiveLength(trial, r, c, dr, dc, player)
        if (len > rule.winLength) {
          const reason =
            rule.blackRestrictions && player === 1 ? 'renju_overline' : 'overline'
          return { valid: false, reason }
        }
      }
    }
  }

  if (rule.blackRestrictions && player === 1) {
    if (renjuBlackOpenThreeCount(trial, r, c, size) >= 2) {
      return { valid: false, reason: 'renju_double_three' }
    }
    if (renjuBlackDoubleFour(trial, r, c, size)) {
      return { valid: false, reason: 'renju_double_four' }
    }
  }

  return { valid: true }
}

function consecutiveLength(board, r, c, dr, dc, color) {
  let len = 1
  for (let d = 1; d < 16; d++) {
    const nr = r + dr * d
    const nc = c + dc * d
    if (nr < 0 || nr >= board.length || nc < 0 || nc >= board.length) break
    if (board[nr][nc] !== color) break
    len++
  }
  for (let d = 1; d < 16; d++) {
    const nr = r - dr * d
    const nc = c - dc * d
    if (nr < 0 || nr >= board.length || nc < 0 || nc >= board.length) break
    if (board[nr][nc] !== color) break
    len++
  }
  return len
}

/** 该方向上是否形成「活三」：恰好三子连、两端紧邻为空（可扩展成五） */
function hasOpenThree(board, r, c, dr, dc, size, color) {
  let lenP = 0
  let lenN = 0
  for (let d = 1; d < 6; d++) {
    const nr = r + dr * d
    const nc = c + dc * d
    if (nr < 0 || nr >= size || nc < 0 || nc >= size || board[nr][nc] !== color) break
    lenP++
  }
  for (let d = 1; d < 6; d++) {
    const nr = r - dr * d
    const nc = c - dc * d
    if (nr < 0 || nr >= size || nc < 0 || nc >= size || board[nr][nc] !== color) break
    lenN++
  }
  const run = lenP + lenN + 1
  if (run !== 3) return false

  const erP = r + dr * (lenP + 1)
  const ecP = c + dc * (lenP + 1)
  const erN = r - dr * (lenN + 1)
  const ecN = c - dc * (lenN + 1)

  const openP =
    erP >= 0 &&
    erP < size &&
    ecP >= 0 &&
    ecP < size &&
    board[erP][ecP] === 0
  const openN =
    erN >= 0 &&
    erN < size &&
    ecN >= 0 &&
    ecN < size &&
    board[erN][ecN] === 0

  return openP && openN
}

function renjuBlackOpenThreeCount(board, r, c, size) {
  let cnt = 0
  const seen = new Set()
  for (const [dr, dc] of DIRS) {
    const key = dr * 16 + dc
    const okey = (-dr) * 16 + (-dc)
    if (seen.has(key) || seen.has(okey)) continue
    seen.add(key)
    if (hasOpenThree(board, r, c, dr, dc, size, 1)) cnt++
  }
  return cnt
}

/** 简化四四：在两个不同方向上各有一段连续 4+ 黑子（含新落点） */
function renjuBlackDoubleFour(board, r, c, size) {
  let dirsWith4 = 0
  const counted = new Set()
  for (const [dr, dc] of DIRS) {
    const key = dr <= 0 && dc < 0 ? `${-dr},${-dc}` : `${dr},${dc}`
    if (counted.has(key)) continue
    counted.add(key)
    if (consecutiveLength(board, r, c, dr, dc, 1) >= 4) dirsWith4++
  }
  return dirsWith4 >= 2
}
