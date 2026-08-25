/**
 * Session signing — one implementation, used everywhere.
 *
 * WHY THIS FILE EXISTS
 *   The token format was previously inlined in functions/auth/index.js with a
 *   fallback secret of the literal string 'richenquest_secret_key'. A signing
 *   key committed to source is not a key: anyone who can read the repository can
 *   mint a session for any student. This module refuses to sign or verify with a
 *   default, so a missing secret fails loudly at boot instead of silently
 *   producing forgeable sessions.
 */
const crypto = require('crypto');

function secret() {
  const s = process.env.SESSION_SECRET || process.env.ZOHO_WEBHOOK_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      'SESSION_SECRET is missing or too short. Set a random 32+ byte value in .env. ' +
      'Refusing to sign sessions with a default key.');
  }
  return s;
}

const hmac = (str) => crypto.createHmac('sha256', secret()).update(str).digest('hex');

function sign(payload, ttlSeconds = 60 * 60 * 12) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const str = JSON.stringify(body);
  return Buffer.from(str).toString('base64') + '.' + hmac(str);
}

/* Returns the payload, or null. Never throws on bad input — a malformed token
 * from the internet is an expected condition, not an exception. */
function verify(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [b64, sig] = token.split('.');
  let str;
  try { str = Buffer.from(b64, 'base64').toString('utf8'); } catch { return null; }
  let expected;
  try { expected = hmac(str); } catch { return null; }
  // Constant-time compare; a length mismatch would make timingSafeEqual throw.
  const a = Buffer.from(sig || '', 'utf8'), b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try { payload = JSON.parse(str); } catch { return null; }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

/* Reads the session from an httpOnly cookie first, then the Authorization
 * header for backward compatibility with the existing Bearer-token clients. */
function fromRequest(req) {
  const cookie = (req.headers && req.headers.cookie) || '';
  const m = cookie.match(/(?:^|;\s*)rq_sess=([^;]+)/);
  if (m) { const p = verify(decodeURIComponent(m[1])); if (p) return p; }
  const auth = (req.headers && req.headers.authorization) || '';
  if (auth.startsWith('Bearer ')) return verify(auth.slice(7).trim());
  return null;
}

function cookieHeader(token, ttlSeconds = 60 * 60 * 12) {
  // Secure is omitted on localhost only — a Secure cookie is never sent over
  // http://, which would silently break local development. Production is https.
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  return `rq_sess=${encodeURIComponent(token)}; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=${ttlSeconds}`;
}

/* Exposed so auth/index.js signs with the SAME key this module verifies with.
 * Two modules deriving a key independently is how a valid token starts
 * failing verification for reasons nobody can reproduce. */
module.exports = { sign, verify, fromRequest, cookieHeader, signingKey: secret };
