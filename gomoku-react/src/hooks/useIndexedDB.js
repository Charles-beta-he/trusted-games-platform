import { useEffect, useRef } from 'react'

const DB_NAME = 'GomokuDB'
const DB_VERSION = 1

export function useIndexedDB(moveHistory, board, gameId, gameOver, currentPlayer) {
  const dbRef = useRef(null)

  useEffect(() => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('games')) {
        db.createObjectStore('games', { keyPath: 'gameId' })
      }
    }
    req.onsuccess = (e) => { dbRef.current = e.target.result }
  }, [])

  useEffect(() => {
    if (!dbRef.current || moveHistory.length === 0 || moveHistory.length % 10 !== 0) return
    const tx = dbRef.current.transaction('games', 'readwrite')
    tx.objectStore('games').put({
      gameId,
      timestamp: Date.now(),
      moves: moveHistory,
      board: board.map((row) => [...row]),
      gameOver,
      currentPlayer,
    })
  }, [moveHistory, board, gameId, gameOver, currentPlayer])

  // BUG-C4 fix: force-save whenever the game ends, regardless of move count.
  // The periodic save above only triggers at multiples of 10 moves, so a game that
  // ends at e.g. move 17 would lose its final state. This effect watches gameOver
  // and writes to IndexedDB immediately when it transitions to a truthy value.
  useEffect(() => {
    if (!gameOver || !dbRef.current || moveHistory.length === 0) return
    const tx = dbRef.current.transaction('games', 'readwrite')
    tx.objectStore('games').put({
      gameId,
      timestamp: Date.now(),
      moves: moveHistory,
      board: board.map((row) => [...row]),
      gameOver,
      currentPlayer,
    })
  }, [gameOver]) // eslint-disable-line react-hooks/exhaustive-deps
}
