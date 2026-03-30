/**
 * 中国象棋走法与将军判定（标准棋规：马蹩腿、象塞眼、炮隔山、将帅不见面）。
 * 坐标：10 行 × 9 列，row 0 为黑方底线，row 9 为红方底线；黑子为负、红子为正。
 */

export const ROWS = 10
export const COLS = 9

export const P = {
  GENERAL: 1,
  ADVISOR: 2,
  ELEPHANT: 3,
  HORSE: 4,
  CHARIOT: 5,
  CANNON: 6,
  SOLDIER: 7,
}

const abs = Math.abs

function side(p) {
  if (p > 0) return 1
  if (p < 0) return -1
  return 0
}

/** 将/帅是否在九宫内 */
function inPalace(r, c, red) {
  if (c < 3 || c > 5) return false
  if (red) return r >= 7 && r <= 9
  return r >= 0 && r <= 2
}

function isRed(p) {
  return p > 0
}

/** 兵是否已过河 */
function soldierCrossedRiver(r, red) {
  if (red) return r <= 4
  return r >= 5
}

export function createInitialBoard() {
  const b = Array.from({ length: ROWS }, () => new Array(COLS).fill(0))
  const backRow = [
    P.CHARIOT,
    P.HORSE,
    P.ELEPHANT,
    P.ADVISOR,
    P.GENERAL,
    P.ADVISOR,
    P.ELEPHANT,
    P.HORSE,
    P.CHARIOT,
  ]
  backRow.forEach((p, c) => {
    b[9][c] = p
  })
  b[7][1] = P.CANNON
  b[7][7] = P.CANNON
  for (let c = 0; c < 9; c += 2) b[6][c] = P.SOLDIER

  backRow.forEach((p, c) => {
    b[0][c] = -p
  })
  b[2][1] = -P.CANNON
  b[2][7] = -P.CANNON
  for (let c = 0; c < 9; c += 2) b[3][c] = -P.SOLDIER
  return b
}

/** 将帅是否照面（同一列上无子相隔） */
export function generalsFace(board, sr, sc, tr, tc) {
  const tb = board.map((row) => [...row])
  const p = tb[sr][sc]
  tb[sr][sc] = 0
  tb[tr][tc] = p

  let gr = -1
  let gc = -1
  let br = -1
  let bc = -1
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (tb[r][c] === P.GENERAL) {
        gr = r
        gc = c
      }
      if (tb[r][c] === -P.GENERAL) {
        br = r
        bc = c
      }
    }
  }
  if (gr < 0 || br < 0) return false
  if (gc !== bc) return false
  const lo = Math.min(gr, br)
  const hi = Math.max(gr, br)
  for (let r = lo + 1; r < hi; r++) {
    if (tb[r][gc] !== 0) return false
  }
  return true
}

function addRookSteps(board, r, c, piece, out, captureOnly = false) {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]
  for (const [dr, dc] of dirs) {
    for (let i = 1; i < 16; i++) {
      const nr = r + dr * i
      const nc = c + dc * i
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break
      const t = board[nr][nc]
      if (t === 0) {
        if (!captureOnly) out.push([nr, nc])
      } else {
        if (side(t) !== side(piece)) out.push([nr, nc])
        break
      }
    }
  }
}

function addCannonMoves(board, r, c, piece, out) {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]
  for (const [dr, dc] of dirs) {
    let i = 1
    while (true) {
      const nr = r + dr * i
      const nc = c + dc * i
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break
      if (board[nr][nc] === 0) out.push([nr, nc])
      else {
        let j = i + 1
        while (true) {
          const nr2 = r + dr * j
          const nc2 = c + dc * j
          if (nr2 < 0 || nr2 >= ROWS || nc2 < 0 || nc2 >= COLS) break
          const t2 = board[nr2][nc2]
          if (t2 === 0) {
            j++
            continue
          }
          if (side(t2) !== side(piece)) out.push([nr2, nc2])
          break
        }
        break
      }
      i++
    }
  }
}

/** 马八向：绊马腿占用格 */
const KNIGHT_DELTAS = [
  { dr: 2, dc: 1, br: 1, bc: 0 },
  { dr: 2, dc: -1, br: 1, bc: 0 },
  { dr: -2, dc: 1, br: -1, bc: 0 },
  { dr: -2, dc: -1, br: -1, bc: 0 },
  { dr: 1, dc: 2, br: 0, bc: 1 },
  { dr: 1, dc: -2, br: 0, bc: -1 },
  { dr: -1, dc: 2, br: 0, bc: 1 },
  { dr: -1, dc: -2, br: 0, bc: -1 },
]

function addHorseMoves(board, r, c, piece, out) {
  for (const { dr, dc, br, bc } of KNIGHT_DELTAS) {
    const lr = r + br
    const lc = c + bc
    if (lr < 0 || lr >= ROWS || lc < 0 || lc >= COLS || board[lr][lc] !== 0) continue
    const nr = r + dr
    const nc = c + dc
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
    const t = board[nr][nc]
    if (t === 0 || side(t) !== side(piece)) out.push([nr, nc])
  }
}

const ELEPHANT_DELTAS = [
  { dr: 2, dc: 2, er: 1, ec: 1 },
  { dr: 2, dc: -2, er: 1, ec: -1 },
  { dr: -2, dc: 2, er: -1, ec: 1 },
  { dr: -2, dc: -2, er: -1, ec: -1 },
]

function addElephantMoves(board, r, c, piece, out) {
  const red = isRed(piece)
  for (const { dr, dc, er, ec } of ELEPHANT_DELTAS) {
    const erf = r + er
    const ecf = c + ec
    if (erf < 0 || erf >= ROWS || ecf < 0 || ecf >= COLS || board[erf][ecf] !== 0) continue
    const nr = r + dr
    const nc = c + dc
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
    if (red) {
      if (nr < 5) continue
    } else {
      if (nr > 4) continue
    }
    const t = board[nr][nc]
    if (t === 0 || side(t) !== side(piece)) out.push([nr, nc])
  }
}

function addAdvisorMoves(board, r, c, piece, out) {
  const red = isRed(piece)
  const steps = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]
  for (const [dr, dc] of steps) {
    const nr = r + dr
    const nc = c + dc
    if (!inPalace(nr, nc, red)) continue
    const t = board[nr][nc]
    if (t === 0 || side(t) !== side(piece)) out.push([nr, nc])
  }
}

function addGeneralMoves(board, r, c, piece, out) {
  const red = isRed(piece)
  const orth = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]
  for (const [dr, dc] of orth) {
    const nr = r + dr
    const nc = c + dc
    if (!inPalace(nr, nc, red)) continue
    const t = board[nr][nc]
    if (t === 0 || side(t) !== side(piece)) out.push([nr, nc])
  }
}

function addSoldierMoves(board, r, c, piece, out) {
  const red = isRed(piece)
  const forward = red ? -1 : 1
  const nr = r + forward
  if (nr >= 0 && nr < ROWS) {
    const t = board[nr][c]
    if (t === 0 || side(t) !== side(piece)) out.push([nr, c])
  }
  if (soldierCrossedRiver(r, red)) {
    for (const dc of [-1, 1]) {
      const nc = c + dc
      if (nc < 0 || nc >= COLS) continue
      const t = board[r][nc]
      if (t === 0 || side(t) !== side(piece)) out.push([r, nc])
    }
  }
}

/** 某格上棋子的所有伪合法落点（未滤将、将帅照面） */
export function getPseudoLegalMoves(board, r, c) {
  const piece = board[r][c]
  if (piece === 0) return []
  const tp = abs(piece)
  const out = []
  switch (tp) {
    case P.GENERAL:
      addGeneralMoves(board, r, c, piece, out)
      break
    case P.ADVISOR:
      addAdvisorMoves(board, r, c, piece, out)
      break
    case P.ELEPHANT:
      addElephantMoves(board, r, c, piece, out)
      break
    case P.HORSE:
      addHorseMoves(board, r, c, piece, out)
      break
    case P.CHARIOT:
      addRookSteps(board, r, c, piece, out, false)
      break
    case P.CANNON:
      addCannonMoves(board, r, c, piece, out)
      break
    case P.SOLDIER:
      addSoldierMoves(board, r, c, piece, out)
      break
    default:
      break
  }
  return out
}

export function applyMove(board, fr, fc, tr, tc) {
  const next = board.map((row) => [...row])
  next[tr][tc] = next[fr][fc]
  next[fr][fc] = 0
  return next
}

export function findGeneral(board, playerSide) {
  const target = playerSide > 0 ? P.GENERAL : -P.GENERAL
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === target) return [r, c]
    }
  }
  return null
}

/** 某方老将是否被「将军」 */
export function isInCheck(board, friendlySide) {
  const gen = findGeneral(board, friendlySide)
  if (!gen) return false
  const [gr, gc] = gen
  const opp = -friendlySide
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (side(board[r][c]) !== opp) continue
      const moves = getPseudoLegalMoves(board, r, c)
      for (const [tr, tc] of moves) {
        if (tr === gr && tc === gc) return true
      }
    }
  }
  return false
}

/** 含「不等于送将」「不走成将帅照面」的合法着法 */
export function getValidMoves(board, r, c) {
  const piece = board[r][c]
  if (piece === 0) return []
  const side_ = side(piece)
  const pseudo = getPseudoLegalMoves(board, r, c)
  const legal = []
  for (const [tr, tc] of pseudo) {
    if (generalsFace(board, r, c, tr, tc)) continue
    const next = applyMove(board, r, c, tr, tc)
    if (!isInCheck(next, side_)) legal.push([tr, tc])
  }
  return legal
}

/**
 * 当前行棋方是否被将死（无合法着法）。
 * @param {number} sideToMove 1 红先或轮到红，-1 黑
 */
export function isCheckmate(board, sideToMove) {
  if (!isInCheck(board, sideToMove)) return false
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (side(board[r][c]) !== sideToMove) continue
      if (getValidMoves(board, r, c).length > 0) return false
    }
  }
  return true
}

export function isStalemate(board, sideToMove) {
  if (isInCheck(board, sideToMove)) return false
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (side(board[r][c]) !== sideToMove) continue
      if (getValidMoves(board, r, c).length > 0) return false
    }
  }
  return true
}

// ── AI 评估系统 ──────────────────────────────────────────────────────────────

/**
 * 棋子基础分值（厘兵 centipawn，兵=100）。
 * 将帅取极大值用于将死检测；其余参考象棋棋子价值惯例。
 */
const PIECE_BASE_VALUE = {
  [P.GENERAL]:  100000,
  [P.CHARIOT]:    900,
  [P.CANNON]:     450,
  [P.HORSE]:      400,
  [P.ADVISOR]:    200,
  [P.ELEPHANT]:   200,
  [P.SOLDIER]:    100,
}

/**
 * 棋子位置奖励。
 * pieceSide: 1=红, -1=黑。fwd 为前进方向上的距离（0=本阵底，9=对方阵底）。
 */
function positionalBonus(type, r, c, pieceSide) {
  const fwd = pieceSide === 1 ? 9 - r : r  // 0=本阵, 9=对方底

  switch (type) {
    case P.CHARIOT: {
      // 偏好中路纵线 + 适度前插
      const center = c >= 3 && c <= 5 ? 15 : 0
      return center + Math.min(fwd * 2, 20)
    }
    case P.CANNON: {
      // 偏好中部横列、中路纵线（炮台）
      const center = c >= 2 && c <= 6 ? 15 : 0
      const rank = fwd >= 2 && fwd <= 6 ? 10 : 0
      return center + rank
    }
    case P.HORSE: {
      // 强偏好中腹，边角重惩
      const distR = abs(r - 4.5)
      const distC = abs(c - 4)
      return Math.max(-30, 30 - (distR + distC) * 8)
    }
    case P.SOLDIER: {
      // 过河前无奖励；过河后按前进距离 + 中路加分
      const crossed = pieceSide === 1 ? r <= 4 : r >= 5
      if (!crossed) return 0
      const adv = fwd * 20
      const center = c >= 2 && c <= 6 ? 15 : 0
      return adv + center
    }
    case P.ADVISOR: {
      // 偏好九宫中心（红 r=8,c=4；黑 r=1,c=4）
      const pr = pieceSide === 1 ? 8 : 1
      return r === pr && c === 4 ? 15 : 0
    }
    default:
      return 0
  }
}

/**
 * 静态局面估值。正值 = 对 sideToMove 有利。
 */
function evaluate(board, sideToMove) {
  let score = 0
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c]
      if (p === 0) continue
      const type = abs(p)
      const pSide = side(p)
      const val = PIECE_BASE_VALUE[type] + positionalBonus(type, r, c, pSide)
      score += pSide === sideToMove ? val : -val
    }
  }
  return score
}

/**
 * α-β Negamax 搜索。返回对 sideToMove 的分值。
 * 使用 MVV-LVA 着法排序以提升剪枝效率。
 */
function xqNegamax(board, depth, alpha, beta, sideToMove) {
  if (depth === 0) return evaluate(board, sideToMove)

  const moves = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (side(board[r][c]) !== sideToMove) continue
      for (const [tr, tc] of getValidMoves(board, r, c)) {
        moves.push({ fr: r, fc: c, tr, tc, cap: board[tr][tc] })
      }
    }
  }

  if (moves.length === 0) {
    // 将死 or 困毙
    return isInCheck(board, sideToMove) ? -100000 - depth : 0
  }

  // MVV-LVA：高价值吃子优先
  moves.sort((a, b) => PIECE_BASE_VALUE[abs(b.cap)] - PIECE_BASE_VALUE[abs(a.cap)])

  let best = -Infinity
  for (const m of moves) {
    const next = applyMove(board, m.fr, m.fc, m.tr, m.tc)
    const val = -xqNegamax(next, depth - 1, -beta, -alpha, -sideToMove)
    if (val > best) best = val
    if (val > alpha) alpha = val
    if (alpha >= beta) break
  }
  return best
}

// 吃子移动排序分（用于 easy/medium 层的贪心排序，保留原有行为）
const PIECE_CAPTURE_SCORE = {
  [P.GENERAL]: 20000,
  [P.ADVISOR]: 25,
  [P.ELEPHANT]: 25,
  [P.HORSE]: 45,
  [P.CHARIOT]: 95,
  [P.CANNON]: 48,
  [P.SOLDIER]: 12,
}

function captureScore(cell) {
  if (cell === 0) return 0
  const v = PIECE_CAPTURE_SCORE[abs(cell)]
  return v ?? 0
}

/**
 * 象棋 AI — 四档难度，各使用不同算法：
 *   easy:   纯随机
 *   medium: 贪心吃子（优先吃高价子）
 *   hard:   α-β Negamax depth 2 + 位置评估
 *   expert: α-β Negamax depth 3 + 位置评估
 *
 * @param {object} [aiParams]
 *   aggression: 'conservative' | 'balanced' | 'aggressive'
 *     hard/expert: 在 top-pool 内偏好吃子或保守走法
 *   noise: 'none' | 'slight' | 'high'
 *     hard/expert: 控制 top-pool 宽度（centipawn margin）
 *
 * @returns {{ fr, fc, tr, tc } | null}
 */
export function getBestMove(board, sideToMove, difficulty = 'medium', aiParams = {}) {
  const moves = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (side(board[r][c]) !== sideToMove) continue
      for (const [tr, tc] of getValidMoves(board, r, c)) {
        moves.push({ fr: r, fc: c, tr, tc, cap: board[tr][tc] })
      }
    }
  }
  if (moves.length === 0) return null

  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

  // ── easy: 纯随机 ────────────────────────────────────────────────────────
  if (difficulty === 'easy') return pickRandom(moves)

  // ── medium: 贪心吃子 ────────────────────────────────────────────────────
  if (difficulty === 'medium') {
    const captures = moves.filter((m) => m.cap !== 0)
    if (captures.length > 0 && Math.random() > 0.35) {
      captures.sort((a, b) => captureScore(b.cap) - captureScore(a.cap))
      return captures[0]
    }
    return pickRandom(moves)
  }

  // ── hard / expert: α-β Negamax ──────────────────────────────────────────
  const SEARCH_DEPTH = { hard: 2, expert: 3 }
  const depth = SEARCH_DEPTH[difficulty] ?? 2

  // noise 控制 top-pool margin（centipawn）
  const NOISE_MARGIN = { none: 0, slight: 80, high: 300 }
  const margin = NOISE_MARGIN[aiParams?.noise] ?? NOISE_MARGIN.slight

  // 根节点着法排序：高价吃子先搜（提升 α-β 效率）
  moves.sort((a, b) => PIECE_BASE_VALUE[abs(b.cap)] - PIECE_BASE_VALUE[abs(a.cap)])

  const results = moves.map((m) => {
    const next = applyMove(board, m.fr, m.fc, m.tr, m.tc)
    const val = -xqNegamax(next, depth - 1, -Infinity, Infinity, -sideToMove)
    return { m, val }
  })
  results.sort((a, b) => b.val - a.val)

  const topScore = results[0].val
  const pool = results.filter((x) => x.val >= topScore - margin).map((x) => x.m)

  // aggression: 在 top-pool 内进一步筛选风格
  if (aiParams?.aggression === 'aggressive') {
    const capPool = pool.filter((m) => m.cap !== 0)
    if (capPool.length > 0) return pickRandom(capPool)
  }
  if (aiParams?.aggression === 'conservative') {
    const safePool = pool.filter((m) => m.cap === 0)
    if (safePool.length > 0 && Math.random() > 0.3) return pickRandom(safePool)
  }

  return pickRandom(pool)
}
