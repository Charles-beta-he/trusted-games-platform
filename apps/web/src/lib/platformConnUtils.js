/**
 * Pure utility functions for usePlatformConn.
 * Extracted for testability — no React hooks dependency.
 */

const LS_KEY = 'tg_user'

export function loadStoredUser() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveUser(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

/**
 * Build the conn interface object passed to onMatchReady.
 * This is the P2P connection API surface consumed by game pages.
 */
export function buildConnInterface({ dcSend, wsSend, sessionKeyRef }) {
  return (role) => ({
    isConnected: true,
    isEncrypted: Boolean(sessionKeyRef.current),
    role,
    sendMove:    (r, c, hash, player) => dcSend({ type: 'MOVE', r, c, hash, player }),
    sendResign:  () => dcSend({ type: 'RESIGN' }),
    sendNewGame: (gameId, meta = {}) => dcSend({ type: 'NEW_GAME', gameId, hostIsBlack: meta.hostIsBlack !== false }),
    sendRoomInit:(gameId, meta = {}) => dcSend({ type: 'ROOM_INIT', gameId, hostIsBlack: meta.hostIsBlack !== false }),
    sendUndoRequest:  () => dcSend({ type: 'UNDO_REQUEST' }),
    sendUndoResponse: (accept) => dcSend({ type: accept ? 'UNDO_ACCEPT' : 'UNDO_REJECT' }),
    sendWitnessRoomInit: (gameId, hostIsBlack) =>
      wsSend({ type: 'witness_room_init', gameId, hostIsBlack: hostIsBlack !== false }),
    sendMoveWitness: (payload) => wsSend({ type: 'move_witness', ...payload }),
    sendWitnessUndoPop: (gameId) => wsSend({ type: 'witness_undo_pop', gameId }),
    sendWitnessResign: (gameId, resignedPlayer) =>
      wsSend({ type: 'witness_resign', gameId, resignedPlayer }),
  })
}

/**
 * Parse a WS message string into an object.
 * Returns null on parse failure.
 */
export function parseWsMessage(raw) {
  try { return JSON.parse(raw) } catch { return null }
}
