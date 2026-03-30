import { useState, useCallback, useRef, useEffect } from 'react'
import { xiangqiGame } from '@tg/core'

const {
  createInitialBoard,
  getValidMoves,
  applyMove,
  isCheckmate,
  isStalemate,
  ROWS,
  COLS,
} = xiangqiGame

function pieceSide(p) {
  if (p > 0) return 1
  if (p < 0) return -1
  return 0
}

function replayBoardFromMoves(moves) {
  let b = createInitialBoard()
  for (const m of moves) {
    b = applyMove(b, m.fr, m.fc, m.tr, m.tc)
  }
  return b
}

/** @param {number} p 棋子值（正负表红黑） */
export function xiangqiPieceLabel(p) {
  if (p === 0) return ''
  const red = p > 0
  const t = Math.abs(p)
  const blackNames = ['', '将', '士', '象', '馬', '車', '砲', '卒']
  const redNames = ['', '帅', '仕', '相', '馬', '車', '炮', '兵']
  const name = red ? redNames[t] : blackNames[t]
  return name || '?'
}

export function useXiangqiGame() {
  const [board, setBoard] = useState(() => createInitialBoard())
  /** 行棋方：1 红，-1 黑（与 core 一致） */
  const [sideToMove, setSideToMove] = useState(1)
  const [moveHistory, setMoveHistory] = useState([])
  const [gameOver, setGameOver] = useState(false)
  const [endReason, setEndReason] = useState(null)
  /** 胜方 1 / -1；和棋 null */
  const [winnerSide, setWinnerSide] = useState(null)
  const [selected, setSelected] = useState(null)
  const [lastMove, setLastMove] = useState(null)

  const boardRef = useRef(board)
  const sideRef = useRef(sideToMove)
  const gameOverRef = useRef(gameOver)
  boardRef.current = board
  sideRef.current = sideToMove
  gameOverRef.current = gameOver

  const clearSelection = useCallback(() => setSelected(null), [])

  const tryMove = useCallback((fr, fc, tr, tc) => {
    if (gameOverRef.current) return false
    const b = boardRef.current
    const stm = sideRef.current
    if (pieceSide(b[fr]?.[fc]) !== stm) return false
    const legal = getValidMoves(b, fr, fc)
    if (!legal.some(([r, c]) => r === tr && c === tc)) return false

    const piece = b[fr][fc]
    const captured = b[tr][tc]
    const next = applyMove(b, fr, fc, tr, tc)
    const nextSide = -stm

    const rec = {
      fr,
      fc,
      tr,
      tc,
      piece,
      captured,
      side: stm,
    }

    if (isCheckmate(next, nextSide)) {
      setBoard(next)
      setMoveHistory((h) => [...h, rec])
      setSideToMove(nextSide)
      setGameOver(true)
      setEndReason('checkmate')
      setWinnerSide(stm)
      setLastMove({ fr, fc, tr, tc })
      setSelected(null)
      return true
    }

    if (isStalemate(next, nextSide)) {
      setBoard(next)
      setMoveHistory((h) => [...h, rec])
      setSideToMove(nextSide)
      setGameOver(true)
      setEndReason('stalemate')
      setWinnerSide(null)
      setLastMove({ fr, fc, tr, tc })
      setSelected(null)
      return true
    }

    setBoard(next)
    setMoveHistory((h) => [...h, rec])
    setSideToMove(nextSide)
    setLastMove({ fr, fc, tr, tc })
    setSelected(null)
    return true
  }, [])

  const onSquarePress = useCallback(
    (r, c) => {
      if (gameOverRef.current) return
      const b = boardRef.current
      const stm = sideRef.current
      const cell = b[r]?.[c]
      if (selected) {
        const [sr, sc] = selected
        if (sr === r && sc === c) {
          setSelected(null)
          return
        }
        if (tryMove(sr, sc, r, c)) return
        if (pieceSide(cell) === stm) {
          setSelected([r, c])
          return
        }
        return
      }
      if (pieceSide(cell) === stm) setSelected([r, c])
    },
    [selected, tryMove],
  )

  const newGame = useCallback(() => {
    setBoard(createInitialBoard())
    setSideToMove(1)
    setMoveHistory([])
    setGameOver(false)
    setEndReason(null)
    setWinnerSide(null)
    setSelected(null)
    setLastMove(null)
  }, [])

  const undoMove = useCallback((popTwo = false) => {
    setMoveHistory((hist) => {
      if (hist.length === 0) return hist
      let h2 = hist.slice(0, -1)
      if (popTwo && h2.length > 0) h2 = h2.slice(0, -1)
      setBoard(replayBoardFromMoves(h2))
      setSideToMove(h2.length % 2 === 0 ? 1 : -1)
      setGameOver(false)
      setEndReason(null)
      setWinnerSide(null)
      setSelected(null)
      const last = h2.length > 0 ? h2[h2.length - 1] : null
      setLastMove(last ? { fr: last.fr, fc: last.fc, tr: last.tr, tc: last.tc } : null)
      return h2
    })
  }, [])

  const resign = useCallback(() => {
    if (gameOverRef.current) return
    const loser = sideRef.current
    setGameOver(true)
    setEndReason('resign')
    setWinnerSide(-loser)
    setSelected(null)
  }, [])

  useEffect(() => {
    gameOverRef.current = gameOver
  }, [gameOver])

  const legalTargets =
    selected != null ? getValidMoves(board, selected[0], selected[1]) : []

  const inCheck = xiangqiGame.isInCheck(board, sideToMove)

  const exportRecord = useCallback(() => {
    const payload = {
      game: 'xiangqi',
      version: 1,
      moves: moveHistory,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `xiangqi-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [moveHistory])

  return {
    board,
    ROWS,
    COLS,
    sideToMove,
    moveHistory,
    gameOver,
    endReason,
    winnerSide,
    selected,
    lastMove,
    legalTargets,
    inCheck,
    tryMove,
    onSquarePress,
    newGame,
    undoMove,
    resign,
    exportRecord,
    clearSelection,
  }
}
