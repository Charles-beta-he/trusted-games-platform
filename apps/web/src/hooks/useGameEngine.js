import { useState, useCallback, useRef, useEffect } from 'react'
import { BOARD_SIZE, COLS, TRUST_LEVELS } from '@tg/core/constants'
import { generateId, generateGenesisHash, computeMoveHash } from '@tg/core/crypto'

const emptyBoard = () => Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0))

function checkWin(board, r, c, player) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  for (const [dr, dc] of dirs) {
    let count = 1
    let minR = r, minC = c, maxR = r, maxC = c
    for (let d = 1; d < 5; d++) {
      const nr = r + dr * d, nc = c + dc * d
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === player) {
        count++; maxR = nr; maxC = nc
      } else break
    }
    for (let d = 1; d < 5; d++) {
      const nr = r - dr * d, nc = c - dc * d
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === player) {
        count++; minR = nr; minC = nc
      } else break
    }
    if (count >= 5) return [minR, minC, maxR, maxC]
  }
  return null
}

function checkDraw(board) {
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (board[r][c] === 0) return false
  return true
}

function computeTrustLevel(moveCount, networkMode) {
  if (networkMode === 'online') return 'L1'
  if (networkMode === 'offline-p2p') return 'L3'
  if (moveCount >= 5) return 'L4'
  return 'L5'
}

export function useGameEngine() {
  const [board, setBoard] = useState(emptyBoard)
  const [currentPlayer, setCurrentPlayer] = useState(1)
  const [moveHistory, setMoveHistory] = useState([])
  const [gameOver, setGameOver] = useState(false)
  const [winningLine, setWinningLine] = useState(null)
  const [lastMove, setLastMove] = useState(null)
  const [hoverCell, setHoverCell] = useState(null)
  const [blackCount, setBlackCount] = useState(0)
  const [whiteCount, setWhiteCount] = useState(0)
  const [gameId, setGameId] = useState(() => generateId())
  const [genesisHash, setGenesisHash] = useState('')
  const [networkMode, setNetworkMode] = useState('offline-solo')
  const [isDraw, setIsDraw] = useState(false)
  const [resignedPlayer, setResignedPlayer] = useState(null)

  const chainHashRef = useRef(null)
  const boardRef = useRef(board)
  const moveHistoryRef = useRef(moveHistory)
  const gameIdRef = useRef(gameId)
  // BUG-C1: currentPlayerRef keeps currentPlayer in sync for use inside useCallback closures.
  // Although currentPlayer IS listed in placeStone's deps array (so the closure is always
  // recreated with a fresh value), using a ref is the canonical pattern that eliminates
  // any risk of stale captures and avoids unnecessary callback re-creation on every turn.
  const currentPlayerRef = useRef(currentPlayer)

  boardRef.current = board
  moveHistoryRef.current = moveHistory
  gameIdRef.current = gameId
  currentPlayerRef.current = currentPlayer

  const initGenesis = useCallback(async (id) => {
    const h = await generateGenesisHash(id)
    setGenesisHash(h)
    chainHashRef.current = h
  }, [])

  // Fix: was useState() — must be useEffect for async side effect on mount
  useEffect(() => { initGenesis(gameId) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const trustLevel = computeTrustLevel(moveHistory.length, networkMode)
  const trustConfig = TRUST_LEVELS[trustLevel]

  /**
   * Place a stone at (r, c).
   * @param {string|null} expectedHash  If provided (remote move), compare against computed hash.
   *   verified field on moveData: null=local, true=hash match, false=hash mismatch.
   */
  const placeStone = useCallback(async (r, c, expectedHash = null) => {
    const currentBoard = boardRef.current
    const currentHistory = moveHistoryRef.current
    const currentGameId = gameIdRef.current

    if (currentBoard[r][c] !== 0) return false

    const newBoard = currentBoard.map((row) => [...row])
    // BUG-C1 fix: read currentPlayer from ref instead of the closure variable.
    // The ref is kept in sync on every render (currentPlayerRef.current = currentPlayer above),
    // so this always reflects the latest value even if React batches state updates in ways
    // that could make the closure capture stale. The deps array is updated to remove
    // currentPlayer since we no longer rely on it being captured in the closure.
    const player = currentPlayerRef.current
    newBoard[r][c] = player

    const coord = COLS[c] + (BOARD_SIZE - r)
    const timestamp = Date.now()
    const moveNum = currentHistory.length + 1
    const moveData = { num: moveNum, player, r, c, coord, timestamp }

    const prevHash = chainHashRef.current || ''
    const hash = await computeMoveHash(moveData, prevHash, currentGameId)
    moveData.hash = hash
    // null = local move; true = remote & verified; false = remote & tampered
    moveData.verified = expectedHash == null ? null : hash === expectedHash
    chainHashRef.current = hash

    const newHistory = [...currentHistory, moveData]

    setBoard(newBoard)
    setMoveHistory(newHistory)
    setLastMove({ r, c })

    if (player === 1) setBlackCount((n) => n + 1)
    else setWhiteCount((n) => n + 1)

    const winLine = checkWin(newBoard, r, c, player)
    if (winLine) {
      setWinningLine(winLine)
      setGameOver(true)
      return { won: true, player, hash }
    }

    if (checkDraw(newBoard)) {
      setIsDraw(true)
      setGameOver(true)
      return { draw: true, hash }
    }

    setCurrentPlayer(player === 1 ? 2 : 1)
    return { ok: true, hash }
  }, [])

  const undoMove = useCallback((isAiMode) => {
    const history = moveHistoryRef.current
    const currentBoard = boardRef.current
    if (history.length === 0) return

    const undoCount = isAiMode && history.length >= 2 ? 2 : 1
    const newHistory = history.slice(0, -undoCount)
    const newBoard = currentBoard.map((row) => [...row])

    for (let i = 0; i < undoCount && history.length - 1 - i >= 0; i++) {
      const m = history[history.length - 1 - i]
      newBoard[m.r][m.c] = 0
      if (m.player === 1) setBlackCount((n) => Math.max(0, n - 1))
      else setWhiteCount((n) => Math.max(0, n - 1))
    }

    chainHashRef.current = newHistory.length > 0
      ? newHistory[newHistory.length - 1].hash
      : genesisHash

    setBoard(newBoard)
    setMoveHistory(newHistory)
    // BUG-C3 fix: derive the current player from remaining move count instead of hardcoding 1.
    // Black (player 1) goes first, so even-length history → black's turn, odd-length → white's.
    setCurrentPlayer(newHistory.length % 2 === 0 ? 1 : 2)
    setLastMove(newHistory.length > 0 ? { r: newHistory[newHistory.length - 1].r, c: newHistory[newHistory.length - 1].c } : null)
    setGameOver(false)
    setWinningLine(null)
    setIsDraw(false)
    setResignedPlayer(null)
  }, [genesisHash])

  const resignGame = useCallback(() => {
    setResignedPlayer(currentPlayer)
    setGameOver(true)
  }, [currentPlayer])

  const exportGame = useCallback(() => {
    const history = moveHistoryRef.current
    // BUG-C2 fix: determine winner from the last move's player field rather than from
    // currentPlayer state. When a win occurs, placeStone returns early without calling
    // setCurrentPlayer, so currentPlayer still holds the winner's value at that instant —
    // but this is a fragile implicit contract. Reading the last move's player is explicit
    // and immune to any future refactoring that might flip currentPlayer at game-end.
    const lastMovePlayer = history.length > 0 ? history[history.length - 1].player : null
    const record = {
      gameId,
      timestamp: new Date().toISOString(),
      moves: history.map((m) => ({
        num: m.num,
        player: m.player === 1 ? 'black' : 'white',
        coord: m.coord,
        hash: m.hash,
        verified: m.verified,
      })),
      result: gameOver
        ? resignedPlayer ? `${resignedPlayer === 1 ? 'white' : 'black'}_wins_by_resignation`
          : isDraw ? 'draw'
          : `${lastMovePlayer === 1 ? 'black' : 'white'}_wins`
        : 'in_progress',
      totalMoves: history.length,
    }
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gomoku_${gameId}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [gameId, gameOver, isDraw, resignedPlayer])

  /** Start a fresh game. Returns the new gameId so callers can sync it over the network. */
  const newGame = useCallback(() => {
    const id = generateId()
    setGameId(id)
    setBoard(emptyBoard())
    setCurrentPlayer(1)
    setMoveHistory([])
    setGameOver(false)
    setWinningLine(null)
    setLastMove(null)
    setHoverCell(null)
    setBlackCount(0)
    setWhiteCount(0)
    setIsDraw(false)
    setResignedPlayer(null)
    chainHashRef.current = null
    initGenesis(id)
    return id
  }, [initGenesis])

  /**
   * Initialize this client into an existing room using the host's gameId.
   * Both peers will derive the same deterministic genesisHash, so the hash
   * chain stays in sync for cross-peer verification.
   */
  const initWithRoom = useCallback(async (hostGameId) => {
    const h = await generateGenesisHash(hostGameId)
    setGameId(hostGameId)
    setGenesisHash(h)
    chainHashRef.current = h
    setBoard(emptyBoard())
    setCurrentPlayer(1)
    setMoveHistory([])
    setGameOver(false)
    setWinningLine(null)
    setLastMove(null)
    setHoverCell(null)
    setBlackCount(0)
    setWhiteCount(0)
    setIsDraw(false)
    setResignedPlayer(null)
  }, [])

  return {
    board, currentPlayer, moveHistory, gameOver, winningLine,
    lastMove, hoverCell, setHoverCell, blackCount, whiteCount,
    gameId, genesisHash, networkMode, setNetworkMode,
    trustLevel, trustConfig, isDraw, resignedPlayer,
    placeStone, undoMove, resignGame, exportGame, newGame, initWithRoom,
  }
}
