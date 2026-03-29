/**
 * WebRTC helpers — P2P via manual SDP exchange.
 *
 * ICE strategy:
 *   1. Fetch dynamic TURN credentials from signaling server (Cloudflare TURN)
 *   2. Use iceCandidatePoolSize:4 to pre-gather candidates immediately
 *   3. Smart ICE wait: resolve after 800ms if host (LAN) candidates exist,
 *      otherwise wait up to 4s for STUN/TURN candidates
 *   4. After connection, call getConnectionType() to detect LAN vs Internet vs Relay
 */

const STATIC_ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
]

/** Fetch dynamic TURN credentials; falls back to STUN-only on error */
export async function fetchIceServers() {
  const sigUrl = import.meta.env.VITE_SIGNALING_URL
  if (!sigUrl) return STATIC_ICE
  // Convert ws(s):// to http(s)://
  const httpUrl = sigUrl.replace(/^ws/, 'http')
  try {
    const res = await fetch(`${httpUrl}/api/turn`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return STATIC_ICE
    const { iceServers = [] } = await res.json()
    return [...STATIC_ICE, ...iceServers]
  } catch {
    return STATIC_ICE
  }
}

let cachedIceServers = null
let cacheTime = 0
const CACHE_TTL = 30 * 60 * 1000  // 30 min (TURN credentials valid 24h)

export async function getIceServers() {
  if (cachedIceServers && Date.now() - cacheTime < CACHE_TTL) return cachedIceServers
  cachedIceServers = await fetchIceServers()
  cacheTime = Date.now()
  return cachedIceServers
}

export async function createPeerConnection() {
  const iceServers = await getIceServers()
  return new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 4 })
}

export function encodeOffer(data) { return btoa(JSON.stringify(data)) }
export function decodeOffer(str)  {
  try { return JSON.parse(atob(str.trim())) } catch { return null }
}
export function encodeAnswer(data) { return btoa(JSON.stringify(data)) }
export function decodeAnswer(str)  {
  try { return JSON.parse(atob(str.trim())) } catch { return null }
}

/**
 * Smart ICE gathering:
 * - Resolves immediately when host candidates appear (LAN path available)
 * - Falls back to 4s hard timeout for internet/relay scenarios
 */
export function waitForICE(pc) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') { resolve(); return }

    let hasHostCandidate = false
    let lanTimer = null

    const onCandidate = (e) => {
      if (!e.candidate) return
      if (e.candidate.type === 'host' && !hasHostCandidate) {
        hasHostCandidate = true
        // Give 800ms after first host candidate to collect more, then resolve
        lanTimer = setTimeout(() => {
          pc.removeEventListener('icecandidate', onCandidate)
          pc.removeEventListener('icegatheringstatechange', onComplete)
          resolve()
        }, 800)
      }
    }

    const onComplete = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(lanTimer)
        pc.removeEventListener('icecandidate', onCandidate)
        pc.removeEventListener('icegatheringstatechange', onComplete)
        resolve()
      }
    }

    pc.addEventListener('icecandidate', onCandidate)
    pc.addEventListener('icegatheringstatechange', onComplete)

    // Hard timeout: 4s
    setTimeout(() => {
      clearTimeout(lanTimer)
      pc.removeEventListener('icecandidate', onCandidate)
      pc.removeEventListener('icegatheringstatechange', onComplete)
      resolve()
    }, 4000)
  })
}

/**
 * After connection, detect the actual transport path via getStats().
 * Returns: 'lan' | 'internet' | 'relay' | 'unknown'
 */
export async function getConnectionType(pc) {
  try {
    const stats = await pc.getStats()
    for (const report of stats.values()) {
      if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.nominated) {
        const local = stats.get(report.localCandidateId)
        if (!local) continue
        if (local.candidateType === 'host')   return 'lan'
        if (local.candidateType === 'relay')  return 'relay'
        return 'internet'
      }
    }
    return 'unknown'
  } catch {
    return 'unknown'
  }
}
