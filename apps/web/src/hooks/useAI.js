import { useEffect, useRef, useState, useCallback } from 'react'
import { DIFFICULTY_CONFIG } from '../lib/constants.js'
import { resolveStyle } from '../lib/ai-styles.js'

/**
 * useAI — 调用 Web Worker 运行 AI，支持棋风热切换
 *
 * @param {object} opts
 * @param {string} opts.difficulty  — 'easy' | 'medium' | 'hard' | 'expert'
 * @param {string} opts.styleId     — 'balanced' | 'aggressive' | 'defensive' | 'chaotic' | 'personal'
 */
export function useAI({ board, currentPlayer, aiMode, difficulty, styleId = 'balanced', gameOver, onAIMove }) {
  const [isThinking, setIsThinking] = useState(false)

  const workerRef   = useRef(null)
  const reqIdRef    = useRef(0)
  const boardRef    = useRef(board)
  const onAIMoveRef = useRef(onAIMove)
  boardRef.current    = board
  onAIMoveRef.current = onAIMove

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../lib/ai.worker.js', import.meta.url),
        { type: 'module' }
      )
      workerRef.current.onmessage = (e) => {
        const { id, move, error } = e.data
        if (id !== reqIdRef.current) return
        setIsThinking(false)
        if (move && !error) onAIMoveRef.current(move.r, move.c)
      }
    }
    return workerRef.current
  }, [])

  useEffect(() => {
    return () => { workerRef.current?.terminate(); workerRef.current = null }
  }, [])

  useEffect(() => {
    if (!aiMode || currentPlayer !== 2 || gameOver) return

    setIsThinking(true)
    const delay = DIFFICULTY_CONFIG[difficulty]?.delay ?? 400
    const id = ++reqIdRef.current

    const timer = setTimeout(() => {
      const b = boardRef.current.map((row) => [...row])
      const style = resolveStyle(styleId)
      getWorker().postMessage({ id, board: b, difficulty, style })
    }, delay)

    return () => clearTimeout(timer)
  }, [currentPlayer, aiMode, gameOver, difficulty, styleId, getWorker])

  return { isThinking }
}
