/**
 * Chess (国际象棋) — 规则见 rules.js
 */
export const PLUGIN_ID = 'chess'

export {
  ROWS,
  COLS,
  P,
  createInitialBoard,
  createInitialCastlingRights,
  createInitialState,
  getPseudoLegalMoves,
  getValidMoves,
  applyMove,
  findKing,
  isInCheck,
  isCheckmate,
  isStalemate,
  isPromotionMove,
  isFiftyMoveRule,
  getBestMove,
} from './rules.js'
