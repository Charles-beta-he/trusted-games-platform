export async function sha256(data) {
  const buf = new TextEncoder().encode(data)
  const hashBuf = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function generateId() {
  const arr = new Uint8Array(8)
  crypto.getRandomValues(arr)
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

export async function generateGenesisHash(gameId) {
  // Deterministic — no timestamp so both P2P peers compute identical hashes
  const genesis = { type: 'GENESIS', gameId }
  return sha256(JSON.stringify(genesis))
}

export async function computeMoveHash(move, prevHash, gameId) {
  // Only hash deterministic fields so either peer can independently verify
  const data = JSON.stringify({
    num: move.num,
    player: move.player,
    r: move.r,
    c: move.c,
    coord: move.coord,
    prevHash,
    gameId,
  })
  return sha256(data)
}
