/**
 * AI Web Worker
 * 在独立线程运行 getBestMove，避免阻塞主线程 UI
 *
 * 消息协议:
 *   接收: { id, board, difficulty, style }
 *   发送: { id, move }  或  { id, error }
 */

import { getBestMove } from './ai.js'

self.onmessage = (e) => {
  const { id, board, difficulty, style } = e.data
  try {
    const move = getBestMove(board, difficulty, style)
    self.postMessage({ id, move })
  } catch (err) {
    self.postMessage({ id, error: err.message })
  }
}
