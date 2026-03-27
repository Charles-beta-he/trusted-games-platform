import { BOARD_SIZE, SCORE, DIFFICULTY_CONFIG } from './constants.js'

// Traverse one ray from (r, c) in direction (dr, dc) and return the number of
// consecutive player stones and whether the ray ends on an open cell.
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

export function boardScore(board, ai, human) {
  let score = 0
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === ai) score += evaluatePosition(board, r, c, ai)
      else if (board[r][c] === human) score -= evaluatePosition(board, r, c, human) * 1.1
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

function minimax(board, depth, alpha, beta, maximizing, ai, human) {
  if (depth === 0) return boardScore(board, ai, human)

  const candidates = getCandidates(board)

  if (maximizing) {
    let best = -Infinity
    for (const { r, c } of candidates) {
      board[r][c] = ai
      if (checkWinBoard(board, r, c, ai)) { board[r][c] = 0; return SCORE.FIVE * 10 }
      const val = minimax(board, depth - 1, alpha, beta, false, ai, human)
      board[r][c] = 0
      best = Math.max(best, val)
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const { r, c } of candidates) {
      board[r][c] = human
      if (checkWinBoard(board, r, c, human)) { board[r][c] = 0; return -SCORE.FIVE * 10 }
      const val = minimax(board, depth - 1, alpha, beta, true, ai, human)
      board[r][c] = 0
      best = Math.min(best, val)
      beta = Math.min(beta, best)
      if (beta <= alpha) break
    }
    return best
  }
}

export function getBestMove(board, difficulty) {
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
      const s = evaluatePosition(board, r, c, ai) - evaluatePosition(board, r, c, human) * 1.1
      board[r][c] = 0
      if (s > best) { best = s; bestMove = { r, c } }
    }
    return bestMove
  }

  const scored = candidates
    .map(({ r, c }) => {
      board[r][c] = ai
      const s = evaluatePosition(board, r, c, ai)
      board[r][c] = 0
      return { r, c, s }
    })
    .sort((a, b) => b.s - a.s)
    .slice(0, 20)

  let best = -Infinity, bestMove = null
  for (const { r, c } of scored) {
    board[r][c] = ai
    const val = minimax(board, depth - 1, -Infinity, Infinity, false, ai, human)
    board[r][c] = 0
    if (val > best) { best = val; bestMove = { r, c } }
  }
  return bestMove ?? scored[0]
}
