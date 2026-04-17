/**
 * AI Web Worker — 多游戏 AI 调度
 *
 * 接收: { id, game, board, difficulty, sideToMove, aiParams }
 * 发送: { id, move, game } | { id, error }
 *
 * 接入新游戏 AI：在 HANDLERS 添加一个 key，无需改动分发逻辑。
 * 每个 handler 自行解读 aiParams（来自 plugin descriptor 的 aiParams schema 用户配置）。
 */

import { getBestMove as gomokuBest } from './ai.js'
import { resolveStyle } from './ai-styles.js'
import { xiangqiGame, chessGame, goGame } from '@tg/core'

const HANDLERS = {
  gomoku({ board, difficulty, aiParams }) {
    // aiParams.style: 'balanced' | 'aggressive' | 'defensive' | 'chaotic' | 'personal'
    const style = resolveStyle(aiParams?.style ?? 'balanced')
    const timeLimitMs = aiParams?.timeLimitMs ?? 2000
    return gomokuBest(board, difficulty, style, { ...aiParams, timeLimitMs })
  },

  xiangqi({ board, difficulty, sideToMove, aiParams }) {
    // aiParams.aggression: 'conservative' | 'balanced' | 'aggressive'
    // aiParams.noise:      'none' | 'slight' | 'high'
    return xiangqiGame.getBestMove(board, sideToMove, difficulty, aiParams)
  },

  chess({ board, difficulty, sideToMove, aiParams }) {
    return chessGame.getBestMove(board, sideToMove, difficulty, aiParams)
  },

  go({ board, difficulty, sideToMove }) {
    return goGame.getBestMove(board, sideToMove, difficulty)
  },
}

self.onmessage = (e) => {
  const { id, game = 'gomoku', ...params } = e.data
  try {
    const handler = HANDLERS[game]
    if (!handler) throw new Error(`No AI handler registered for game: ${game}`)
    const result = handler(params)
    // Handle async handlers (e.g., go MCTS uses dynamic import)
    if (result && typeof result.then === 'function') {
      result.then(
        (move) => self.postMessage({ id, move, game }),
        (err) => self.postMessage({ id, error: err.message }),
      )
    } else {
      self.postMessage({ id, move: result, game })
    }
  } catch (err) {
    self.postMessage({ id, error: err.message })
  }
}
