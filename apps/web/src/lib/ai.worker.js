/**
 * AI Web Worker — 多游戏 AI 调度
 *
 * 接收: { id, game: string, board, difficulty, ...gameParams }
 * 发送: { id, move, game } | { id, error }
 *
 * 接入新游戏 AI：在 HANDLERS 中添加一个 key 即可，无需改动分发逻辑。
 */

import { getBestMove as gomokuBest } from './ai.js'
import { xiangqiGame } from '@tg/core'

const HANDLERS = {
  gomoku({ board, difficulty, style }) {
    return gomokuBest(board, difficulty, style)
  },
  xiangqi({ board, difficulty, sideToMove }) {
    return xiangqiGame.getBestMove(board, sideToMove, difficulty)
  },
}

self.onmessage = (e) => {
  const { id, game = 'gomoku', ...params } = e.data
  try {
    const handler = HANDLERS[game]
    if (!handler) throw new Error(`No AI handler registered for game: ${game}`)
    const move = handler(params)
    self.postMessage({ id, move, game })
  } catch (err) {
    self.postMessage({ id, error: err.message })
  }
}
