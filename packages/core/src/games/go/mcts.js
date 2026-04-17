/**
 * MCTS (Monte Carlo Tree Search) for Go.
 * Lightweight implementation — no neural network, pure simulation.
 */
import { BOARD_SIZE, applyMove, countLiberties, getGroup } from './index.js'

const DIRS = [[-1,0],[1,0],[0,-1],[0,1]]
const SIM_LIMITS = { easy: 50, medium: 200, hard: 800, expert: 3000 }

class MCTSNode {
  constructor(board, player, parent = null, move = null) {
    this.board = board
    this.player = player  // player whose turn it is
    this.parent = parent
    this.move = move      // { r, c } that led here
    this.children = []
    this.wins = 0
    this.visits = 0
    this.untriedMoves = null
  }

  ucb1(exploration = 1.41) {
    if (this.visits === 0) return Infinity
    return this.wins / this.visits + exploration * Math.sqrt(Math.log(this.parent.visits) / this.visits)
  }

  bestChild() {
    let best = null, bestScore = -Infinity
    for (const child of this.children) {
      const score = child.ucb1()
      if (score > bestScore) { bestScore = score; best = child }
    }
    return best
  }
}

/** Get candidate moves near existing stones (within 2 cells). */
function getCandidateMoves(board) {
  const candidates = new Set()
  const range = 2
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== 0) {
        for (let dr = -range; dr <= range; dr++) {
          for (let dc = -range; dc <= range; dc++) {
            const nr = r + dr, nc = c + dc
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === 0) {
              candidates.add(`${nr},${nc}`)
            }
          }
        }
      }
    }
  }
  // Empty board → play center
  if (candidates.size === 0) candidates.add(`${Math.floor(BOARD_SIZE/2)},${Math.floor(BOARD_SIZE/2)}`)
  return [...candidates].map(s => { const [r, c] = s.split(',').map(Number); return { r, c } })
}

/** Expand node by adding one child. */
function expand(node) {
  if (!node.untriedMoves) node.untriedMoves = getCandidateMoves(node.board)
  if (node.untriedMoves.length === 0) return null

  const idx = Math.floor(Math.random() * node.untriedMoves.length)
  const move = node.untriedMoves.splice(idx, 1)[0]
  const result = applyMove(node.board, move.r, move.c, node.player)
  if (!result) return null  // illegal move

  const child = new MCTSNode(result.board, 3 - node.player, node, move)
  node.children.push(child)
  return child
}

/** Random playout from a board state. Returns winner (1 or 2). */
function simulate(board, player) {
  const simBoard = board.map(row => [...row])
  let cur = player
  let consecutivePasses = 0
  const maxMoves = 200  // cap playout length

  for (let i = 0; i < maxMoves; i++) {
    // Get random empty cell near existing stones
    const candidates = []
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (simBoard[r][c] === 0) {
          // Check if adjacent to any stone
          let near = false
          for (const [dr, dc] of DIRS) {
            const nr = r+dr, nc = c+dc
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && simBoard[nr][nc] !== 0) {
              near = true; break
            }
          }
          if (near) candidates.push({ r, c })
        }

    if (candidates.length === 0) {
      consecutivePasses++
      if (consecutivePasses >= 2) break
      cur = 3 - cur
      continue
    }
    consecutivePasses = 0

    // Pick random candidate
    const move = candidates[Math.floor(Math.random() * candidates.length)]
    const result = applyMove(simBoard, move.r, move.c, cur)
    if (!result) { cur = 3 - cur; continue }
    for (let r = 0; r < BOARD_SIZE; r++) simBoard[r] = result.board[r]
    cur = 3 - cur
  }

  // Score-based winner
  let black = 0, white = 0
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (simBoard[r][c] === 1) black++
      else if (simBoard[r][c] === 2) white++
    }
  return white + 6.5 > black ? 2 : 1
}

/** Backpropagate result up the tree. */
function backpropagate(node, winner) {
  let current = node
  while (current) {
    current.visits++
    if (winner === current.player) current.wins++  // wins for the player who moved to get here
    current = current.parent
  }
}

/**
 * Get best move via MCTS.
 * @param {number[][]} board - 19×19 board (0=empty, 1=black, 2=white)
 * @param {number} player - current player (1 or 2)
 * @param {string} difficulty - 'easy'|'medium'|'hard'|'expert'
 * @returns {{ r: number, c: number }}
 */
export function getBestMove(board, player, difficulty = 'medium') {
  const limit = SIM_LIMITS[difficulty] || 500
  const root = new MCTSNode(board.map(row => [...row]), player)

  for (let i = 0; i < limit; i++) {
    // Select
    let node = root
    while (node.children.length > 0 && (!node.untriedMoves || node.untriedMoves.length === 0)) {
      node = node.bestChild()
    }
    // Expand
    const child = expand(node)
    if (child) node = child
    // Simulate
    const winner = simulate(node.board, node.player)
    // Backpropagate
    backpropagate(node, winner)
  }

  // Pick most visited child
  let best = null, bestVisits = 0
  for (const child of root.children) {
    if (child.visits > bestVisits) { bestVisits = child.visits; best = child }
  }
  return best?.move ?? getCandidateMoves(board)[0]
}
