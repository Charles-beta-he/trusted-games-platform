import { useEffect, useRef, useState, useCallback } from 'react'
import { DIFFICULTY_CONFIG } from '../lib/constants.js'
import { resolveStyle } from '../lib/ai-styles.js'

/**
 * useAI — Web Worker 运行各游戏 AI
 *
 * @param {string}   opts.gameKind     游戏 ID（对应 ai.worker HANDLERS key）
 * @param {number}   opts.aiSide       AI 执哪一方（currentPlayer 等于此值时 AI 行棋）
 * @param {boolean}  opts.aiStyleEnabled  是否使用 AI 风格（Minimax 类游戏）
 * @param {function} opts.onAIMove     回调：棋子落子型传 (r,c)；移动型传 ({ fr,fc,tr,tc })
 */
export function useAI({
  board,
  currentPlayer,
  aiMode,
  difficulty,
  styleId = 'balanced',
  gameOver,
  onAIMove,
  gameKind = 'gomoku',
  aiSide = 2,
  aiStyleEnabled = true,
}) {
  const [isThinking, setIsThinking] = useState(false)

  const workerRef = useRef(null)
  const reqIdRef = useRef(0)
  const boardRef = useRef(board)
  const onAIMoveRef = useRef(onAIMove)
  boardRef.current = board
  onAIMoveRef.current = onAIMove

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../lib/ai.worker.js', import.meta.url),
        { type: 'module' },
      )
      workerRef.current.onmessage = (ev) => {
        const { id, move, error } = ev.data
        if (id !== reqIdRef.current) return
        setIsThinking(false)
        if (error || !move) return
        // 移动型（象棋）: { fr, fc, tr, tc }；落子型（五子棋）: { r, c }
        if (move.fr != null && move.tr != null) {
          onAIMoveRef.current(move)
        } else {
          onAIMoveRef.current(move.r, move.c)
        }
      }
    }
    return workerRef.current
  }, [])

  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!aiMode || currentPlayer !== aiSide || gameOver) return

    setIsThinking(true)
    const delay = DIFFICULTY_CONFIG[difficulty]?.delay ?? 400
    const id = ++reqIdRef.current

    const timer = setTimeout(() => {
      const b = boardRef.current.map((row) => [...row])
      const msg = { id, game: gameKind, board: b, difficulty }
      if (aiStyleEnabled) {
        msg.style = resolveStyle(styleId)
      } else {
        msg.sideToMove = aiSide
      }
      getWorker().postMessage(msg)
    }, delay)

    return () => clearTimeout(timer)
  }, [currentPlayer, aiMode, gameOver, difficulty, styleId, getWorker, gameKind, aiSide, aiStyleEnabled])

  return { isThinking }
}
