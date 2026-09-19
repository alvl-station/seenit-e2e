// A thin client for the SeenIt API, for the API suite in api/.
//
// This repo is PUBLIC: nothing here may print a token, a password or a
// username. Tokens live in memory for the run; errors carry the status and
// the route, never a header.
const API = process.env.API_URL || 'https://seenit-proxy.seenit.workers.dev';
const SITE = process.env.BASE_URL || 'https://seenit-app.pages.dev/';
const APP_ORIGIN = new URL(SITE).origin;
// The app signs in with a username, which Firebase knows as this address.
const USERNAME_SUFFIX = '@sceneit-app.local';

let cachedToken = null;

/** The Firebase web API key, read off the live page (public by design). */
async function firebaseApiKey() {
  if (process.env.FIREBASE_API_KEY) return process.env.FIREBASE_API_KEY;
  const html = await (await fetch(SITE)).text();
  const m = /"apiKey"\s*:\s*"([^"]+)"/.exec(html);
  if (!m) throw new Error('No Firebase apiKey on the page.');
  return m[1];
}

/** One sign-in per run for the smoke account; the ID token, kept in memory. */
async function idToken() {
  if (cachedToken) return cachedToken;
  const username = process.env.SMOKE_TEST_USERNAME;
  const password = process.env.SMOKE_TEST_PASSWORD;
  if (!username || !password) throw new Error('SMOKE_TEST_USERNAME/SMOKE_TEST_PASSWORD env vars are not set.');
  const key = await firebaseApiKey();
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: username.trim().toLowerCase().replace(/\s+/g, '') + USERNAME_SUFFIX,
      password,
      returnSecureToken: true,
    }),
  });
  if (!res.ok) throw new Error(`Firebase sign-in failed: HTTP ${res.status}`);
  cachedToken = (await res.json()).idToken;
  return cachedToken;
}

/**
 * One request. `auth` is 'user' (the smoke account), 'none', or an object of
 * headers to send instead. The answer comes back with its body read once.
 */
async function api(method, path, { auth = 'user', body, raw, headers = {} } = {}) {
  const h = { ...headers };
  if (auth === 'user') h.Authorization = `Bearer ${await idToken()}`;
  else if (auth && typeof auth === 'object') Object.assign(h, auth);
  let payload;
  if (raw !== undefined) payload = raw;
  else if (body !== undefined) payload = JSON.stringify(body);
  if (payload !== undefined && !h['Content-Type']) h['Content-Type'] = 'application/json';
  const res = await fetch(API + path, { method, headers: h, body: payload, redirect: 'manual' });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, headers: res.headers, text, json };
}

/** A token-shaped string nobody signed: header.payload.signature, all made up. */
function forgedToken({ alg = 'RS256', claims = {} } = {}) {
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg, kid: 'made-up' });
  const body = b64({ aud: 'kino-tracker-80559', iss: 'https://securetoken.google.com/kino-tracker-80559', sub: 'someone', iat: now, exp: now + 3600, ...claims });
  return `${head}.${body}.${alg === 'none' ? '' : Buffer.from('not a signature').toString('base64url')}`;
}

/** Text that must never reach a client: SQL errors, stacks, internals. */
const LEAK = /SQLITE|D1_ERROR|no such (table|column)|at [\w.]+ \(|\.js:\d+:\d+|TypeError|ReferenceError/;

module.exports = { API, SITE, APP_ORIGIN, api, idToken, forgedToken, LEAK };
