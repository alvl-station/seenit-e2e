#!/usr/bin/env node
// Replaces secret values with *** in text piped through it, or in files
// rewritten in place.
//
//   some-command 2>&1 | node scripts/redact-secrets.js VAR1 VAR2 | tee log.txt
//   node scripts/redact-secrets.js --files 'allure-results/*.json' VAR1 VAR2
//
// The file mode exists for the Allure results: a failing assertion's
// message (its `Received:` line, a locator's text) is written into the
// result JSON by the reporter, not through stdout, and that JSON becomes
// the published report. Files matching the glob are rewritten only when
// something in them changed; binary attachments are never touched because
// the glob names text files.
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

/**
 * Rewrites every file matching the glob(s) with its secrets redacted.
 * Returns the paths that changed. A file that had nothing to redact is
 * left untouched (same bytes, same mtime).
 */
function redactFiles(globs, secrets) {
  const fs = require('fs');
  const path = require('path');
  const changed = [];
  for (const pattern of globs) {
    // Node's own glob (22+): no dependency, and the workflow quotes the
    // pattern so the shell never expands it into an argument list.
    for (const file of fs.globSync(pattern)) {
      if (!fs.statSync(file).isFile()) continue;
      const before = fs.readFileSync(file, 'utf8');
      const after = redact(before, secrets);
      if (after !== before) {
        fs.writeFileSync(file, after);
        changed.push(path.normalize(file));
      }
    }
  }
  return changed;
}

module.exports = { redact, variantsOf, secretsFromEnv, redactFiles, escapeRegExp, PLACEHOLDER, MIN_LENGTH };

if (require.main === module) {
  const args = process.argv.slice(2);
  const globs = [];
  while (args[0] === '--files') {
    args.shift();
    const pattern = args.shift();
    if (!pattern) { console.error('--files needs a glob'); process.exit(2); }
    globs.push(pattern);
  }
  const secrets = secretsFromEnv(args);
  if (globs.length) {
    const changed = redactFiles(globs, secrets);
    console.log(`Redacted ${changed.length} file(s).`);
    process.exit(0);
  }
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
