/**
 * Xiangqi (中国象棋) — 规则见 rules.js
 */
export const PLUGIN_ID = 'xiangqi'

export {
  ROWS,
  COLS,
  P,
  createInitialBoard,
  getPseudoLegalMoves,
  getValidMoves,
  applyMove,
  findGeneral,
  isInCheck,
  isCheckmate,
  isStalemate,
  generalsFace,
  getBestMove,
} from './rules.js'
