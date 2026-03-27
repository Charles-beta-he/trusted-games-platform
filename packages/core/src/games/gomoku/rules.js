export const RULES = {
  standard: { id: 'standard', name: 'Standard Gomoku', winLength: 5, allowOverline: true,  blackRestrictions: false },
  renju:    { id: 'renju',    name: 'Renju',           winLength: 5, allowOverline: false, blackRestrictions: true },
}
export const DEFAULT_RULE = 'standard'

export function validateMove(board, r, c, player, ruleId = 'standard') {
  if (board[r][c] !== 0) return { valid: false, reason: 'occupied' }
  void player; void ruleId  // renju restrictions: TODO
  return { valid: true }
}
