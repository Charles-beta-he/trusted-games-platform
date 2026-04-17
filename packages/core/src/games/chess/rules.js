/**
 * 国际象棋规则引擎
 * 坐标：8×8，row 0 为黑方底线，row 7 为白方底线；白子为正、黑子为负。
 * 特殊规则：王车易位、吃过路兵、兵升变。
 */

export const ROWS = 8
export const COLS = 8

export const P = {
  KING: 1,
  QUEEN: 2,
  ROOK: 3,
  BISHOP: 4,
  KNIGHT: 5,
  PAWN: 6,
}

const abs = Math.abs

function side(p) {
  if (p > 0) return 1   // white
  if (p < 0) return -1  // black
  return 0
}

function isWhite(p) { return p > 0 }

export function createInitialBoard() {
  const b = Array.from({ length: ROWS }, () => new Array(COLS).fill(0))
  // White pieces (row 7)
  b[7][0] = P.ROOK;  b[7][1] = P.KNIGHT; b[7][2] = P.BISHOP; b[7][3] = P.QUEEN
  b[7][4] = P.KING;  b[7][5] = P.BISHOP; b[7][6] = P.KNIGHT; b[7][7] = P.ROOK
  for (let c = 0; c < 8; c++) b[6][c] = P.PAWN
  // Black pieces (row 0)
  b[0][0] = -P.ROOK;  b[0][1] = -P.KNIGHT; b[0][2] = -P.BISHOP; b[0][3] = -P.QUEEN
  b[0][4] = -P.KING;  b[0][5] = -P.BISHOP; b[0][6] = -P.KNIGHT; b[0][7] = -P.ROOK
  for (let c = 0; c < 8; c++) b[1][c] = -P.PAWN
  return b
}

/**
 * 创建初始 castling rights 对象
 */
export function createInitialCastlingRights() {
  return {
    whiteKingSide: true,
    whiteQueenSide: true,
    blackKingSide: true,
    blackQueenSide: true,
  }
}

/**
 * 创建初始游戏状态
 */
export function createInitialState() {
  return {
    board: createInitialBoard(),
    castlingRights: createInitialCastlingRights(),
    enPassantTarget: null, // [row, col] or null
    halfMoveClock: 0,
    fullMoveNumber: 1,
  }
}

/**
 * 棋子伪合法移动（不考虑将军/被将）
 */
function addSlidingMoves(board, r, c, piece, dirs, out) {
  for (const [dr, dc] of dirs) {
    for (let i = 1; i < 8; i++) {
      const nr = r + dr * i
      const nc = c + dc * i
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break
      const t = board[nr][nc]
      if (t === 0) {
        out.push([nr, nc])
      } else {
        if (side(t) !== side(piece)) out.push([nr, nc])
        break
      }
    }
  }
}

const KNIGHT_DELTAS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
]

const KING_DELTAS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
]

/**
 * 获取伪合法移动（不含 castling / en passant / 检查过滤）
 */
export function getPseudoLegalMoves(state, r, c) {
  const { board, castlingRights, enPassantTarget } = state
  const piece = board[r][c]
  if (piece === 0) return []
  const tp = abs(piece)
  const out = []

  switch (tp) {
    case P.PAWN: {
      const forward = isWhite(piece) ? -1 : 1
      const startRow = isWhite(piece) ? 6 : 1
      const promoRow = isWhite(piece) ? 0 : 7
      // Forward 1
      const nr1 = r + forward
      if (nr1 >= 0 && nr1 < ROWS && board[nr1][c] === 0) {
        out.push([nr1, c])
        // Forward 2 from start
        if (r === startRow) {
          const nr2 = r + 2 * forward
          if (board[nr2][c] === 0) out.push([nr2, c])
        }
      }
      // Captures
      for (const dc of [-1, 1]) {
        const nc = c + dc
        if (nc < 0 || nc >= COLS) continue
        const nr = r + forward
        if (nr < 0 || nr >= ROWS) continue
        const t = board[nr][nc]
        if (t !== 0 && side(t) !== side(piece)) out.push([nr, nc])
        // En passant
        if (enPassantTarget && enPassantTarget[0] === nr && enPassantTarget[1] === nc) {
          out.push([nr, nc])
        }
      }
      break
    }
    case P.KNIGHT: {
      for (const [dr, dc] of KNIGHT_DELTAS) {
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
        const t = board[nr][nc]
        if (t === 0 || side(t) !== side(piece)) out.push([nr, nc])
      }
      break
    }
    case P.BISHOP: {
      addSlidingMoves(board, r, c, piece, [[-1,-1],[-1,1],[1,-1],[1,1]], out)
      break
    }
    case P.ROOK: {
      addSlidingMoves(board, r, c, piece, [[-1,0],[1,0],[0,-1],[0,1]], out)
      break
    }
    case P.QUEEN: {
      addSlidingMoves(board, r, c, piece,
        [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]], out)
      break
    }
    case P.KING: {
      for (const [dr, dc] of KING_DELTAS) {
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
        const t = board[nr][nc]
        if (t === 0 || side(t) !== side(piece)) out.push([nr, nc])
      }
      // Castling
      const w = isWhite(piece)
      const kingRow = w ? 7 : 0
      if (r === kingRow && c === 4) {
        // King side
        const ks = w ? castlingRights.whiteKingSide : castlingRights.blackKingSide
        if (ks && board[kingRow][5] === 0 && board[kingRow][6] === 0
            && abs(board[kingRow][7]) === P.ROOK && side(board[kingRow][7]) === side(piece)) {
          out.push([kingRow, 6])
        }
        // Queen side
        const qs = w ? castlingRights.whiteQueenSide : castlingRights.blackQueenSide
        if (qs && board[kingRow][3] === 0 && board[kingRow][2] === 0 && board[kingRow][1] === 0
            && abs(board[kingRow][0]) === P.ROOK && side(board[kingRow][0]) === side(piece)) {
          out.push([kingRow, 2])
        }
      }
      break
    }
    default: break
  }
  return out
}

/**
 * 查找国王位置
 */
export function findKing(board, playerSide) {
  const target = playerSide > 0 ? P.KING : -P.KING
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === target) return [r, c]
    }
  }
  return null
}

/**
 * 检查 board 上某方是否被将军
 */
export function isInCheck(board, friendlySide) {
  const king = findKing(board, friendlySide)
  if (!king) return false
  const [kr, kc] = king
  const opp = -friendlySide
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (side(board[r][c]) !== opp) continue
      // 使用简单的伪合法移动来检测攻击
      const attacks = getAttackSquares(board, r, c)
      for (const [tr, tc] of attacks) {
        if (tr === kr && tc === kc) return true
      }
    }
  }
  return false
}

/**
 * 获取棋子攻击的格子（用于将军检测，不包含 castling）
 */
function getAttackSquares(board, r, c) {
  const piece = board[r][c]
  if (piece === 0) return []
  const tp = abs(piece)
  const out = []

  switch (tp) {
    case P.PAWN: {
      const forward = isWhite(piece) ? -1 : 1
      for (const dc of [-1, 1]) {
        const nr = r + forward
        const nc = c + dc
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push([nr, nc])
      }
      break
    }
    case P.KNIGHT: {
      for (const [dr, dc] of KNIGHT_DELTAS) {
        const nr = r + dr
        const nc = c + dc
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push([nr, nc])
      }
      break
    }
    case P.BISHOP: {
      addSlidingMoves(board, r, c, piece, [[-1,-1],[-1,1],[1,-1],[1,1]], out)
      break
    }
    case P.ROOK: {
      addSlidingMoves(board, r, c, piece, [[-1,0],[1,0],[0,-1],[0,1]], out)
      break
    }
    case P.QUEEN: {
      addSlidingMoves(board, r, c, piece,
        [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]], out)
      break
    }
    case P.KING: {
      for (const [dr, dc] of KING_DELTAS) {
        const nr = r + dr
        const nc = c + dc
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push([nr, nc])
      }
      break
    }
    default: break
  }
  return out
}

/**
 * 执行移动，返回新状态
 */
export function applyMove(state, fr, fc, tr, tc, promotionPiece) {
  const { board, castlingRights, enPassantTarget, halfMoveClock, fullMoveNumber } = state
  const next = board.map((row) => [...row])
  const piece = next[fr][fc]
  const tp = abs(piece)
  const captured = next[tr][tc]
  const w = isWhite(piece)
  const newCR = { ...castlingRights }
  let newEP = null
  let newHalfMove = halfMoveClock + 1

  // Move piece
  next[tr][tc] = piece
  next[fr][fc] = 0

  // En passant capture
  if (tp === P.PAWN && enPassantTarget && tr === enPassantTarget[0] && tc === enPassantTarget[1]) {
    const capturedRow = w ? tr + 1 : tr - 1
    next[capturedRow][tc] = 0
  }

  // Pawn double push -> set en passant target
  if (tp === P.PAWN && Math.abs(tr - fr) === 2) {
    newEP = [(fr + tr) / 2, fc]
  }

  // Pawn promotion
  if (tp === P.PAWN && (tr === 0 || tr === 7)) {
    const promo = promotionPiece || P.QUEEN
    next[tr][tc] = w ? promo : -promo
  }

  // Castling: move rook
  if (tp === P.KING && Math.abs(tc - fc) === 2) {
    if (tc === 6) { // King side
      next[tr][5] = next[tr][7]
      next[tr][7] = 0
    } else if (tc === 2) { // Queen side
      next[tr][3] = next[tr][0]
      next[tr][0] = 0
    }
  }

  // Update castling rights
  if (tp === P.KING) {
    if (w) { newCR.whiteKingSide = false; newCR.whiteQueenSide = false }
    else { newCR.blackKingSide = false; newCR.blackQueenSide = false }
  }
  if (tp === P.ROOK) {
    if (fr === 7 && fc === 0) newCR.whiteQueenSide = false
    if (fr === 7 && fc === 7) newCR.whiteKingSide = false
    if (fr === 0 && fc === 0) newCR.blackQueenSide = false
    if (fr === 0 && fc === 7) newCR.blackKingSide = false
  }
  // Rook captured
  if (tr === 7 && tc === 0) newCR.whiteQueenSide = false
  if (tr === 7 && tc === 7) newCR.whiteKingSide = false
  if (tr === 0 && tc === 0) newCR.blackQueenSide = false
  if (tr === 0 && tc === 7) newCR.blackKingSide = false

  // Half-move clock reset on pawn move or capture
  if (tp === P.PAWN || captured !== 0) newHalfMove = 0

  const newFullMove = fullMoveNumber + (w ? 0 : 1)

  return {
    board: next,
    castlingRights: newCR,
    enPassantTarget: newEP,
    halfMoveClock: newHalfMove,
    fullMoveNumber: newFullMove,
  }
}

/**
 * 检查 castling 路径是否安全（国王不经过被将军的格子）
 */
function isCastlingPathSafe(board, kingRow, kingCol, targetCol, friendlySide) {
  const step = targetCol > kingCol ? 1 : -1
  for (let c = kingCol; c !== targetCol + step; c += step) {
    const tmp = board.map(row => [...row])
    tmp[kingRow][c] = tmp[kingRow][kingCol]
    tmp[kingRow][kingCol] = 0
    if (isInCheck(tmp, friendlySide)) return false
  }
  return true
}

/**
 * 获取合法移动
 */
export function getValidMoves(state, r, c) {
  const { board } = state
  const piece = board[r][c]
  if (piece === 0) return []
  const side_ = side(piece)
  const pseudo = getPseudoLegalMoves(state, r, c)
  const legal = []

  for (const [tr, tc] of pseudo) {
    // Special castling validation
    if (abs(piece) === P.KING && Math.abs(tc - c) === 2) {
      if (!isCastlingPathSafe(board, r, c, tc, side_)) continue
    }
    const nextState = applyMove(state, r, c, tr, tc)
    if (!isInCheck(nextState.board, side_)) legal.push([tr, tc])
  }
  return legal
}

/**
 * 检查是否为 pawn promotion 移动
 */
export function isPromotionMove(state, fr, fc, tr) {
  const piece = state.board[fr][fc]
  if (abs(piece) !== P.PAWN) return false
  const w = isWhite(piece)
  return w ? tr === 0 : tr === 7
}

/**
 * 检查将杀
 */
export function isCheckmate(board, sideToMove, state) {
  if (!isInCheck(board, sideToMove)) return false
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (side(board[r][c]) !== sideToMove) continue
      if (getValidMoves(state || { board }, r, c).length > 0) return false
    }
  }
  return true
}

/**
 * 检查逼和（stalemate）
 */
export function isStalemate(board, sideToMove, state) {
  if (isInCheck(board, sideToMove)) return false
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (side(board[r][c]) !== sideToMove) continue
      if (getValidMoves(state || { board }, r, c).length > 0) return false
    }
  }
  return true
}

/**
 * 检查 50 回合规则
 */
export function isFiftyMoveRule(halfMoveClock) {
  return halfMoveClock >= 100 // 50 full moves = 100 half moves
}

// ── AI 评估系统 ──────────────────────────────────────────────────────────────

const PIECE_BASE_VALUE = {
  [P.KING]:   20000,
  [P.QUEEN]:   900,
  [P.ROOK]:    500,
  [P.BISHOP]:  330,
  [P.KNIGHT]:  320,
  [P.PAWN]:    100,
}

// Piece-Square Tables (from white's perspective, row 0 = top/black side)
const PST_PAWN = [
  [ 0, 0, 0, 0, 0, 0, 0, 0],
  [50,50,50,50,50,50,50,50],
  [10,10,20,30,30,20,10,10],
  [ 5, 5,10,25,25,10, 5, 5],
  [ 0, 0, 0,20,20, 0, 0, 0],
  [ 5,-5,-10, 0, 0,-10,-5, 5],
  [ 5,10,10,-20,-20,10,10, 5],
  [ 0, 0, 0, 0, 0, 0, 0, 0],
]

const PST_KNIGHT = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20, 0, 0, 0, 0,-20,-40],
  [-30, 0,10,15,15,10, 0,-30],
  [-30, 5,15,20,20,15, 5,-30],
  [-30, 0,15,20,20,15, 0,-30],
  [-30, 5,10,15,15,10, 5,-30],
  [-40,-20, 0, 5, 5, 0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
]

const PST_BISHOP = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10, 0, 0, 0, 0, 0, 0,-10],
  [-10, 0,10,10,10,10, 0,-10],
  [-10, 5, 5,10,10, 5, 5,-10],
  [-10, 0,10,10,10,10, 0,-10],
  [-10,10,10,10,10,10,10,-10],
  [-10, 5, 0, 0, 0, 0, 5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20],
]

const PST_ROOK = [
  [ 0, 0, 0, 0, 0, 0, 0, 0],
  [ 5,10,10,10,10,10,10, 5],
  [-5, 0, 0, 0, 0, 0, 0,-5],
  [-5, 0, 0, 0, 0, 0, 0,-5],
  [-5, 0, 0, 0, 0, 0, 0,-5],
  [-5, 0, 0, 0, 0, 0, 0,-5],
  [-5, 0, 0, 0, 0, 0, 0,-5],
  [ 0, 0, 0, 5, 5, 0, 0, 0],
]

const PST_QUEEN = [
  [-20,-10,-10,-5,-5,-10,-10,-20],
  [-10, 0, 0, 0, 0, 0, 0,-10],
  [-10, 0, 5, 5, 5, 5, 0,-10],
  [ -5, 0, 5, 5, 5, 5, 0, -5],
  [  0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0,-10],
  [-10, 0, 5, 0, 0, 0, 0,-10],
  [-20,-10,-10,-5,-5,-10,-10,-20],
]

const PST_KING_MIDDLEGAME = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [ 20, 20, 0, 0, 0, 0, 20, 20],
  [ 20, 30,10, 0, 0, 10, 30, 20],
]

const PST_KING_ENDGAME = [
  [-50,-40,-30,-20,-20,-30,-40,-50],
  [-30,-20,-10, 0, 0,-10,-20,-30],
  [-30,-10,20,30,30,20,-10,-30],
  [-30,-10,30,40,40,30,-10,-30],
  [-30,-10,30,40,40,30,-10,-30],
  [-30,-10,20,30,30,20,-10,-30],
  [-30,-30, 0, 0, 0, 0,-30,-30],
  [-50,-30,-30,-30,-30,-30,-30,-50],
]

function getPSTValue(type, r, c, pieceSide, isEndgame) {
  // Mirror for black
  const row = pieceSide === 1 ? r : 7 - r
  const col = c
  switch (type) {
    case P.PAWN:   return PST_PAWN[row][col]
    case P.KNIGHT: return PST_KNIGHT[row][col]
    case P.BISHOP: return PST_BISHOP[row][col]
    case P.ROOK:   return PST_ROOK[row][col]
    case P.QUEEN:  return PST_QUEEN[row][col]
    case P.KING:   return isEndgame ? PST_KING_ENDGAME[row][col] : PST_KING_MIDDLEGAME[row][col]
    default: return 0
  }
}

function isEndgame(board) {
  let queens = 0
  let minors = 0
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = abs(board[r][c])
      if (p === P.QUEEN) queens++
      if (p === P.BISHOP || p === P.KNIGHT) minors++
    }
  }
  return queens === 0 || (queens <= 2 && minors <= 2)
}

function evaluate(board, sideToMove) {
  const eg = isEndgame(board)
  let score = 0
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c]
      if (p === 0) continue
      const type = abs(p)
      const pSide = side(p)
      const val = PIECE_BASE_VALUE[type] + getPSTValue(type, r, c, pSide, eg)
      score += pSide === sideToMove ? val : -val
    }
  }
  // Bishop pair bonus
  let wBishops = 0, bBishops = 0
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (abs(board[r][c]) === P.BISHOP) {
        if (board[r][c] > 0) wBishops++; else bBishops++
      }
    }
  }
  if (wBishops >= 2) score += sideToMove === 1 ? 30 : -30
  if (bBishops >= 2) score += sideToMove === -1 ? 30 : -30

  return score
}

/**
 * α-β Negamax 搜索
 */
function negamax(board, state, depth, alpha, beta, sideToMove) {
  if (depth === 0) return evaluate(board, sideToMove)

  const moves = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (side(board[r][c]) !== sideToMove) continue
      for (const [tr, tc] of getValidMoves(state || { board }, r, c)) {
        moves.push({ fr: r, fc: c, tr, tc, cap: board[tr][tc] })
      }
    }
  }

  if (moves.length === 0) {
    return isInCheck(board, sideToMove) ? -100000 - depth : 0
  }

  // MVV-LVA ordering
  moves.sort((a, b) => PIECE_BASE_VALUE[abs(b.cap)] - PIECE_BASE_VALUE[abs(a.cap)])

  let best = -Infinity
  for (const m of moves) {
    const nextState = applyMove(state || { board }, m.fr, m.fc, m.tr, m.tc)
    const val = -negamax(nextState.board, nextState, depth - 1, -beta, -alpha, -sideToMove)
    if (val > best) best = val
    if (val > alpha) alpha = val
    if (alpha >= beta) break
  }
  return best
}

const PIECE_CAPTURE_SCORE = {
  [P.KING]:   20000,
  [P.QUEEN]:   900,
  [P.ROOK]:    500,
  [P.BISHOP]:  330,
  [P.KNIGHT]:  320,
  [P.PAWN]:    100,
}

/**
 * Chess AI — 四档难度：
 *   easy:   纯随机
 *   medium: 贪心吃子
 *   hard:   α-β Negamax d2
 *   expert: α-β Negamax d3
 */
export function getBestMove(board, sideToMove, difficulty = 'medium', aiParams = {}, state) {
  const fullState = state || { board }
  const moves = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (side(board[r][c]) !== sideToMove) continue
      for (const [tr, tc] of getValidMoves(fullState, r, c)) {
        moves.push({ fr: r, fc: c, tr, tc, cap: board[tr][tc] })
      }
    }
  }
  if (moves.length === 0) return null

  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

  if (difficulty === 'easy') return pickRandom(moves)

  if (difficulty === 'medium') {
    const captures = moves.filter((m) => m.cap !== 0)
    if (captures.length > 0 && Math.random() > 0.35) {
      captures.sort((a, b) => PIECE_CAPTURE_SCORE[abs(b.cap)] - PIECE_CAPTURE_SCORE[abs(a.cap)])
      return captures[0]
    }
    return pickRandom(moves)
  }

  const SEARCH_DEPTH = { hard: 2, expert: 3 }
  const depth = SEARCH_DEPTH[difficulty] ?? 2

  const NOISE_MARGIN = { none: 0, slight: 80, high: 300 }
  const margin = NOISE_MARGIN[aiParams?.noise] ?? NOISE_MARGIN.slight

  moves.sort((a, b) => PIECE_BASE_VALUE[abs(b.cap)] - PIECE_BASE_VALUE[abs(a.cap)])

  const results = moves.map((m) => {
    const nextState = applyMove(fullState, m.fr, m.fc, m.tr, m.tc)
    const val = -negamax(nextState.board, nextState, depth - 1, -Infinity, Infinity, -sideToMove)
    return { m, val }
  })
  results.sort((a, b) => b.val - a.val)

  const topScore = results[0].val
  const pool = results.filter((x) => x.val >= topScore - margin).map((x) => x.m)

  if (aiParams?.aggression === 'aggressive') {
    const capPool = pool.filter((m) => m.cap !== 0)
    if (capPool.length > 0) return pickRandom(capPool)
  }
  if (aiParams?.aggression === 'conservative') {
    const safePool = pool.filter((m) => m.cap === 0)
    if (safePool.length > 0 && Math.random() > 0.3) return pickRandom(safePool)
  }

  return pickRandom(pool)
}
