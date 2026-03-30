/**
 * WebRTC helpers — P2P via manual SDP exchange.
 *
 * ICE strategy:
 *   1. Fetch dynamic TURN credentials from signaling server (Cloudflare TURN)
 *   2. iceCandidatePoolSize: desktop 预采集；iOS Safari 用 0（避免预采集与候选时序问题）
 *   3. waitForICE：等到 gathering complete，保证 SDP 含 srflx/relay（手机 Safari ↔ PC 必备）
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
    const res = await fetch(`${httpUrl}/api/turn`, { signal: AbortSignal.timeout(8000) })
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

/** iOS / iPadOS WebKit：预分配候选池在部分版本易与 DataChannel 跨端 ICE 冲突 */
function recommendedIceCandidatePoolSize() {
  if (typeof navigator === 'undefined') return 4
  const ua = navigator.userAgent || ''
  const iOS = /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const webkitSafari = /WebKit/.test(ua) && !/(Chrome|CriOS|EdgiOS|FxiOS|OPiOS)/.test(ua)
  return iOS && webkitSafari ? 0 : 4
}

export async function createPeerConnection() {
  const iceServers = await getIceServers()
  return new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: recommendedIceCandidatePoolSize(),
  })
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
 * Wait for ICE gathering to finish so Offer/Answer include srflx (and relay when TURN works).
 * Do NOT stop early on the first host candidate: that breaks iOS Safari ↔ desktop where
 * STUN reflexive candidates arrive later; same-PC tabs still complete gathering quickly.
 *
 * @param {RTCPeerConnection} pc
 * @param {{ maxWaitMs?: number }} [options]
 */
export function waitForICE(pc, options = {}) {
  const maxWaitMs = options.maxWaitMs ?? 15000
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve()
      return
    }
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      pc.removeEventListener('icegatheringstatechange', onGather)
      clearTimeout(hardCap)
      resolve()
    }
    const onGather = () => {
      if (pc.iceGatheringState === 'complete') finish()
    }
    pc.addEventListener('icegatheringstatechange', onGather)
    const hardCap = setTimeout(finish, maxWaitMs)
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
