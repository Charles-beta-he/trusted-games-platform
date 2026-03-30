import { useState, useCallback, useRef, useEffect } from 'react'
import { BOARD_SIZE, COLS, TRUST_LEVELS } from '@tg/core/constants'
import { generateId, generateGenesisHash, computeMoveHash } from '@tg/core/crypto'
import { gomokuGame } from '@tg/core'

const { validateMove: validateGomokuMove, DEFAULT_RULE } = gomokuGame

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

/** Gomoku coord e.g. "H8" → { r, c } */
export function coordToRc(coord) {
  if (!coord || typeof coord !== 'string') return null
  const s = coord.trim().toUpperCase()
  const col = s[0]
  const rowNum = parseInt(s.slice(1), 10)
  if (Number.isNaN(rowNum)) return null
  const c = COLS.indexOf(col)
  const r = BOARD_SIZE - rowNum
  if (c < 0 || r < 0 || r >= BOARD_SIZE || c >= BOARD_SIZE) return null
  return { r, c }
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
  /** 五子棋规则：`standard` 自由五子，`renju` 连珠黑禁手（仅本机落子校验） */
  const [rulePreset, setRulePreset] = useState(DEFAULT_RULE)
  const rulePresetRef = useRef(rulePreset)
  useEffect(() => {
    rulePresetRef.current = rulePreset
  }, [rulePreset])

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
   * @param {string|null} expectedHash  Remote move: verify chain; local: null.
   * @param {number|null} networkPlayer  Remote: 1|2 from wire (avoids stale currentPlayerRef during async hash).
   */
  const placeStone = useCallback(async (r, c, expectedHash = null, networkPlayer = null) => {
    const currentBoard = boardRef.current
    const currentHistory = moveHistoryRef.current
    const currentGameId = gameIdRef.current

    if (currentBoard[r]?.[c] !== 0) return false

    const expectedTurn = currentHistory.length % 2 === 0 ? 1 : 2
    const isRemote = expectedHash != null
    /** Import / replay: force color without treating as wire-verified */
    const forcedSeat = !isRemote && networkPlayer != null

    let player
    if (forcedSeat) {
      player = networkPlayer
      if (player !== expectedTurn) return false
    } else if (isRemote) {
      player = networkPlayer != null ? networkPlayer : expectedTurn
      if (player !== expectedTurn) {
        console.warn('[game] remote move wrong turn', player, expectedTurn)
        return false
      }
    } else {
      player = currentPlayerRef.current
      if (player !== expectedTurn) return false
    }

    /** 联网对手着法以哈希链为准，避免双方规则预设不一致拒收同步子 */
    if (!isRemote) {
      const vm = validateGomokuMove(currentBoard, r, c, player, rulePresetRef.current)
      if (!vm.valid) return { illegal: true, reason: vm.reason }
    }

    const newBoard = currentBoard.map((row) => [...row])
    newBoard[r][c] = player

    const coord = COLS[c] + (BOARD_SIZE - r)
    const timestamp = Date.now()
    const moveNum = currentHistory.length + 1
    const moveData = { num: moveNum, player, r, c, coord, timestamp }

    const prevHash = chainHashRef.current || ''
    const hash = await computeMoveHash(moveData, prevHash, currentGameId)
    moveData.hash = hash
    moveData.verified = (expectedHash == null && !forcedSeat) ? null : (expectedHash != null ? hash === expectedHash : null)
    chainHashRef.current = hash

    const newHistory = [...currentHistory, moveData]

    setBoard(newBoard)
    setMoveHistory(newHistory)
    setLastMove({ r, c })
    boardRef.current = newBoard
    moveHistoryRef.current = newHistory

    if (player === 1) setBlackCount((n) => n + 1)
    else setWhiteCount((n) => n + 1)

    const winLine = checkWin(newBoard, r, c, player)
    const meta = { num: moveNum, r, c, coord }

    if (winLine) {
      currentPlayerRef.current = player
      setWinningLine(winLine)
      setGameOver(true)
      return { won: true, player, hash, ...meta }
    }

    if (checkDraw(newBoard)) {
      currentPlayerRef.current = player
      setIsDraw(true)
      setGameOver(true)
      return { draw: true, player, hash, ...meta }
    }

    const next = player === 1 ? 2 : 1
    currentPlayerRef.current = next
    setCurrentPlayer(next)
    return { ok: true, hash, player, ...meta }
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
    boardRef.current = newBoard
    moveHistoryRef.current = newHistory
    // BUG-C3 fix: derive the current player from remaining move count instead of hardcoding 1.
    // Black (player 1) goes first, so even-length history → black's turn, odd-length → white's.
    const nextP = newHistory.length % 2 === 0 ? 1 : 2
    currentPlayerRef.current = nextP
    setCurrentPlayer(nextP)
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
        r: m.r,
        c: m.c,
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
    const b = emptyBoard()
    setBoard(b)
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
    boardRef.current = b
    moveHistoryRef.current = []
    currentPlayerRef.current = 1
  }, [])

  /** Replay a game from export JSON (Trusted Games format). */
  const loadFromExport = useCallback(async (record) => {
    const moves = record?.moves
    if (!Array.isArray(moves) || moves.length === 0) return false
    const id = record.gameId || generateId()
    const h = await generateGenesisHash(id)
    setGameId(id)
    setGenesisHash(h)
    chainHashRef.current = h
    const b = emptyBoard()
    setBoard(b)
    setMoveHistory([])
    setCurrentPlayer(1)
    setGameOver(false)
    setWinningLine(null)
    setLastMove(null)
    setBlackCount(0)
    setWhiteCount(0)
    setIsDraw(false)
    setResignedPlayer(null)
    boardRef.current = b
    moveHistoryRef.current = []
    currentPlayerRef.current = 1

    for (const m of moves) {
      const player = (m.player === 'black' || m.player === 1) ? 1 : 2
      let rr, cc
      if (typeof m.r === 'number' && typeof m.c === 'number') {
        rr = m.r
        cc = m.c
      } else {
        const rc = coordToRc(m.coord)
        if (!rc) return false
        rr = rc.r
        cc = rc.c
      }
      const res = m.hash
        ? await placeStone(rr, cc, m.hash, player)
        : await placeStone(rr, cc, null, player)
      if (!res || res.illegal) return false
    }
    return true
  }, [placeStone])

  return {
    board, currentPlayer, moveHistory, gameOver, winningLine,
    lastMove, hoverCell, setHoverCell, blackCount, whiteCount,
    gameId, genesisHash, networkMode, setNetworkMode,
    trustLevel, trustConfig, isDraw, resignedPlayer,
    rulePreset, setRulePreset,
    placeStone, undoMove, resignGame, exportGame, newGame, initWithRoom, loadFromExport,
  }
}
