import { useEffect, useRef, useState, useCallback } from 'react'
import { DIFFICULTY_CONFIG } from '../lib/constants.js'
import { resolveStyle } from '../lib/ai-styles.js'

/**
 * useAI — Web Worker 运行各游戏 AI
 *
 * @param {'gomoku'|'xiangqi'} [opts.gameKind]
 * @param {number} [opts.xiangqiAiSide] 象棋 AI 行棋方（默认 -1 执黑）
 * @param {function} opts.onAIMove — 五子棋 (r,c)；象棋 ({ fr, fc, tr, tc })
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
  xiangqiAiSide = -1,
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
        const { id, move, game: gk, error } = ev.data
        if (id !== reqIdRef.current) return
        setIsThinking(false)
        if (error || !move) return
        if (gk === 'xiangqi' || (move.fr != null && move.tr != null)) {
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
    const aiTurn =
      gameKind === 'gomoku'
        ? currentPlayer === 2
        : currentPlayer === xiangqiAiSide
    if (!aiMode || !aiTurn || gameOver) return

    setIsThinking(true)
    const delay = DIFFICULTY_CONFIG[difficulty]?.delay ?? 400
    const id = ++reqIdRef.current

    const timer = setTimeout(() => {
      const b = boardRef.current.map((row) => [...row])
      if (gameKind === 'xiangqi') {
        getWorker().postMessage({
          id,
          game: 'xiangqi',
          board: b,
          difficulty,
          sideToMove: xiangqiAiSide,
        })
      } else {
        const style = resolveStyle(styleId)
        getWorker().postMessage({ id, game: 'gomoku', board: b, difficulty, style })
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [
    currentPlayer,
    aiMode,
    gameOver,
    difficulty,
    styleId,
    getWorker,
    gameKind,
    xiangqiAiSide,
  ])

  return { isThinking }
}
