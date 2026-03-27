/**
 * P2P End-to-End Encryption using Web Crypto API.
 *
 * Key exchange protocol:
 *   1. Each peer generates an ECDH key pair (P-256).
 *   2. Peers exchange raw public keys over the DataChannel (plaintext — safe,
 *      public keys carry no secret).
 *   3. Each peer derives a shared AES-GCM-256 session key via ECDH.
 *   4. All subsequent DataChannel messages are AES-GCM encrypted.
 */

// ─── Key generation ──────────────────────────────────────────────────────────

/**
 * Generate a new ECDH key pair using P-256.
 * @returns {Promise<CryptoKeyPair>} { publicKey, privateKey }
 */
export async function generateECDHKeyPair() {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false,            // private key is not extractable
    ['deriveKey'],
  )
}

// ─── Key serialization ───────────────────────────────────────────────────────

/**
 * Export a CryptoKey public key as a base64 string suitable for DataChannel.
 * @param {CryptoKey} publicKey
 * @returns {Promise<string>} base64-encoded raw public key (65 bytes for P-256)
 */
export async function exportPublicKey(publicKey) {
  const raw = await crypto.subtle.exportKey('raw', publicKey)
  return btoa(String.fromCharCode(...new Uint8Array(raw)))
}

/**
 * Import a peer's base64-encoded raw public key.
 * @param {string} base64
 * @returns {Promise<CryptoKey>}
 */
export async function importPublicKey(base64) {
  const binary = atob(base64)
  const raw = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],   // public key used only as derivation input, no key-usage flag needed
  )
}

// ─── Key derivation ──────────────────────────────────────────────────────────

/**
 * Derive a shared AES-GCM-256 session key from our private key and the peer's
 * public key using ECDH.
 * @param {CryptoKey} myPrivateKey
 * @param {CryptoKey} theirPublicKey
 * @returns {Promise<CryptoKey>} AES-GCM CryptoKey for encrypt + decrypt
 */
export async function deriveSessionKey(myPrivateKey, theirPublicKey) {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

// ─── Message encryption / decryption ─────────────────────────────────────────

/**
 * Encrypt a plaintext string with AES-GCM.
 * @param {CryptoKey} sessionKey
 * @param {string} plaintext
 * @returns {Promise<{ iv: string, ciphertext: string }>} both values are base64
 */
export async function encryptMessage(sessionKey, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const cipherbuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sessionKey,
    encoded,
  )
  const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  return { iv: toB64(iv), ciphertext: toB64(cipherbuf) }
}

/**
 * Decrypt an AES-GCM ciphertext.
 * @param {CryptoKey} sessionKey
 * @param {string} ivB64      base64-encoded 12-byte IV
 * @param {string} ciphertextB64  base64-encoded ciphertext + auth tag
 * @returns {Promise<string>} plaintext
 */
export async function decryptMessage(sessionKey, ivB64, ciphertextB64) {
  const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const iv = fromB64(ivB64)
  const cipherbuf = fromB64(ciphertextB64)
  const plainbuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    sessionKey,
    cipherbuf,
  )
  return new TextDecoder().decode(plainbuf)
}
