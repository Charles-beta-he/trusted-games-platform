/**
 * LAN IP detection via WebRTC ICE candidate trick.
 * Creates a dummy peer connection to gather local network candidates,
 * extracts the first non-loopback IPv4 address.
 *
 * Works in browser without any server round-trip.
 * Result is cached for the session — call once and reuse.
 */

let _cachedIP = null
let _pending = null

export async function getLocalIP() {
  if (_cachedIP) return _cachedIP
  if (_pending) return _pending

  _pending = new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] })
      pc.createDataChannel('')
      pc.createOffer()
        .then((sdp) => pc.setLocalDescription(sdp))
        .catch(() => resolve(null))

      const timer = setTimeout(() => {
        pc.close()
        resolve(null)
      }, 3000)

      pc.onicecandidate = ({ candidate }) => {
        if (!candidate) return
        const match = candidate.candidate.match(
          /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/,
        )
        if (match && !match[1].startsWith('127.') && !match[1].startsWith('169.254.')) {
          clearTimeout(timer)
          _cachedIP = match[1]
          pc.close()
          resolve(match[1])
        }
      }
    } catch {
      resolve(null)
    }
  })

  return _pending
}

/**
 * Build a LAN-accessible share URL using the detected local IP.
 * @param {string} offerCode - the encoded SDP offer (will be pako-compressed by caller)
 * @param {string} encodedHash - the URL hash fragment (e.g. "join=<base64>")
 */
export function buildLanUrl(encodedHash) {
  if (!_cachedIP) return null
  const port = window.location.port ? `:${window.location.port}` : ''
  const path = window.location.pathname
  return `http://${_cachedIP}${port}${path}#${encodedHash}`
}
