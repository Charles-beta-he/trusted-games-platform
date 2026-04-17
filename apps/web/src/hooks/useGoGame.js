import { useState, useCallback, useRef, useEffect } from 'react'
import { goGame } from '@tg/core'

const { BOARD_SIZE, createBoard, applyMove, estimateScore } = goGame

export function useGoGame() {
  const [board, setBoard] = useState(() => createBoard())
  const [currentPlayer, setCurrentPlayer] = useState(1) // 1=black, 2=white
  const [moveHistory, setMoveHistory] = useState([])
  const [gameOver, setGameOver] = useState(false)
  const [endReason, setEndReason] = useState(null)
  const [winnerSide, setWinnerSide] = useState(null)
  const [lastMove, setLastMove] = useState(null)
  const [blackCaptures, setBlackCaptures] = useState(0)
  const [whiteCaptures, setWhiteCaptures] = useState(0)
  const [score, setScore] = useState(null)
  const [consecutivePasses, setConsecutivePasses] = useState(0)

  const boardRef = useRef(board)
  const playerRef = useRef(currentPlayer)
  const gameOverRef = useRef(gameOver)
  boardRef.current = board
  playerRef.current = currentPlayer
  gameOverRef.current = gameOver

  const placeStone = useCallback((r, c) => {
    if (gameOverRef.current) return false
    const b = boardRef.current
    const p = playerRef.current

    const result = applyMove(b, r, c, p)
    if (!result) return false

    setBoard(result.board)
    boardRef.current = result.board

    // Update captures
    if (p === 1) {
      setBlackCaptures((v) => v + result.captured)
    } else {
      setWhiteCaptures((v) => v + result.captured)
    }

    setMoveHistory((h) => [...h, { r, c, player: p, captured: result.captured }])
    setLastMove({ r, c })
    setConsecutivePasses(0)

    const next = p === 1 ? 2 : 1
    setCurrentPlayer(next)
    playerRef.current = next

    return true
  }, [])

  const pass = useCallback(() => {
    if (gameOverRef.current) return
    const p = playerRef.current
    setMoveHistory((h) => [...h, { r: -1, c: -1, player: p, captured: 0, pass: true }])
    setLastMove(null)

    const newPasses = consecutivePasses + 1
    setConsecutivePasses(newPasses)

    if (newPasses >= 2) {
      // Two consecutive passes → game over, score
      const s = estimateScore(boardRef.current)
      setScore(s)
      setGameOver(true)
      gameOverRef.current = true
      setEndReason('two_pass')
      setWinnerSide(s.black > s.white ? 1 : s.white > s.black ? 2 : null)
      return
    }

    const next = p === 1 ? 2 : 1
    setCurrentPlayer(next)
    playerRef.current = next
  }, [consecutivePasses])

  const resign = useCallback(() => {
    if (gameOverRef.current) return
    const loser = playerRef.current
    const s = estimateScore(boardRef.current)
    setScore(s)
    setGameOver(true)
    gameOverRef.current = true
    setEndReason('resign')
    setWinnerSide(loser === 1 ? 2 : 1)
  }, [])

  const newGame = useCallback(() => {
    const fresh = createBoard()
    setBoard(fresh)
    boardRef.current = fresh
    setCurrentPlayer(1)
    playerRef.current = 1
    setMoveHistory([])
    setGameOver(false)
    gameOverRef.current = false
    setEndReason(null)
    setWinnerSide(null)
    setLastMove(null)
    setBlackCaptures(0)
    setWhiteCaptures(0)
    setScore(null)
    setConsecutivePasses(0)
  }, [])

  const undoMove = useCallback((popTwo = false) => {
    setMoveHistory((hist) => {
      if (hist.length === 0) return hist
      let h2 = hist.slice(0, -1)
      if (popTwo && h2.length > 0) h2 = h2.slice(0, -1)

      // Rebuild board from history
      const fresh = createBoard()
      let bc = 0, wc = 0
      for (const m of h2) {
        if (m.pass) continue
        const result = applyMove(fresh, m.r, m.c, m.player)
        if (result) {
          for (let r = 0; r < BOARD_SIZE; r++) fresh[r] = result.board[r]
          if (m.player === 1) bc += result.captured
          else wc += result.captured
        }
      }

      setBoard(fresh.map((row) => [...row]))
      boardRef.current = fresh
      setBlackCaptures(bc)
      setWhiteCaptures(wc)
      setCurrentPlayer(h2.length % 2 === 0 ? 1 : 2)
      playerRef.current = h2.length % 2 === 0 ? 1 : 2
      setGameOver(false)
      gameOverRef.current = false
      setEndReason(null)
      setWinnerSide(null)
      setScore(null)

      // Recount consecutive passes
      let cp = 0
      for (let i = h2.length - 1; i >= 0; i--) {
        if (h2[i].pass) cp++
        else break
      }
      setConsecutivePasses(cp)

      const last = h2.length > 0 ? h2[h2.length - 1] : null
      setLastMove(last && !last.pass ? { r: last.r, c: last.c } : null)

      return h2
    })
  }, [])

  const exportRecord = useCallback(() => {
    const payload = {
      game: 'go',
      version: 1,
      boardSize: BOARD_SIZE,
      moves: moveHistory,
      blackCaptures,
      whiteCaptures,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `go-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [moveHistory, blackCaptures, whiteCaptures])

  useEffect(() => {
    gameOverRef.current = gameOver
  }, [gameOver])

  return {
    board,
    BOARD_SIZE,
    currentPlayer,
    moveHistory,
    gameOver,
    endReason,
    winnerSide,
    lastMove,
    blackCaptures,
    whiteCaptures,
    score,
    placeStone,
    pass,
    resign,
    newGame,
    undoMove,
    exportRecord,
  }
}
