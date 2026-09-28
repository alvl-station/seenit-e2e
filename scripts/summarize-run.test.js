const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { verdict, summary, tests } = require('../scripts/summarize-run.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'summarize-run.js');

// The shape Playwright's JSON reporter writes, reduced to what the script reads.
function report({ expected = 0, unexpected = 0, flaky = 0, skipped = 0, specs = [], errors = [] } = {}) {
  return {
    stats: { expected, unexpected, flaky, skipped },
    errors,
    suites: [{ title: 'smoke.feature', suites: [{ title: 'Core smoke', specs }] }],
  };
}
const spec = (title, status, { results = 1, annotations = [], project = 'desktop' } = {}) => ({
  title,
  tests: [{ projectName: project, status, annotations, results: Array.from({ length: results }, (_, retry) => ({ retry })) }],
});

describe('verdict', () => {
  it('is inconclusive without a report', () => {
    assert.equal(verdict(null), 'inconclusive');
    assert.equal(verdict({}), 'inconclusive');
  });
  it('is inconclusive when nothing ran', () => {
    assert.equal(verdict(report()), 'inconclusive');
  });
  it('is failed when a test failed after its retry', () => {
    assert.equal(verdict(report({ expected: 5, unexpected: 1 })), 'failed');
  });
  it('is passed when everything expected, flakes and skips included', () => {
    assert.equal(verdict(report({ expected: 5, flaky: 2, skipped: 3 })), 'passed');
  });
});

describe('summary', () => {
  it('names the flaky tests and how many retries each took', () => {
    const out = summary(report({ expected: 2, flaky: 1, specs: [
      spec('Opening and closing the movie modal', 'flaky', { results: 2 }),
      spec('Logging in loads the catalog', 'expected'),
    ] }));
    assert.match(out, /Flaky/);
    assert.match(out, /Opening and closing the movie modal.*1 retry/);
    assert.doesNotMatch(out, /Logging in loads the catalog/);
  });
  it('names the skipped tests with their reasons', () => {
    const out = summary(report({ expected: 1, skipped: 1, specs: [
      spec('A film with providers lists each one', 'skipped', {
        annotations: [{ type: 'skip', description: 'no film in the catalog has providers on file yet' }],
      }),
    ] }));
    assert.match(out, /Skipped/);
    assert.match(out, /A film with providers lists each one.*no film in the catalog has providers/);
  });
  it('reads a skip reason recorded on a result rather than the test', () => {
    const r = report({ skipped: 1, specs: [spec('x', 'skipped')] });
    r.suites[0].suites[0].specs[0].tests[0].results[0].annotations = [{ type: 'skip', description: 'later reason' }];
    assert.match(summary(r), /later reason/);
  });
  it('surfaces a teardown that could not undo a mark', () => {
    const out = summary(report({ expected: 1, specs: [
      spec('Marking a film watched', 'expected', {
        annotations: [{ type: 'teardown-failed', description: 'could not unmark "Matrix" (переглянуто): timeout' }],
      }),
    ] }));
    assert.match(out, /Teardown could not undo a mark/);
    assert.match(out, /could not unmark "Matrix"/);
  });
  it('says so when there is no report at all', () => {
    assert.match(summary(null), /never ran to a result/);
  });
  it('carries the totals in a table', () => {
    const out = summary(report({ expected: 60, unexpected: 1, flaky: 2, skipped: 3 }));
    assert.match(out, /\| 60 \| 1 \| 2 \| 3 \|/);
  });
  it('shows a runner error', () => {
    const out = summary(report({ errors: [{ message: 'Error: no tests found' }] }));
    assert.match(out, /Runner error/);
    assert.match(out, /no tests found/);
  });
});

describe('tests()', () => {
  it('joins the suite path into one title and keeps the project', () => {
    const [t] = tests(report({ specs: [spec('The search page opens', 'expected', { project: 'phone-portrait' })] }));
    assert.equal(t.title, 'smoke.feature › Core smoke › The search page opens');
    assert.equal(t.project, 'phone-portrait');
  });
});

describe('CLI', () => {
  const write = (content) => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'summ-')), 'smoke.json');
    fs.writeFileSync(file, JSON.stringify(content));
    return file;
  };
  const run = (args, env = {}) => execFileSync('node', [SCRIPT, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });

  it('prints the verdict alone with --verdict', () => {
    assert.equal(run([write(report({ expected: 3 })), '--verdict']), 'passed\n');
    assert.equal(run([write(report({ expected: 3, unexpected: 1 })), '--verdict']), 'failed\n');
  });
  it('is inconclusive for a missing file', () => {
    assert.equal(run(['/nonexistent/smoke.json', '--verdict']), 'inconclusive\n');
  });
  it('redacts the smoke account out of the summary', () => {
    const file = write(report({ unexpected: 1, specs: [
      spec('The account panel knows who I am', 'unexpected', {
        annotations: [{ type: 'teardown-failed', description: 'Received: "smokeuser"' }],
      }),
    ] }));
    const out = run([file], { SMOKE_TEST_USERNAME: 'smokeuser', SMOKE_TEST_PASSWORD: 'Sm0ke!Test#Pw' });
    assert.doesNotMatch(out, /smokeuser/);
    assert.match(out, /\*\*\*/);
  });
});
