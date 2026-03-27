import { useState, useCallback, useEffect } from 'react'

export function useTimer(currentPlayer, gameOver) {
  const [timers, setTimers] = useState({ black: 0, white: 0 })
  const [started, setStarted] = useState(false)

  const startTimer  = useCallback(() => setStarted(true),  [])
  const stopTimer   = useCallback(() => setStarted(false), [])
  const resetTimers = useCallback(() => {
    setStarted(false)
    setTimers({ black: 0, white: 0 })
  }, [])

  // Single interval — restarts automatically when currentPlayer or started changes.
  // No duplicate intervals; no stale-closure risk.
  useEffect(() => {
    if (!started || gameOver) return
    const id = setInterval(() => {
      setTimers((prev) => {
        const key = currentPlayer === 1 ? 'black' : 'white'
        return { ...prev, [key]: prev[key] + 1 }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [started, currentPlayer, gameOver])

  return { timers, startTimer, stopTimer, resetTimers }
}

export function formatTime(s) {
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}
