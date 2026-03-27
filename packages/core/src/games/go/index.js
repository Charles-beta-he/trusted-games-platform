/**
 * Go (围棋) Game Plugin — Skeleton
 * 19×19, capture rules, liberty counting
 * Status: coming_soon — AI not implemented
 */
export const PLUGIN_ID = 'go'
export const BOARD_SIZE = 19

export function createBoard() {
  return Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(0))
}

function inBounds(r, c) { return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE }
const DIRS = [[-1,0],[1,0],[0,-1],[0,1]]

export function getGroup(board, r, c) {
  const player = board[r][c]
  if (!player) return new Set()
  const group = new Set()
  const stack = [[r, c]]
  while (stack.length) {
    const [cr, cc] = stack.pop()
    const key = `${cr},${cc}`
    if (group.has(key)) continue
    if (!inBounds(cr, cc) || board[cr][cc] !== player) continue
    group.add(key)
    for (const [dr, dc] of DIRS) stack.push([cr+dr, cc+dc])
  }
  return group
}

export function countLiberties(board, group) {
  const libs = new Set()
  for (const key of group) {
    const [r, c] = key.split(',').map(Number)
    for (const [dr, dc] of DIRS) {
      const nr = r+dr, nc = c+dc
      if (inBounds(nr, nc) && board[nr][nc] === 0) libs.add(`${nr},${nc}`)
    }
  }
  return libs.size
}

export function applyMove(board, r, c, player) {
  if (board[r][c] !== 0) return null
  const next = board.map(row => [...row])
  next[r][c] = player
  const opp = 3 - player
  let captured = 0
  for (const [dr, dc] of DIRS) {
    const nr = r+dr, nc = c+dc
    if (inBounds(nr, nc) && next[nr][nc] === opp) {
      const grp = getGroup(next, nr, nc)
      if (countLiberties(next, grp) === 0) {
        for (const key of grp) {
          const [gr, gc] = key.split(',').map(Number)
          next[gr][gc] = 0
          captured++
        }
      }
    }
  }
  // suicide check
  const myGrp = getGroup(next, r, c)
  if (countLiberties(next, myGrp) === 0) return null
  return { board: next, captured }
}

export function estimateScore(board, komi = 6.5) {
  let black = 0, white = 0
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 1) black++
      else if (board[r][c] === 2) white++
    }
  return { black, white: white + komi }
}

export function getBestMove() {
  throw new Error('Go AI not implemented — MCTS required')
}
