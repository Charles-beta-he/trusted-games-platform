import { useState, useCallback, useRef, useEffect } from 'react'
import { chessGame } from '@tg/core'

const {
  createInitialBoard,
  createInitialCastlingRights,
  getValidMoves,
  applyMove,
  isCheckmate,
  isStalemate,
  isPromotionMove,
  findKing,
  isInCheck,
  ROWS,
  COLS,
} = chessGame

function pieceSide(p) {
  if (p > 0) return 1
  if (p < 0) return -1
  return 0
}

function replayStateFromMoves(moves) {
  let state = {
    board: createInitialBoard(),
    castlingRights: createInitialCastlingRights(),
    enPassantTarget: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
  }
  for (const m of moves) {
    state = applyMove(state, m.fr, m.fc, m.tr, m.tc, m.promotion)
  }
  return state
}

const UNICODE_PIECES = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
}

/** @param {number} p 棋子值 */
export function chessPieceLabel(p) {
  if (p === 0) return ''
  const white = p > 0
  const t = Math.abs(p)
  const names = ['', 'K', 'Q', 'R', 'B', 'N', 'P']
  const key = white ? names[t] : names[t].toLowerCase()
  return UNICODE_PIECES[key] || '?'
}

export function useChessGame() {
  const [board, setBoard] = useState(() => createInitialBoard())
  const [castlingRights, setCastlingRights] = useState(() => createInitialCastlingRights())
  const [enPassantTarget, setEnPassantTarget] = useState(null)
  const [sideToMove, setSideToMove] = useState(1)
  const [moveHistory, setMoveHistory] = useState([])
  const [gameOver, setGameOver] = useState(false)
  const [endReason, setEndReason] = useState(null)
  const [winnerSide, setWinnerSide] = useState(null)
  const [selected, setSelected] = useState(null)
  const [lastMove, setLastMove] = useState(null)
  const [pendingPromotion, setPendingPromotion] = useState(null)

  const boardRef = useRef(board)
  const sideRef = useRef(sideToMove)
  const gameOverRef = useRef(gameOver)
  const stateRef = useRef({ board, castlingRights, enPassantTarget })

  useEffect(() => {
    boardRef.current = board
    sideRef.current = sideToMove
    gameOverRef.current = gameOver
    stateRef.current = { board, castlingRights, enPassantTarget }
  }, [board, sideToMove, gameOver, castlingRights, enPassantTarget])

  const clearSelection = useCallback(() => setSelected(null), [])

  const getState = useCallback(() => stateRef.current, [])

  const tryMove = useCallback((fr, fc, tr, tc, promotion) => {
    if (gameOverRef.current) return false
    const st = stateRef.current
    const b = st.board
    const stm = sideRef.current
    if (pieceSide(b[fr]?.[fc]) !== stm) return false
    const legal = getValidMoves(st, fr, fc)
    if (!legal.some(([r, c]) => r === tr && c === tc)) return false

    // Check if promotion needed
    if (isPromotionMove(st, fr, fc, tr) && !promotion) {
      setPendingPromotion({ fr, fc, tr, tc })
      return false
    }

    const piece = b[fr][fc]
    const captured = b[tr][tc]
    const nextState = applyMove(st, fr, fc, tr, tc, promotion)
    const nextSide = -stm

    const rec = { fr, fc, tr, tc, piece, captured, side: stm, promotion }

    if (isCheckmate(nextState.board, nextSide, nextState)) {
      setBoard(nextState.board)
      setCastlingRights(nextState.castlingRights)
      setEnPassantTarget(nextState.enPassantTarget)
      setMoveHistory((h) => [...h, rec])
      setSideToMove(nextSide)
      setGameOver(true)
      setEndReason('checkmate')
      setWinnerSide(stm)
      setLastMove({ fr, fc, tr, tc })
      setSelected(null)
      setPendingPromotion(null)
      return true
    }

    if (isStalemate(nextState.board, nextSide, nextState)) {
      setBoard(nextState.board)
      setCastlingRights(nextState.castlingRights)
      setEnPassantTarget(nextState.enPassantTarget)
      setMoveHistory((h) => [...h, rec])
      setSideToMove(nextSide)
      setGameOver(true)
      setEndReason('stalemate')
      setWinnerSide(null)
      setLastMove({ fr, fc, tr, tc })
      setSelected(null)
      setPendingPromotion(null)
      return true
    }

    setBoard(nextState.board)
    setCastlingRights(nextState.castlingRights)
    setEnPassantTarget(nextState.enPassantTarget)
    setMoveHistory((h) => [...h, rec])
    setSideToMove(nextSide)
    setLastMove({ fr, fc, tr, tc })
    setSelected(null)
    setPendingPromotion(null)
    return true
  }, [])

  const confirmPromotion = useCallback((promoPiece) => {
    if (!pendingPromotion) return
    const { fr, fc, tr, tc } = pendingPromotion
    tryMove(fr, fc, tr, tc, promoPiece)
  }, [pendingPromotion, tryMove])

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null)
  }, [])

  const onSquarePress = useCallback(
    (r, c) => {
      if (gameOverRef.current) return
      if (pendingPromotion) return
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
    [selected, tryMove, pendingPromotion],
  )

  const newGame = useCallback(() => {
    setBoard(createInitialBoard())
    setCastlingRights(createInitialCastlingRights())
    setEnPassantTarget(null)
    setSideToMove(1)
    setMoveHistory([])
    setGameOver(false)
    setEndReason(null)
    setWinnerSide(null)
    setSelected(null)
    setLastMove(null)
    setPendingPromotion(null)
  }, [])

  const undoMove = useCallback((popTwo = false) => {
    setMoveHistory((hist) => {
      if (hist.length === 0) return hist
      let h2 = hist.slice(0, -1)
      if (popTwo && h2.length > 0) h2 = h2.slice(0, -1)
      const st = replayStateFromMoves(h2)
      setBoard(st.board)
      setCastlingRights(st.castlingRights)
      setEnPassantTarget(st.enPassantTarget)
      setSideToMove(h2.length % 2 === 0 ? 1 : -1)
      setGameOver(false)
      setEndReason(null)
      setWinnerSide(null)
      setSelected(null)
      setPendingPromotion(null)
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

  const currentState = { board, castlingRights, enPassantTarget }
  const legalTargets =
    selected != null ? getValidMoves(currentState, selected[0], selected[1]) : []
  const inCheck = isInCheck(board, sideToMove)
  const kingRC = findKing(board, sideToMove)

  const exportRecord = useCallback(() => {
    const payload = {
      game: 'chess',
      version: 1,
      moves: moveHistory,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `chess-${Date.now()}.json`
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
    kingRC,
    pendingPromotion,
    tryMove,
    onSquarePress,
    confirmPromotion,
    cancelPromotion,
    newGame,
    undoMove,
    resign,
    exportRecord,
    clearSelection,
    getState,
  }
}
