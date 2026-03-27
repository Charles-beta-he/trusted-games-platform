import { useEffect, useRef, useState } from 'react'
import { getBestMove } from '../lib/ai.js'
import { DIFFICULTY_CONFIG } from '../lib/constants.js'

export function useAI({ board, currentPlayer, aiMode, difficulty, gameOver, onAIMove }) {
  const [isThinking, setIsThinking] = useState(false)
  const timeoutRef = useRef(null)
  const boardRef = useRef(board)
  boardRef.current = board

  useEffect(() => {
    if (!aiMode || currentPlayer !== 2 || gameOver) return

    setIsThinking(true)
    const delay = DIFFICULTY_CONFIG[difficulty]?.delay ?? 400

    timeoutRef.current = setTimeout(() => {
      const b = boardRef.current.map((row) => [...row])
      const move = getBestMove(b, difficulty)
      setIsThinking(false)
      if (move) onAIMove(move.r, move.c)
    }, delay)

    return () => clearTimeout(timeoutRef.current)
  }, [currentPlayer, aiMode, gameOver, difficulty, onAIMove])

  return { isThinking }
}
