/**
 * WebRTC helpers for serverless P2P via manual SDP exchange.
 * No signaling server — SDPs are base64-encoded and copy-pasted between peers.
 */

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export function createPeerConnection() {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS })
}

export function encodeOffer(data) {
  return btoa(JSON.stringify(data))
}

export function decodeOffer(str) {
  try {
    return JSON.parse(atob(str.trim()))
  } catch {
    return null
  }
}

export function encodeAnswer(data) {
  return btoa(JSON.stringify(data))
}

export function decodeAnswer(str) {
  try {
    return JSON.parse(atob(str.trim()))
  } catch {
    return null
  }
}

/** Wait for ICE gathering to complete, with a 4s fallback timeout */
export function waitForICE(pc) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') { resolve(); return }
    const onStateChange = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', onStateChange)
        resolve()
      }
    }
    pc.addEventListener('icegatheringstatechange', onStateChange)
    setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', onStateChange)
      resolve()
    }, 4000)
  })
}
