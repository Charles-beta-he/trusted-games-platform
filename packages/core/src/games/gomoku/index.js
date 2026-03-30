/**
 * Gomoku Game Plugin — 五子棋
 * Classic five-in-a-row on a 15×15 board
 */
export { getBestMove, evaluatePosition, checkWinBoard, getCandidates } from '../../ai.js'
export {
  BOARD_SIZE, CELL_SIZE, PADDING, CANVAS_PX, COLS, SCORE, DIFFICULTY_CONFIG,
} from '../../constants.js'

export const PLUGIN_ID = 'gomoku'

export { RULES, DEFAULT_RULE, validateMove } from './rules.js'

export function createBoard(size = 15) {
  return Array.from({ length: size }, () => new Array(size).fill(0))
}

export function inBounds(r, c, size = 15) {
  return r >= 0 && r < size && c >= 0 && c < size
}
