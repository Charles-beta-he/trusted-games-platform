/**
 * Shared gomoku move witness + ranked report validation.
 * Used by Cloudflare Worker and optional Node signaling (dev).
 * Hash chain matches packages/core/src/crypto.js.
 */

export const WITNESS_BOARD = 15
export const WITNESS_COLS = 'ABCDEFGHJKLMNOP'

export async function witnessSha256(data) {
  const buf = new TextEncoder().encode(data)
  const hashBuf = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function witnessGenesisHash(gameId) {
  return witnessSha256(JSON.stringify({ type: 'GENESIS', gameId }))
}

export async function witnessComputeMoveHash(move, prevHash, gameId) {
  return witnessSha256(
    JSON.stringify({
      num: move.num,
      player: move.player,
      r: move.r,
      c: move.c,
      coord: move.coord,
      prevHash,
      gameId,
    }),
  )
}

export function witnessEmptyBoard() {
  return Array.from({ length: WITNESS_BOARD }, () => new Array(WITNESS_BOARD).fill(0))
}

export function witnessCheckWin(board, r, c, player) {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]
  for (const [dr, dc] of dirs) {
    let count = 1
    for (let d = 1; d < 5; d++) {
      const nr = r + dr * d
      const nc = c + dc * d
      if (
        nr >= 0 &&
        nr < WITNESS_BOARD &&
        nc >= 0 &&
        nc < WITNESS_BOARD &&
        board[nr][nc] === player
      ) {
        count++
      } else break
    }
    for (let d = 1; d < 5; d++) {
      const nr = r - dr * d
      const nc = c - dc * d
      if (
        nr >= 0 &&
        nr < WITNESS_BOARD &&
        nc >= 0 &&
        nc < WITNESS_BOARD &&
        board[nr][nc] === player
      ) {
        count++
      } else break
    }
    if (count >= 5) return true
  }
  return false
}

export function witnessCheckDraw(board) {
  for (let r = 0; r < WITNESS_BOARD; r++)
    for (let c = 0; c < WITNESS_BOARD; c++) if (board[r][c] === 0) return false
  return true
}

export function witnessCanSubmit(role, expectedPlayer, hostIsBlack) {
  const hb = hostIsBlack
  if (expectedPlayer === 1) return hb ? role === 'host' : role === 'guest'
  return hb ? role === 'guest' : role === 'host'
}

export async function initWitnessState(gameId, hostIsBlack) {
  const genesisHash = await witnessGenesisHash(gameId)
  return {
    gameId,
    hostIsBlack: hostIsBlack !== false,
    board: witnessEmptyBoard(),
    moveHist: [],
    genesisHash,
    chainHash: genesisHash,
    status: 'in_progress',
  }
}

/** @returns { 'win' | 'lose' | 'draw' | null } */
export function expectedRankedResultForRole(witness, role) {
  const w = witness
  if (!w) return null
  if (w.status === 'draw') return 'draw'
  if (w.status === 'won') {
    const hostWon = (w.winner === 1 && w.hostIsBlack) || (w.winner === 2 && !w.hostIsBlack)
    if (role === 'host') return hostWon ? 'win' : 'lose'
    return hostWon ? 'lose' : 'win'
  }
  if (w.status === 'resigned') {
    const hostResigned =
      (w.resignedPlayer === 1 && w.hostIsBlack) || (w.resignedPlayer === 2 && !w.hostIsBlack)
    if (role === 'host') return hostResigned ? 'lose' : 'win'
    return hostResigned ? 'win' : 'lose'
  }
  return null
}

/**
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateRankedReport(witness, role, clientResult, gameId, chainHash) {
  if (!witness) return { ok: false, message: '见证未初始化，天梯成绩无法计入' }
  const gid = String(gameId ?? '')
  if (!gid || gid !== witness.gameId) return { ok: false, message: 'gameId 与见证不一致' }
  const ch = String(chainHash ?? '')
  if (!ch || ch !== witness.chainHash) return { ok: false, message: '链尖哈希与见证不一致' }
  const exp = expectedRankedResultForRole(witness, role)
  if (exp == null) return { ok: false, message: '见证未至终局（胜/负/认输/和棋）' }
  if (exp !== clientResult) return { ok: false, message: '上报成绩与服务器见证终局不符' }
  return { ok: true }
}

export async function witnessProcessRoomInit(room, role, msg) {
  if (!room || role !== 'host') return { type: 'witness_error', message: '仅供房主初始化见证' }
  const gameId = String(msg.gameId ?? '')
  if (!gameId) return { type: 'witness_error', message: '缺少 gameId' }
  room.witness = await initWitnessState(gameId, msg.hostIsBlack !== false)
  return { type: 'witness_ack', kind: 'room_init', gameId }
}

export async function witnessProcessMove(room, role, msg) {
  if (!room?.witness) return { type: 'witness_error', message: '见证未初始化' }
  const w = room.witness
  const gameId = String(msg.gameId ?? '')
  if (gameId !== w.gameId) return { type: 'witness_error', message: 'gameId 不一致' }
  if (w.status !== 'in_progress') return { type: 'witness_error', message: '对局已结束' }

  const n = Number(msg.n)
  const r = Number(msg.r)
  const c = Number(msg.c)
  const player = Number(msg.player)
  const coord = String(msg.coord ?? '')
  const hash = String(msg.hash ?? '')
  if (!Number.isInteger(n) || n < 1 || r < 0 || r >= WITNESS_BOARD || c < 0 || c >= WITNESS_BOARD) {
    return { type: 'witness_error', message: '非法着法参数' }
  }
  if (player !== 1 && player !== 2) return { type: 'witness_error', message: '非法 player' }

  const expectedN = w.moveHist.length + 1
  if (n !== expectedN) {
    return { type: 'witness_error', message: '手顺序号错误', expected: expectedN, got: n }
  }
  const expectedPlayer = w.moveHist.length % 2 === 0 ? 1 : 2
  if (player !== expectedPlayer) return { type: 'witness_error', message: '不是该方行棋' }
  if (!witnessCanSubmit(role, expectedPlayer, w.hostIsBlack)) {
    return { type: 'witness_error', message: '身份与执子不符' }
  }
  if (w.board[r][c] !== 0) return { type: 'witness_error', message: '交叉点已有棋子' }
  const expectedCoord = WITNESS_COLS[c] + (WITNESS_BOARD - r)
  if (coord !== expectedCoord) return { type: 'witness_error', message: '坐标不一致' }

  const prevHash = w.moveHist.length ? w.moveHist[w.moveHist.length - 1].hash : w.genesisHash
  const computed = await witnessComputeMoveHash({ num: n, player, r, c, coord }, prevHash, gameId)
  if (computed !== hash) return { type: 'witness_error', message: '哈希校验失败' }

  w.board[r][c] = player
  w.moveHist.push({ n, r, c, player, coord, hash })
  w.chainHash = hash
  if (witnessCheckWin(w.board, r, c, player)) {
    w.status = 'won'
    w.winner = player
  } else if (witnessCheckDraw(w.board)) {
    w.status = 'draw'
  }
  return { type: 'witness_move_ok', n, status: w.status }
}

/** @returns {object | null} WS payload; null = ignore (e.g. non-host) */
export function witnessProcessUndoPop(room, role, msg) {
  if (role !== 'host') return null
  if (!room?.witness) return { type: 'witness_error', message: '见证未初始化' }
  const w = room.witness
  const gameId = String(msg.gameId ?? '')
  if (gameId !== w.gameId) return { type: 'witness_error', message: 'gameId 不一致' }
  if (w.moveHist.length === 0) return { type: 'witness_undo_ok', length: 0 }
  const last = w.moveHist.pop()
  w.board[last.r][last.c] = 0
  w.chainHash = w.moveHist.length ? w.moveHist[w.moveHist.length - 1].hash : w.genesisHash
  w.status = 'in_progress'
  delete w.winner
  delete w.resignedPlayer
  return { type: 'witness_undo_ok', length: w.moveHist.length }
}

export function witnessProcessResign(room, role, msg) {
  if (!room?.witness) return { type: 'witness_error', message: '见证未初始化' }
  const w = room.witness
  const gameId = String(msg.gameId ?? '')
  if (gameId !== w.gameId) return { type: 'witness_error', message: 'gameId 不一致' }
  if (w.status !== 'in_progress') return { type: 'witness_error', message: '对局已结束' }

  const resignedPlayer = Number(msg.resignedPlayer)
  const expectedTurn = w.moveHist.length % 2 === 0 ? 1 : 2
  if (resignedPlayer !== expectedTurn) {
    return { type: 'witness_error', message: '认输方与当前行棋方不符' }
  }
  if (!witnessCanSubmit(role, resignedPlayer, w.hostIsBlack)) {
    return { type: 'witness_error', message: '身份与认输方不符' }
  }
  w.status = 'resigned'
  w.resignedPlayer = resignedPlayer
  return { type: 'witness_resign_ok' }
}
