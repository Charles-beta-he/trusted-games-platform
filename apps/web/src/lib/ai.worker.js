/**
 * AI Web Worker — 多游戏：五子棋 minimax；象棋启发式（见 @tg/core）
 *
 * 接收:
 *   五子棋: { id, game: 'gomoku' | undefined, board, difficulty, style }
 *   象棋:   { id, game: 'xiangqi', board, difficulty, sideToMove }
 * 发送: { id, move, game? } | { id, error }
 */

import { getBestMove as gomokuBest } from './ai.js'
import { xiangqiGame } from '@tg/core'

self.onmessage = (e) => {
  const { id, game, board, difficulty, style, sideToMove } = e.data
  try {
    if (game === 'xiangqi') {
      const move = xiangqiGame.getBestMove(board, sideToMove, difficulty)
      self.postMessage({ id, move, game: 'xiangqi' })
      return
    }
    const move = gomokuBest(board, difficulty, style)
    self.postMessage({ id, move, game: 'gomoku' })
  } catch (err) {
    self.postMessage({ id, error: err.message })
  }
}
