const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { redact, variantsOf, secretsFromEnv, redactFiles, PLACEHOLDER, MIN_LENGTH } = require('../scripts/redact-secrets.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'redact-secrets.js');

// Guards the one place a credential could reach the public internet: the
// smoke-test log is uploaded as an artifact AND its last 150 lines are
// pasted into a GitHub issue on rollback, in a public repository.
describe('redact (secret values must never survive into a log)', () => {
  it('replaces a secret with the placeholder', () => {
    assert.equal(redact('logging in as hunter2000', ['hunter2000']), `logging in as ${PLACEHOLDER}`);
  });

  it('replaces every occurrence, not just the first', () => {
    assert.equal(redact('a s3cretval b s3cretval', ['s3cretval']), `a ${PLACEHOLDER} b ${PLACEHOLDER}`);
  });

  it('treats regex metacharacters in the secret literally', () => {
    // A generated password can contain any of these; building a RegExp from
    // it unescaped would either throw or match the wrong thing.
    const pw = 'a.b*c+d?e(f)[g]{h}|i^j$k\\l';
    assert.equal(redact(`pass=${pw} end`, [pw]), `pass=${PLACEHOLDER} end`);
  });

  it('catches the percent-encoded form, e.g. a token that reached a URL', () => {
    const token = 'tok en/with+chars';
    const line = `GET https://api.example.com/?key=${encodeURIComponent(token)}`;
    assert.doesNotMatch(redact(line, [token]), /tok/);
  });

  it('catches the JSON-escaped form, e.g. a token inside a logged payload', () => {
    const secret = 'line1\nline2"quoted"';
    const line = `body={"password":${JSON.stringify(secret)}}`;
    const out = redact(line, [secret]);
    assert.doesNotMatch(out, /quoted/);
  });

  it('redacts the longest match first so no tail is left exposed', () => {
    // 'abcd1234' contains 'abcd'; replacing the short one first would leave
    // "***1234" — the rest of the longer secret, in the clear.
    const out = redact('value=abcd1234', ['abcd', 'abcd1234']);
    assert.equal(out, `value=${PLACEHOLDER}`);
  });

  it('ignores values too short to be a credential', () => {
    const short = 'a'.repeat(MIN_LENGTH - 1);
    const text = `a padded ${short} sentence`;
    assert.equal(redact(text, [short]), text);
  });

  it('ignores empty/missing secrets rather than shredding the text', () => {
    const text = 'nothing secret here';
    assert.equal(redact(text, ['', null, undefined]), text);
    assert.equal(redact(text, []), text);
    assert.equal(redact(text, undefined), text);
  });

  it('leaves unrelated text untouched', () => {
    const text = '3 passed, 1 failed (12.3s)';
    assert.equal(redact(text, ['hunter2000']), text);
  });

  it('handles empty/missing input', () => {
    assert.equal(redact('', ['hunter2000']), '');
    assert.equal(redact(undefined, ['hunter2000']), '');
  });

  it('scrubs a realistic Playwright failure line', () => {
    const password = 'Sm0ke!Test#Pw';
    const username = 'sceneit-smoke';
    const line = `  ✘  login › fill("#loginPass", "${password}") as ${username} — timed out`;
    const out = redact(line, [username, password]);
    assert.doesNotMatch(out, /Sm0ke/);
    assert.doesNotMatch(out, /sceneit-smoke/);
    assert.match(out, /timed out/, 'the useful part of the message must survive');
  });
});

describe('variantsOf', () => {
  it('always includes the raw value', () => {
    assert.ok(variantsOf('hunter2000').includes('hunter2000'));
  });
  it('adds encoded forms only when they actually differ', () => {
    assert.deepEqual(variantsOf('plainvalue'), ['plainvalue']);
  });
  it('returns nothing for a value below the length floor', () => {
    assert.deepEqual(variantsOf('ab'), []);
    assert.deepEqual(variantsOf(''), []);
    assert.deepEqual(variantsOf(null), []);
  });
});

describe('secretsFromEnv', () => {
  it('reads the named vars and drops the unset ones', () => {
    const env = { A: 'aaaa', B: '', C: undefined, D: 'dddd' };
    assert.deepEqual(secretsFromEnv(['A', 'B', 'C', 'D', 'MISSING'], env), ['aaaa', 'dddd']);
  });
  it('handles no names at all', () => {
    assert.deepEqual(secretsFromEnv([], {}), []);
    assert.deepEqual(secretsFromEnv(undefined, {}), []);
  });
});

describe('CLI (how the workflow actually uses it)', () => {
  const run = (input, env) => execFileSync('node', [SCRIPT, 'SMOKE_TEST_USERNAME', 'SMOKE_TEST_PASSWORD'], {
    input,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });

  it('redacts secrets streamed through stdin', () => {
    const out = run('user=smokeuser pass=Sm0ke!Test#Pw\nsecond line\n', {
      SMOKE_TEST_USERNAME: 'smokeuser',
      SMOKE_TEST_PASSWORD: 'Sm0ke!Test#Pw',
    });
    assert.doesNotMatch(out, /smokeuser/);
    assert.doesNotMatch(out, /Sm0ke/);
    assert.match(out, /second line/);
  });

  it('passes text through unchanged when the vars are unset', () => {
    const input = 'no secrets configured here\n';
    assert.equal(run(input, { SMOKE_TEST_USERNAME: '', SMOKE_TEST_PASSWORD: '' }), input);
  });

  it('preserves the final line even without a trailing newline', () => {
    const out = run('tail without newline', { SMOKE_TEST_USERNAME: '', SMOKE_TEST_PASSWORD: '' });
    assert.equal(out, 'tail without newline');
  });

  it('redacts a secret even when it lands at a chunk boundary', () => {
    // 64 KiB of filler pushes the secret past the first stdin chunk, which
    // is exactly where naive per-chunk redaction would miss it.
    const password = 'Sm0ke!Test#Pw';
    const out = run('x'.repeat(70000) + `\npass=${password}\n`, {
      SMOKE_TEST_USERNAME: 'smokeuser',
      SMOKE_TEST_PASSWORD: password,
    });
    assert.doesNotMatch(out, /Sm0ke/);
  });
});

describe('file mode (the Allure result JSON before it is published)', () => {
  const password = 'Sm0ke!Test#Pw';
  const username = 'smokeuser';
  // A scratch directory per test: the glob is resolved against real files.
  const scratch = () => fs.mkdtempSync(path.join(os.tmpdir(), 'redact-'));

  it('rewrites a file that carries a secret and reports it', () => {
    const dir = scratch();
    const file = path.join(dir, 'a-result.json');
    fs.writeFileSync(file, JSON.stringify({ statusDetails: { message: `Received: "${username}"` } }));
    const changed = redactFiles([path.join(dir, '*.json')], [username, password]);
    assert.deepEqual(changed, [file]);
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /smokeuser/);
    assert.match(fs.readFileSync(file, 'utf8'), /Received/);
  });

  it('leaves a clean file byte-for-byte alone', () => {
    const dir = scratch();
    const file = path.join(dir, 'clean-result.json');
    const body = JSON.stringify({ name: 'the catalog shows at least one movie', status: 'passed' });
    fs.writeFileSync(file, body);
    const before = fs.statSync(file).mtimeMs;
    assert.deepEqual(redactFiles([path.join(dir, '*.json')], [username, password]), []);
    assert.equal(fs.readFileSync(file, 'utf8'), body);
    assert.equal(fs.statSync(file).mtimeMs, before);
  });

  it('touches only what the glob names', () => {
    const dir = scratch();
    fs.writeFileSync(path.join(dir, 'x-result.json'), `user=${username}`);
    fs.writeFileSync(path.join(dir, 'video.webm'), `user=${username}`);
    redactFiles([path.join(dir, '*.json')], [username]);
    assert.equal(fs.readFileSync(path.join(dir, 'video.webm'), 'utf8'), `user=${username}`);
  });

  it('is reachable from the CLI with --files, secrets still from env', () => {
    const dir = scratch();
    const file = path.join(dir, 'b-result.json');
    fs.writeFileSync(file, `pass=${password}\n`);
    const out = execFileSync('node', [SCRIPT, '--files', path.join(dir, '*.json'), 'SMOKE_TEST_USERNAME', 'SMOKE_TEST_PASSWORD'], {
      encoding: 'utf8',
      env: { ...process.env, SMOKE_TEST_USERNAME: username, SMOKE_TEST_PASSWORD: password },
    });
    assert.match(out, /Redacted 1 file/);
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /Sm0ke/);
  });
});
