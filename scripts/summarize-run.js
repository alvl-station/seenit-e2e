#!/usr/bin/env node
// Reads Playwright's JSON report and says what a green run hides.
//
//   node scripts/summarize-run.js test-results/smoke.json            # markdown summary
//   node scripts/summarize-run.js test-results/smoke.json --verdict  # passed | failed | inconclusive
//
// The summary goes to $GITHUB_STEP_SUMMARY: every test that only passed
// on its retry (a flake the run would otherwise call green), every test
// that skipped and why, and any teardown that could not undo a mark. The
// verdict is what the workflow dispatches back to seenit-frontend:
//
//   passed        every test expected, whatever was flaky or skipped
//   failed        at least one test failed after its retry
//   inconclusive  no usable report at all -- the runner never produced
//                 one (install, browser or config trouble), or it ran no
//                 tests. Not a verdict on the deploy, and not a rollback.
//
// Output is redacted with the same secrets as the log: a title cannot
// carry a credential, but an error message can.
const fs = require('fs');
const { redact, secretsFromEnv } = require('./redact-secrets');

const SECRET_VARS = ['SMOKE_TEST_USERNAME', 'SMOKE_TEST_PASSWORD'];

/** The report, or null when there is none to read. */
function loadReport(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return null;
  }
}

/** Every test in the report, flattened, with its spec title and project. */
function tests(report) {
  const out = [];
  const walk = (suite, path) => {
    const here = suite.title ? [...path, suite.title] : path;
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) {
        const annotations = [...(t.annotations || [])];
        for (const r of t.results || []) for (const a of r.annotations || []) annotations.push(a);
        out.push({
          title: [...here, spec.title].filter(Boolean).join(' › '),
          project: t.projectName || '',
          status: t.status,
          retries: Math.max(0, (t.results || []).length - 1),
          annotations,
        });
      }
    }
    for (const s of suite.suites || []) walk(s, here);
  };
  for (const s of report.suites || []) walk(s, []);
  return out;
}

/** passed | failed | inconclusive, from the report alone. */
function verdict(report) {
  if (!report || !report.stats) return 'inconclusive';
  const { expected = 0, unexpected = 0, flaky = 0, skipped = 0 } = report.stats;
  if (expected + unexpected + flaky + skipped === 0) return 'inconclusive';
  return unexpected > 0 ? 'failed' : 'passed';
}

/** The markdown the step summary shows. */
function summary(report) {
  if (!report || !report.stats) return '## Smoke\n\nNo Playwright report was written: the suite never ran to a result.\n';
  const s = report.stats;
  const all = tests(report);
  const lines = ['## Smoke'];
  lines.push('');
  lines.push(`| passed | failed | flaky | skipped |`);
  lines.push(`|---:|---:|---:|---:|`);
  lines.push(`| ${s.expected || 0} | ${s.unexpected || 0} | ${s.flaky || 0} | ${s.skipped || 0} |`);

  const section = (title, rows) => {
    if (!rows.length) return;
    lines.push('', `### ${title}`, '');
    for (const r of rows) lines.push(`- ${r}`);
  };
  const named = t => `${t.title}${t.project ? ` _(${t.project})_` : ''}`;

  section('Failed', all.filter(t => t.status === 'unexpected').map(named));
  section('Flaky — passed only on a retry',
    all.filter(t => t.status === 'flaky').map(t => `${named(t)} — ${t.retries} retr${t.retries === 1 ? 'y' : 'ies'}`));
  section('Skipped', all.filter(t => t.status === 'skipped').map(t => {
    const why = t.annotations.filter(a => a.type === 'skip' && a.description).map(a => a.description);
    return `${named(t)}${why.length ? ` — ${why.join('; ')}` : ''}`;
  }));
  section('Teardown could not undo a mark', all.flatMap(t =>
    t.annotations.filter(a => a.type === 'teardown-failed').map(a => `${named(t)} — ${a.description || ''}`)));
  for (const e of report.errors || []) lines.push('', '### Runner error', '', '```', String(e.message || e).trim(), '```');
  lines.push('');
  return lines.join('\n');
}

module.exports = { loadReport, tests, verdict, summary };

if (require.main === module) {
  const args = process.argv.slice(2);
  const wantVerdict = args.includes('--verdict');
  const file = args.find(a => !a.startsWith('--')) || 'test-results/smoke.json';
  const report = loadReport(file);
  const secrets = secretsFromEnv(SECRET_VARS);
  process.stdout.write(redact(wantVerdict ? `${verdict(report)}\n` : summary(report), secrets));
}
