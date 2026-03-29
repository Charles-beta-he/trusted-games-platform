/**
 * styleShare.js — 棋风导出 / 导入 / URL 分享工具
 */

const STYLE_TYPE = 'tg-style-v1';
const REQUIRED_PARAM_KEYS = ['attack', 'defense', 'center', 'noise'];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isValidProfile(profile) {
  if (!profile || typeof profile !== 'object') return false;
  if (profile.type !== STYLE_TYPE) return false;
  const { params } = profile;
  if (!params || typeof params !== 'object') return false;
  return REQUIRED_PARAM_KEYS.every(
    (k) => k in params && typeof params[k] === 'number'
  );
}

// ---------------------------------------------------------------------------
// Export as .json file download
// ---------------------------------------------------------------------------

/**
 * Triggers a browser download of the profile as a .json file.
 * @param {object} profile
 */
export function exportStyleAsFile(profile) {
  const filename = `${profile.id ?? 'style'}-棋风.json`;
  const json = JSON.stringify(profile, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Import from File object
// ---------------------------------------------------------------------------

/**
 * Reads a File object and parses it as a tg-style-v1 profile.
 * @param {File} file
 * @returns {Promise<object|null>} profile or null if invalid
 */
export async function importStyleFromFile(file) {
  try {
    const text = await file.text();
    const profile = JSON.parse(text);
    if (!isValidProfile(profile)) return null;
    return profile;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// URL hash encoding / decoding
// ---------------------------------------------------------------------------

/**
 * Encodes a profile to a URL hash fragment: #style=<base64>
 * Sets window.location.hash.
 * @param {object} profile
 * @returns {string} the encoded hash string (e.g. "#style=...")
 */
export function encodeStyleToUrl(profile) {
  const json = JSON.stringify(profile);
  const b64 = btoa(encodeURIComponent(json));
  const hash = `#style=${b64}`;
  if (typeof window !== 'undefined') {
    window.location.hash = `style=${b64}`;
  }
  return hash;
}

/**
 * Reads and decodes a tg-style-v1 profile from the current URL hash.
 * Expects format: #style=<base64>
 * @returns {object|null} profile or null
 */
export function decodeStyleFromUrl() {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash; // e.g. "#style=abc123"
  const match = hash.match(/[#&]?style=([^&]*)/);
  if (!match) return null;
  try {
    const json = decodeURIComponent(atob(match[1]));
    const profile = JSON.parse(json);
    if (!isValidProfile(profile)) return null;
    return profile;
  } catch {
    return null;
  }
}

/**
 * Removes the style parameter from the current URL hash without triggering
 * a full navigation.
 */
export function clearStyleFromUrl() {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash;
  const cleaned = hash
    .replace(/[#&]?style=[^&]*/g, '')
    .replace(/^#?&/, '#')
    .replace(/^#$/, '');
  // Use replaceState to avoid adding a history entry
  const newUrl =
    window.location.pathname + window.location.search + (cleaned || '');
  window.history.replaceState(null, '', newUrl);
}
