import { BOARD_SIZE, SCORE, DIFFICULTY_CONFIG } from './constants.js'

// ---------------------------------------------------------------------------
// Zobrist hashing — 15×15×2 random 32-bit pairs (simulating 64-bit keys)
// Index: player 0 = index 0..449, player 1 = index 450..899
// ---------------------------------------------------------------------------
const ZOBRIST_LO = new Uint32Array(BOARD_SIZE * BOARD_SIZE * 2)
const ZOBRIST_HI = new Uint32Array(BOARD_SIZE * BOARD_SIZE * 2)
;(function initZobrist() {
  for (let i = 0; i < ZOBRIST_LO.length; i++) {
    ZOBRIST_LO[i] = (Math.random() * 0x100000000) >>> 0
    ZOBRIST_HI[i] = (Math.random() * 0x100000000) >>> 0
  }
})()

// player: 1 or 2  →  offset 0 or 450
function _zobristIdx(r, c, player) {
  return (player - 1) * BOARD_SIZE * BOARD_SIZE + r * BOARD_SIZE + c
}

export function computeHash(board) {
  let lo = 0, hi = 0
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c]
      if (p !== 0) {
        const idx = _zobristIdx(r, c, p)
        lo ^= ZOBRIST_LO[idx]
        hi ^= ZOBRIST_HI[idx]
      }
    }
  }
  return [lo, hi]
}

// Returns a NEW hash array — does not mutate the input array.
export function updateHash(hash, r, c, player) {
  const idx = _zobristIdx(r, c, player)
  return [hash[0] ^ ZOBRIST_LO[idx], hash[1] ^ ZOBRIST_HI[idx]]
}

function hashKey(hash) {
  // Combine two 32-bit halves into a Number (safe up to 2^53)
  return hash[0] * 0x100000000 + hash[1]
}

// ---------------------------------------------------------------------------
// Transposition table
// ---------------------------------------------------------------------------
const TT_LIMIT = 200_000
let transpositionTable = new Map()

export function clearTranspositionTable() {
  transpositionTable = new Map()
}

// ---------------------------------------------------------------------------
// Traverse one ray from (r, c) in direction (dr, dc) and return the number of
// consecutive player stones and whether the ray ends on an open cell.
// ---------------------------------------------------------------------------
function countDirection(board, r, c, dr, dc, player) {
  let count = 0
  let openEnd = 0
  for (let d = 1; d <= 4; d++) {
    const nr = r + dr * d, nc = c + dc * d
    if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) break
    if (board[nr][nc] === player) count++
    else { if (board[nr][nc] === 0) openEnd = 1; break }
  }
  return { count, openEnd }
}

export function evaluatePosition(board, r, c, player) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  let total = 0

  for (const [dr, dc] of dirs) {
    const fwd = countDirection(board, r, c, dr, dc, player)
    const bwd = countDirection(board, r, c, -dr, -dc, player)
    const count = 1 + fwd.count + bwd.count
    const openEnds = fwd.openEnd + bwd.openEnd

    if (count >= 5) total += SCORE.FIVE
    else if (count === 4) total += openEnds === 2 ? SCORE.OPEN_FOUR : SCORE.HALF_FOUR
    else if (count === 3) total += openEnds === 2 ? SCORE.OPEN_THREE : SCORE.HALF_THREE
    else if (count === 2) total += openEnds === 2 ? SCORE.OPEN_TWO : SCORE.HALF_TWO
    else total += SCORE.ONE
  }

  return total
}

const DEFAULT_STYLE = { attack: 1.0, defense: 1.1, center: 0, noise: 0 }

export function boardScore(board, ai, human, style = DEFAULT_STYLE) {
  let score = 0
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === ai) {
        let s = evaluatePosition(board, r, c, ai) * style.attack
        if (style.center > 0) {
          const dist = Math.max(Math.abs(r - 7), Math.abs(c - 7))
          s += (7 - dist) * style.center * 2
        }
        score += s
      } else if (board[r][c] === human) {
        score -= evaluatePosition(board, r, c, human) * style.defense
      }
    }
  }
  return score
}

export function getCandidates(board) {
  const candidates = new Set()
  const range = 2
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== 0) {
        for (let dr = -range; dr <= range; dr++) {
          for (let dc = -range; dc <= range; dc++) {
            const nr = r + dr, nc = c + dc
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === 0) {
              candidates.add(nr * BOARD_SIZE + nc)
            }
          }
        }
      }
    }
  }
  if (candidates.size === 0) candidates.add(7 * BOARD_SIZE + 7)
  return Array.from(candidates)
    .map((idx) => {
      const r = Math.floor(idx / BOARD_SIZE), c = idx % BOARD_SIZE
      const score = Math.max(evaluatePosition(board, r, c, 1), evaluatePosition(board, r, c, 2))
      return { r, c, score }
    })
    .sort((a, b) => b.score - a.score)
    .map(({ r, c }) => ({ r, c }))
}

export function checkWinBoard(board, r, c, player) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  for (const [dr, dc] of dirs) {
    let count = 1
    for (let d = 1; d < 5; d++) {
      const nr = r + dr * d, nc = c + dc * d
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === player) count++
      else break
    }
    for (let d = 1; d < 5; d++) {
      const nr = r - dr * d, nc = c - dc * d
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === player) count++
      else break
    }
    if (count >= 5) return true
  }
  return false
}

function minimax(board, depth, alpha, beta, maximizing, ai, human, style, hash) {
  // ---------------------------------------------------------------------------
  // Transposition table lookup
  // ---------------------------------------------------------------------------
  const key = hashKey(hash)
  const ttEntry = transpositionTable.get(key)
  if (ttEntry !== undefined && ttEntry.depth >= depth) {
    if (ttEntry.flag === 'exact') return ttEntry.score
    if (ttEntry.flag === 'lower') alpha = Math.max(alpha, ttEntry.score)
    else if (ttEntry.flag === 'upper') beta = Math.min(beta, ttEntry.score)
    if (alpha >= beta) return ttEntry.score
  }

  if (depth === 0) {
    const score = boardScore(board, ai, human, style)
    // Store leaf node as exact
    _ttStore(key, depth, score, 'exact')
    return score
  }

  const candidates = getCandidates(board)
  const originalAlpha = alpha

  if (maximizing) {
    let best = -Infinity
    for (const { r, c } of candidates) {
      board[r][c] = ai
      const newHash = updateHash(hash, r, c, ai)
      if (checkWinBoard(board, r, c, ai)) { board[r][c] = 0; return SCORE.FIVE * 10 }
      const val = minimax(board, depth - 1, alpha, beta, false, ai, human, style, newHash)
      board[r][c] = 0
      best = Math.max(best, val)
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    const flag = best <= originalAlpha ? 'upper' : best >= beta ? 'lower' : 'exact'
    _ttStore(key, depth, best, flag)
    return best
  } else {
    let best = Infinity
    const originalBeta = beta
    for (const { r, c } of candidates) {
      board[r][c] = human
      const newHash = updateHash(hash, r, c, human)
      if (checkWinBoard(board, r, c, human)) { board[r][c] = 0; return -SCORE.FIVE * 10 }
      const val = minimax(board, depth - 1, alpha, beta, true, ai, human, style, newHash)
      board[r][c] = 0
      best = Math.min(best, val)
      beta = Math.min(beta, best)
      if (beta <= alpha) break
    }
    const flag = best >= originalBeta ? 'lower' : best <= alpha ? 'upper' : 'exact'
    _ttStore(key, depth, best, flag)
    return best
  }
}

function _ttStore(key, depth, score, flag) {
  if (transpositionTable.size >= TT_LIMIT) transpositionTable = new Map()
  transpositionTable.set(key, { depth, score, flag })
}

export function getBestMove(board, difficulty, style = DEFAULT_STYLE) {
  const ai = 2, human = 1
  const depth = DIFFICULTY_CONFIG[difficulty]?.depth ?? 3
  const candidates = getCandidates(board)

  // Immediate win
  for (const { r, c } of candidates) {
    board[r][c] = ai
    if (checkWinBoard(board, r, c, ai)) { board[r][c] = 0; return { r, c } }
    board[r][c] = 0
  }
  // Block opponent
  for (const { r, c } of candidates) {
    board[r][c] = human
    if (checkWinBoard(board, r, c, human)) { board[r][c] = 0; return { r, c } }
    board[r][c] = 0
  }

  if (difficulty === 'easy') {
    let best = -Infinity, bestMove = null
    for (const { r, c } of candidates) {
      board[r][c] = ai
      let s = evaluatePosition(board, r, c, ai) * style.attack
            - evaluatePosition(board, r, c, human) * style.defense
      if (style.noise > 0) s += (Math.random() - 0.5) * style.noise * SCORE.OPEN_THREE
      board[r][c] = 0
      if (s > best) { best = s; bestMove = { r, c } }
    }
    return bestMove
  }

  const scored = candidates
    .map(({ r, c }) => {
      board[r][c] = ai
      let s = evaluatePosition(board, r, c, ai)
      if (style.noise > 0) s += (Math.random() - 0.5) * style.noise * SCORE.OPEN_THREE
      board[r][c] = 0
      return { r, c, s }
    })
    .sort((a, b) => b.s - a.s)
    .slice(0, 20)

  // Compute initial board hash once before the search loop
  const rootHash = computeHash(board)

  let best = -Infinity, bestMove = null
  for (const { r, c } of scored) {
    board[r][c] = ai
    const childHash = updateHash(rootHash, r, c, ai)
    const val = minimax(board, depth - 1, -Infinity, Infinity, false, ai, human, style, childHash)
    board[r][c] = 0
    if (val > best) { best = val; bestMove = { r, c } }
  }
  return bestMove ?? scored[0]
}
