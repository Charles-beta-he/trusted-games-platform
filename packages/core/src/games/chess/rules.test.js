import { describe, it, expect } from 'vitest'
import {
  createInitialBoard,
  createInitialState,
  getValidMoves,
  getBestMove,
  isInCheck,
  isCheckmate,
  isStalemate,
  applyMove,
  isPromotionMove,
  findKing,
  COLS,
  P,
  ROWS,
} from './rules.js'

describe('chess rules', () => {
  it('初始棋盘国王、骑士有合法着法', () => {
    const state = createInitialState()
    const b = state.board
    expect(b[7][4]).toBe(P.KING)
    // White pawns can move 1 or 2
    const pawnMoves = getValidMoves(state, 6, 4)
    expect(pawnMoves.length).toBe(2)
    // White knight can move
    const knightMoves = getValidMoves(state, 7, 1)
    expect(knightMoves.length).toBe(2)
  })

  it('兵可以前进两格（初始位置）', () => {
    const state = createInitialState()
    const moves = getValidMoves(state, 6, 0)
    expect(moves).toContainEqual([5, 0])
    expect(moves).toContainEqual([4, 0])
  })

  it('马不受蹩腿限制（国际象棋规则）', () => {
    const state = createInitialState()
    // Knight at b1 (7,1) can go to a3 (5,0) and c3 (5,2)
    const moves = getValidMoves(state, 7, 1)
    expect(moves).toContainEqual([5, 0])
    expect(moves).toContainEqual([5, 2])
  })

  it('王车易位（白方王翼）', () => {
    const state = {
      board: createInitialBoard(),
      castlingRights: { whiteKingSide: true, whiteQueenSide: true, blackKingSide: true, blackQueenSide: true },
      enPassantTarget: null,
      halfMoveClock: 0,
      fullMoveNumber: 1,
    }
    // Clear path for kingside castling
    state.board[7][5] = 0
    state.board[7][6] = 0
    const moves = getValidMoves(state, 7, 4)
    expect(moves).toContainEqual([7, 6]) // Castling king to g1
  })

  it('吃过路兵', () => {
    // Setup: black pawn just double-pushed to d5 (3,3), white pawn on e5 (3,4)
    const board = Array.from({ length: ROWS }, () => new Array(COLS).fill(0))
    board[3][3] = -P.PAWN // Black pawn on d5
    board[3][4] = P.PAWN   // White pawn on e5
    board[7][4] = P.KING
    board[0][4] = -P.KING
    const state = {
      board,
      castlingRights: { whiteKingSide: false, whiteQueenSide: false, blackKingSide: false, blackQueenSide: false },
      enPassantTarget: [2, 3], // White captures by moving to d6 (row 2, col 3)
      halfMoveClock: 0,
      fullMoveNumber: 1,
    }
    const moves = getValidMoves(state, 3, 4)
    expect(moves).toContainEqual([2, 3]) // Capture en passant e5xd6
  })

  it('兵升变为皇后', () => {
    const board = Array.from({ length: ROWS }, () => new Array(COLS).fill(0))
    board[1][0] = P.PAWN   // White pawn about to promote
    board[7][4] = P.KING
    board[0][4] = -P.KING
    const state = { board, castlingRights: { whiteKingSide: false, whiteQueenSide: false, blackKingSide: false, blackQueenSide: false }, enPassantTarget: null, halfMoveClock: 0, fullMoveNumber: 1 }
    const nextState = applyMove(state, 1, 0, 0, 0)
    expect(nextState.board[0][0]).toBe(P.QUEEN) // Promoted to queen
  })

  it('getBestMove 返回合法着法', () => {
    const state = createInitialState()
    const m = getBestMove(state.board, 1, 'easy', {}, state)
    expect(m).not.toBeNull()
    const ok = getValidMoves(state, m.fr, m.fc).some(([tr, tc]) => tr === m.tr && tc === m.tc)
    expect(ok).toBe(true)
  })

  it('applyMove 更新落点与源格', () => {
    const state = createInitialState()
    const nextState = applyMove(state, 6, 4, 4, 4) // e2-e4
    expect(nextState.board[6][4]).toBe(0)
    expect(nextState.board[4][4]).toBe(P.PAWN)
  })

  it('findKing 找到国王位置', () => {
    const state = createInitialState()
    expect(findKing(state.board, 1)).toEqual([7, 4])
    expect(findKing(state.board, -1)).toEqual([0, 4])
  })

  it('将杀检测：Scholar\'s mate', () => {
    const state = createInitialState()
    // 1. e4 e5
    let s = applyMove(state, 6, 4, 4, 4) // e4
    s = applyMove(s, 1, 4, 3, 4) // e5
    // 2. Qh5 Nc6
    s = applyMove(s, 7, 3, 3, 7) // Qh5
    s = applyMove(s, 0, 1, 2, 2) // Nc6
    // 3. Bc4 Nf6
    s = applyMove(s, 7, 5, 4, 2) // Bc4
    s = applyMove(s, 0, 6, 2, 5) // Nf6
    // 4. Qxf7# - capture on f7
    s = applyMove(s, 3, 7, 1, 5) // Qxf7
    expect(isCheckmate(s.board, -1, s)).toBe(true)
  })

  it('逼和检测', () => {
    // Classic stalemate: Ka6 Qb6 vs Ka8
    const board = Array.from({ length: ROWS }, () => new Array(COLS).fill(0))
    board[2][0] = P.KING    // White king on a6
    board[2][1] = P.QUEEN   // White queen on b6
    board[0][0] = -P.KING   // Black king on a8
    const state = { board, castlingRights: { whiteKingSide: false, whiteQueenSide: false, blackKingSide: false, blackQueenSide: false }, enPassantTarget: null, halfMoveClock: 0, fullMoveNumber: 1 }
    expect(isStalemate(state.board, -1, state)).toBe(true)
    expect(isCheckmate(state.board, -1, state)).toBe(false)
  })

  it('升变检测', () => {
    const board = Array.from({ length: ROWS }, () => new Array(COLS).fill(0))
    board[1][0] = P.PAWN
    board[7][4] = P.KING
    board[0][4] = -P.KING
    const state = { board, castlingRights: { whiteKingSide: false, whiteQueenSide: false, blackKingSide: false, blackQueenSide: false }, enPassantTarget: null, halfMoveClock: 0, fullMoveNumber: 1 }
    expect(isPromotionMove(state, 1, 0, 0)).toBe(true)
    expect(isPromotionMove(state, 6, 0, 5)).toBe(false)
  })
})
