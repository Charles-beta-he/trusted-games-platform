/**
 * gameFormats.js
 * Parsers for three Gomoku game record formats:
 *   - PSQ  (Gomocup / Piskvork)
 *   - RIF  (Renju International Federation)
 *   - JSON (this app's useIndexedDB storage format)
 */

const MIN_MOVES = 5;

// ---------------------------------------------------------------------------
// PSQ
// ---------------------------------------------------------------------------
/**
 * PSQ format:
 *   Line 0: title (ignored)
 *   Line 1: Black,White,date (ignored)
 *   Line 2+: col,row,time_ms   (1-based; col=x=c, row=y=r)
 *   Terminator: 0,0,0
 *
 * Conversion: r = row - 1,  c = col - 1
 */
export function parsePSQ(text) {
  if (typeof text !== 'string') {
    return { games: [], error: 'Input must be a string' };
  }

  const lines = text.split(/\r?\n/);
  const moves = [];

  // Skip header lines (index 0 and 1); start parsing from index 2
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length < 2) continue;

    const col = parseInt(parts[0], 10);
    const row = parseInt(parts[1], 10);

    if (isNaN(col) || isNaN(row)) continue;

    // Terminator
    if (col === 0 && row === 0) break;

    const r = row - 1;
    const c = col - 1;

    // Basic bounds check (0–18 for standard 15×15 or 19×19 boards)
    if (r < 0 || c < 0) continue;

    moves.push({ r, c });
  }

  if (moves.length < MIN_MOVES) {
    return { games: [], error: null };
  }

  return {
    games: [{ moves, gameOver: true }],
    error: null,
  };
}

// ---------------------------------------------------------------------------
// RIF
// ---------------------------------------------------------------------------
/**
 * RIF format:
 *   Header lines: [Tag "value"] — ignored
 *   Move lines: letters+digits, either concatenated ("a1b2c3") or
 *               space/comma-separated ("a1 b2 c3")
 *
 * Each move token: <letter><number>
 *   letter  → c = charCode - 'a'.charCode  (a=0 … o=14)
 *   number  → r = number - 1               (1-based → 0-based)
 */
export function parseRIF(text) {
  if (typeof text !== 'string') {
    return { games: [], error: 'Input must be a string' };
  }

  const moves = [];
  const lines = text.split(/\r?\n/);

  // Regex for a single move token
  const TOKEN_RE = /([a-oA-O])(\d{1,2})/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip header/tag lines
    if (trimmed.startsWith('[')) continue;

    // Extract all move tokens from this line
    let match;
    TOKEN_RE.lastIndex = 0;
    while ((match = TOKEN_RE.exec(trimmed)) !== null) {
      const letter = match[1].toLowerCase();
      const num = parseInt(match[2], 10);

      if (isNaN(num)) continue;

      const c = letter.charCodeAt(0) - 'a'.charCodeAt(0);
      const r = num - 1;

      if (r < 0 || c < 0) continue;

      moves.push({ r, c });
    }
  }

  if (moves.length < MIN_MOVES) {
    return { games: [], error: null };
  }

  return {
    games: [{ moves, gameOver: true }],
    error: null,
  };
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------
/**
 * JSON format (this app):
 *   Single game:  { "moves": [{r, c}, ...], "gameOver": true }
 *   Multi-game:   [{ "moves": [...], "gameOver": true }, ...]
 *
 * Each move must have numeric r and c properties.
 */
export function parseJSON(text) {
  if (typeof text !== 'string') {
    return { games: [], error: 'Input must be a string' };
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { games: [], error: `Invalid JSON: ${e.message}` };
  }

  // Normalise to array
  const rawGames = Array.isArray(parsed) ? parsed : [parsed];

  const games = [];

  for (const item of rawGames) {
    if (!item || !Array.isArray(item.moves)) continue;

    const moves = item.moves
      .filter(
        (m) =>
          m &&
          typeof m.r === 'number' &&
          typeof m.c === 'number' &&
          m.r >= 0 &&
          m.c >= 0
      )
      .map(({ r, c }) => ({ r, c }));

    if (moves.length < MIN_MOVES) continue;

    games.push({ moves, gameOver: true });
  }

  return { games, error: null };
}

// ---------------------------------------------------------------------------
// Auto-detect
// ---------------------------------------------------------------------------
/**
 * Detect format by filename extension and/or content heuristics, then parse.
 *
 * Detection order:
 *   1. Filename ends with .psq           → parsePSQ
 *   2. Filename ends with .rif or .pos   → parseRIF
 *   3. Filename ends with .json          → parseJSON
 *   4. Content starts with '['  and contains '"moves"' → parseJSON
 *   5. Content starts with '['  (RIF tag line)          → parseRIF
 *   6. Content first data-line has comma-separated nums → parsePSQ
 *   7. Fallback: parseRIF
 */
export function parseGameFile(filename, text) {
  if (typeof filename === 'string') {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.psq')) return parsePSQ(text);
    if (lower.endsWith('.rif') || lower.endsWith('.pos')) return parseRIF(text);
    if (lower.endsWith('.json')) return parseJSON(text);
  }

  // Content-based heuristics
  if (typeof text === 'string') {
    const trimmed = text.trimStart();

    // JSON array or object
    if (trimmed.startsWith('{') || (trimmed.startsWith('[') && trimmed.includes('"moves"'))) {
      return parseJSON(text);
    }

    // RIF: starts with a tag line
    if (trimmed.startsWith('[')) {
      return parseRIF(text);
    }

    // PSQ: third non-empty line looks like "num,num,num"
    const dataLines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (dataLines.length > 2) {
      const sample = dataLines[2];
      if (/^\d+,\d+/.test(sample)) {
        return parsePSQ(text);
      }
    }
  }

  // Fallback
  return parseRIF(text);
}
