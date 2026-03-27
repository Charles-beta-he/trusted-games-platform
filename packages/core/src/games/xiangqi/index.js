/**
 * Xiangqi (中国象棋) Game Plugin — Skeleton
 * 9 cols × 10 rows
 * Status: coming_soon
 */
export const PLUGIN_ID = 'xiangqi'
export const COLS = 9
export const ROWS = 10

export const P = { GENERAL:1, ADVISOR:2, ELEPHANT:3, HORSE:4, CHARIOT:5, CANNON:6, SOLDIER:7 }

export function createInitialBoard() {
  const b = Array.from({ length: ROWS }, () => new Array(COLS).fill(0))
  const backRow = [P.CHARIOT, P.HORSE, P.ELEPHANT, P.ADVISOR, P.GENERAL,
                   P.ADVISOR, P.ELEPHANT, P.HORSE, P.CHARIOT]
  // Red (positive, bottom rows 6-9)
  backRow.forEach((p, c) => { b[9][c] = p })
  b[7][1] = P.CANNON; b[7][7] = P.CANNON
  for (let c = 0; c < 9; c += 2) b[6][c] = P.SOLDIER
  // Black (negative, top rows 0-3)
  backRow.forEach((p, c) => { b[0][c] = -p })
  b[2][1] = -P.CANNON; b[2][7] = -P.CANNON
  for (let c = 0; c < 9; c += 2) b[3][c] = -P.SOLDIER
  return b
}

export function getValidMoves(_board, _r, _c) {
  // TODO: implement per-piece movement rules
  return []
}

export function isInCheck(_board, _player) {
  return false  // TODO
}

export function getBestMove() {
  throw new Error('Xiangqi AI not implemented')
}
