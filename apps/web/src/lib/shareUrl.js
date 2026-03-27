/**
 * P2P Room URL sharing utilities
 * Encodes WebRTC offer into URL hash for sharing
 * Uses pako (zlib) compression to reduce QR code density
 */

import pako from 'pako'

const HASH_PREFIX = 'join='

/**
 * Convert Uint8Array to URL-safe base64 string (avoids stack overflow on large arrays)
 * Uses - and _ instead of + and /, strips = padding
 */
function uint8ToBase64Url(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Encode an offer code into a shareable URL
 * Compresses the offer string with pako deflate before URL-safe base64 encoding
 * @param {string} offerCode - base64 encoded SDP offer
 * @returns {string} full URL with hash
 */
export function buildShareUrl(offerCode) {
  const compressed = pako.deflate(offerCode, { level: 9 })
  const b64url = uint8ToBase64Url(compressed)
  const base = window.location.href.split('#')[0]
  return `${base}#${HASH_PREFIX}${b64url}`
}

/**
 * Extract offer code from current URL hash, if present
 * Decompresses the pako-deflated payload
 * @returns {string|null}
 */
export function extractOfferFromUrl() {
  const hash = window.location.hash
  if (!hash.startsWith('#' + HASH_PREFIX)) return null
  try {
    const b64url = hash.slice(HASH_PREFIX.length + 1)
    // Restore standard base64 from URL-safe base64
    const b64 = b64url
      .replace(/-/g, '+')
      .replace(/_/g, '/')
    // Re-add padding
    const padded = b64 + '='.repeat((4 - b64.length % 4) % 4)
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return pako.inflate(bytes, { to: 'string' })
  } catch (e) {
    console.warn('[shareUrl] decode failed:', e)
    return null
  }
}

/**
 * Clear the offer hash from URL without page reload
 */
export function clearShareHash() {
  if (window.location.hash.startsWith('#' + HASH_PREFIX)) {
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }
}
