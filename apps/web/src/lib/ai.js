import { BOARD_SIZE, SCORE, DIFFICULTY_CONFIG } from '@tg/core'
import { resolveStyle } from './ai-styles.js'

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

// ---------------------------------------------------------------------------
// Worker API: compute best move asynchronously
// ---------------------------------------------------------------------------

export async function computeBestMoveAsync(board, game, difficulty, aiParams) {
  return new Promise((resolve, reject) => {
    if (typeof Worker !== 'undefined') {
      const worker = new Worker(new URL('./ai.worker.js', import.meta.url), { type: 'module' })
      worker.postMessage({ id: 'root', game, board, difficulty, aiParams })
      
      const timeout = setTimeout(() => {
        worker.terminate()
        reject(new Error('AI computation timeout'))
      }, 10000)
      
      worker.onmessage = (e) => {
        clearTimeout(timeout)
        worker.terminate()
        if (e.data.error) reject(new Error(e.data.error))
        else resolve(e.data.move)
      }
      
      worker.onerror = (err) => {
        clearTimeout(timeout)
        worker.terminate()
        reject(err)
      }
    } else {
      // Fallback for Node.js testing
      const style = resolveStyle(aiParams?.style ?? 'balanced')
      const timeLimitMs = aiParams?.timeLimitMs ?? 2000
      resolve(getBestMove(board, difficulty, style, { ...aiParams, timeLimitMs }))
    }
  })
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

export function getCandidates(board, limit = null) {
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
    .slice(0, limit ?? Number.POSITIVE_INFINITY)
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

const TIMEOUT = Symbol('AI_SEARCH_TIMEOUT')
function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function minimax(board, depth, alpha, beta, maximizing, ai, human, style, hash, endTimeMs) {
  if (endTimeMs !== Infinity && nowMs() >= endTimeMs) throw TIMEOUT
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

  // Candidate beam-width: keep branching factor under control as depth increases.
  const beam =
    depth >= 3 ? 16
      : depth === 2 ? 20
        : depth === 1 ? 24
          : 0
  const candidates = beam > 0 ? getCandidates(board, beam) : getCandidates(board)
  const originalAlpha = alpha

  if (maximizing) {
    let best = -Infinity
    for (const { r, c } of candidates) {
      board[r][c] = ai
      try {
        const newHash = updateHash(hash, r, c, ai)
        if (checkWinBoard(board, r, c, ai)) return SCORE.FIVE * 10
        const val = minimax(board, depth - 1, alpha, beta, false, ai, human, style, newHash, endTimeMs)
        best = Math.max(best, val)
        alpha = Math.max(alpha, best)
        if (beta <= alpha) break
      } finally {
        board[r][c] = 0
      }
    }
    const flag = best <= originalAlpha ? 'upper' : best >= beta ? 'lower' : 'exact'
    _ttStore(key, depth, best, flag)
    return best
  } else {
    let best = Infinity
    const originalBeta = beta
    for (const { r, c } of candidates) {
      board[r][c] = human
      try {
        const newHash = updateHash(hash, r, c, human)
        if (checkWinBoard(board, r, c, human)) return -SCORE.FIVE * 10
        const val = minimax(board, depth - 1, alpha, beta, true, ai, human, style, newHash, endTimeMs)
        best = Math.min(best, val)
        beta = Math.min(beta, best)
        if (beta <= alpha) break
      } finally {
        board[r][c] = 0
      }
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

export function getBestMove(board, difficulty, style = DEFAULT_STYLE, aiParams = {}) {
  const ai = 2, human = 1
  const maxDepth = DIFFICULTY_CONFIG[difficulty]?.depth ?? 3
  const candidates = getCandidates(board)

  const timeLimitMs = aiParams?.timeLimitMs ?? 2000
  const endTimeMs = timeLimitMs > 0 ? nowMs() + timeLimitMs : Infinity

  // Immediate win
  for (const { r, c } of candidates) {
    board[r][c] = ai
    try {
      if (checkWinBoard(board, r, c, ai)) return { r, c }
    } finally {
      board[r][c] = 0
    }
  }
  // Block opponent
  for (const { r, c } of candidates) {
    board[r][c] = human
    try {
      if (checkWinBoard(board, r, c, human)) return { r, c }
    } finally {
      board[r][c] = 0
    }
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
    .slice(0, 26)

  // Compute initial board hash once before the search loop
  const rootHash = computeHash(board)

  let bestMove = null
  let lastCompletedMove = null

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (endTimeMs !== Infinity && nowMs() >= endTimeMs) break
    let best = -Infinity
    let curBestMove = null

    // PV move first: increases alpha-beta cutoffs for deeper iterations.
    const pv = lastCompletedMove
    const ordered = pv
      ? [...scored].sort((a, b) => (a.r === pv.r && a.c === pv.c) ? -1 : (b.r === pv.r && b.c === pv.c) ? 1 : 0)
      : scored

    try {
      for (const { r, c } of ordered) {
        if (endTimeMs !== Infinity && nowMs() >= endTimeMs) throw TIMEOUT
        board[r][c] = ai
        try {
          const childHash = updateHash(rootHash, r, c, ai)
          const val = minimax(board, depth - 1, -Infinity, Infinity, false, ai, human, style, childHash, endTimeMs)
          if (val > best) { best = val; curBestMove = { r, c } }
        } finally {
          board[r][c] = 0
        }
      }
      bestMove = curBestMove
      lastCompletedMove = curBestMove
    } catch (err) {
      if (err !== TIMEOUT) throw err
      break
    }
  }

  return bestMove ?? lastCompletedMove ?? scored[0]
}
