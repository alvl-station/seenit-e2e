#!/usr/bin/env node
// Replaces secret values with *** in text piped through it.
//
//   some-command 2>&1 | node scripts/redact-secrets.js VAR1 VAR2 | tee log.txt
//
// Why this exists, given GitHub Actions already masks secrets:
//
//  1. Actions masks the EXACT strings it was handed as secrets. Values
//     *derived* from one are not masked — `TEST_USER` is a JSON secret, so
//     the login and password `jq` pulls out of it are new strings Actions
//     has never seen, and it prints them in full. Same for the TMDb
//     access_token extracted from `TMBD_CRED`.
//  2. `::add-mask::` fixes the live workflow log but does nothing to files
//     on disk. This repo tees the smoke-test output to a file, uploads it
//     as an artifact, and pastes its last 150 lines into a GitHub issue on
//     rollback — and the repository is public, so that issue is public.
//
// So the masking has to happen in the byte stream, before anything is
// written down. Both belts are worn: the workflow also calls ::add-mask::.
//
// Pure and dependency-free so it can be unit-tested directly
// (tests/redact-secrets.test.js).

const PLACEHOLDER = '***';
// Below this length a "secret" is more likely to be a common substring than
// a credential, and redacting it would shred the log instead of cleaning it.
const MIN_LENGTH = 4;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Every written form one secret can plausibly take in a log line. A token
 * that reaches a log through a URL is percent-encoded, and one that reaches
 * it inside a JSON blob is backslash-escaped — matching only the raw form
 * would walk straight past both.
 */
function variantsOf(value) {
  const raw = String(value == null ? '' : value);
  if (raw.length < MIN_LENGTH) return [];
  const seen = new Set([raw]);
  const add = (v) => { if (v && v.length >= MIN_LENGTH) seen.add(v); };
  try { add(encodeURIComponent(raw)); } catch (err) { /* not encodable */ }
  add(JSON.stringify(raw).slice(1, -1)); // JSON string body, minus the quotes
  return [...seen];
}

/**
 * @param {string} text    - the text to clean
 * @param {string[]} secrets - raw secret values (empty/short ones ignored)
 * @returns {string} text with every occurrence of every secret replaced
 */
function redact(text, secrets) {
  let out = String(text == null ? '' : text);
  const targets = (secrets || []).flatMap(variantsOf);
  if (!targets.length) return out;
  // Longest first: when one secret contains another (or a variant contains
  // the raw form), replacing the short one first would leave the rest of the
  // longer value exposed next to a ***.
  for (const t of [...new Set(targets)].sort((a, b) => b.length - a.length)) {
    out = out.replace(new RegExp(escapeRegExp(t), 'g'), PLACEHOLDER);
  }
  return out;
}

/** Reads the named env vars, skipping any that are unset or blank. */
function secretsFromEnv(names, env) {
  const source = env || process.env;
  return (names || []).map(n => source[n]).filter(v => typeof v === 'string' && v.length > 0);
}

module.exports = { redact, variantsOf, secretsFromEnv, escapeRegExp, PLACEHOLDER, MIN_LENGTH };

if (require.main === module) {
  const secrets = secretsFromEnv(process.argv.slice(2));
  let buf = '';
  process.stdin.setEncoding('utf8');
  // Redact per complete line so a secret split across two chunk boundaries
  // can't slip through un-matched.
  process.stdin.on('data', (chunk) => {
    buf += chunk;
    const lines = buf.split('\n');
    buf = lines.pop();
    if (lines.length) process.stdout.write(redact(lines.join('\n'), secrets) + '\n');
  });
  process.stdin.on('end', () => {
    if (buf) process.stdout.write(redact(buf, secrets));
  });
}
