// The API's defences, probed from outside against the live Worker: who gets
// in, what a stranger's origin sees, what hostile input does, and what an
// error gives away. Nothing here writes anything that is not undone; the
// hostile requests are all refused before they could write.
const { test, expect } = require('@playwright/test');
const { api, forgedToken, APP_ORIGIN, SITE, LEAK } = require('./support/api-client');

test.describe('who gets in', () => {
  const guarded = ['/pool/version', '/library/marks', '/tmdb/3/movie/603'];

  test('nobody without a token or a key', async () => {
    for (const path of guarded) {
      const r = await api('GET', path, { auth: 'none' });
      expect(r.status, path).toBe(401);
    }
  });

  test('not a token nobody signed, nor an unsigned one, nor garbage', async () => {
    const tokens = [forgedToken(), forgedToken({ alg: 'none' }), forgedToken({ alg: 'HS256' }), 'not.a.jwt', 'x'];
    for (const t of tokens) {
      const r = await api('GET', '/library/marks', { auth: { Authorization: `Bearer ${t}` } });
      expect(r.status).toBe(401);
      expect(r.text).not.toMatch(LEAK);
    }
  });

  test('not a made-up service key', async () => {
    for (const key of ['x', 'service', 'a'.repeat(64)]) {
      const r = await api('GET', '/pool/version', { auth: { 'X-Seenit-Service': key } });
      expect(r.status).toBe(401);
    }
  });

  test('a person is kept out of every CI route', async () => {
    const ci = [
      ['POST', '/pool/sync'], ['POST', '/pool/enrich'], ['POST', '/pool/bump-version'], ['GET', '/pool/budget'],
      ['POST', '/pool/lock'], ['POST', '/pool/rebuild-mark-counts'], ['POST', '/pool/rebuild-stats'],
      ['POST', '/pool/rebuild-genre-shares'], ['GET', '/pool/actors/candidates'], ['POST', '/pool/actors'],
      ['POST', '/pool/wikidata'], ['POST', '/pool/tmdb'], ['POST', '/pool/collections'], ['POST', '/pool/trailers'],
      ['PUT', '/pool/meta/catalogue_version'], ['PUT', '/library/roles/anyone'], ['POST', '/library/import'],
    ];
    for (const [method, path] of ci) {
      const r = await api(method, path, { body: method === 'GET' ? undefined : {} });
      expect(r.status, `${method} ${path}`).toBe(403);
    }
  });

  test('a person without the admin role is kept out of the admin routes', async () => {
    const me = (await api('GET', '/library/me')).json;
    test.skip(me.may_edit_catalogue, 'the smoke account is an admin; nothing to prove here');
    for (const [method, path] of [['GET', '/library/admin/stats'], ['GET', '/library/bots'], ['POST', '/library/bots'],
      ['DELETE', `/pool/films/${encodeURIComponent('movie:603')}`], ['PATCH', `/pool/films/${encodeURIComponent('movie:603')}`]]) {
      const r = await api(method, path, { body: method === 'GET' ? undefined : {} });
      expect(r.status, `${method} ${path}`).toBe(403);
    }
  });
});

test.describe('another origin', () => {
  test('is never echoed back, so no other site can read an answer', async () => {
    const r = await api('OPTIONS', '/library/marks', {
      auth: 'none', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET' },
    });
    expect(r.headers.get('access-control-allow-origin')).toBeNull();
    const g = await api('GET', '/pool/version', { headers: { Origin: 'https://evil.example' } });
    expect(g.headers.get('access-control-allow-origin')).toBeNull();
  });

  test('the app\'s own origin is, with every method the app uses', async () => {
    const r = await api('OPTIONS', '/pool/films/movie%3A603', {
      auth: 'none', headers: { Origin: APP_ORIGIN, 'Access-Control-Request-Method': 'PATCH' },
    });
    expect(r.headers.get('access-control-allow-origin')).toBe(APP_ORIGIN);
    const methods = r.headers.get('access-control-allow-methods') || '';
    for (const m of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) expect(methods, m).toContain(m);
    expect(methods).not.toMatch(/TRACE|CONNECT/);
  });
});

test.describe('hostile input', () => {
  const hostile = [
    "' OR '1'='1", "'; DROP TABLE users; --", '" OR 1=1 --', '1 UNION SELECT user_uid FROM users --',
    '%', '_', '\\', '../../etc/passwd', '<script>alert(1)</script>', 'movie:603 OR 1=1', "movie:603'--",
  ];

  test('is data in every path segment: refused or answered, never an error', async () => {
    for (const h of hostile) {
      const e = encodeURIComponent(h);
      for (const path of [`/pool/films/${e}`, `/library/collections/x/${e}`, `/library/users/${e}`, `/pool/people/actors/${e}`]) {
        const r = await api('GET', path);
        expect(r.status, path).toBeLessThan(500);
        expect(r.text, path).not.toMatch(LEAK);
      }
    }
  });

  test('is data in every search: no pattern lists everything, no error leaks', async () => {
    for (const h of hostile) {
      const e = encodeURIComponent(h);
      for (const path of [`/library/users?q=${e}`, `/pool/query?q=${e}`, `/pool/query?actor=${e}`, `/pool/top?group=${e}`, `/pool/list?group=${e}&limit=5`]) {
        const r = await api('GET', path);
        expect(r.status, path).toBeLessThan(500);
        expect(r.text, path).not.toMatch(LEAK);
      }
    }
  });

  test('never becomes a mark', async () => {
    const before = (await api('GET', '/library/marks')).json;
    for (const h of hostile) {
      const r = await api('PUT', `/library/marks/must/${encodeURIComponent(h)}`);
      expect(r.status, h).toBe(400);
    }
    expect((await api('GET', '/library/marks')).json.must).toEqual(before.must);
  });

  test('a list name that is not a list is refused', async () => {
    for (const list of ['users', 'watched;DROP', 'watched)--', '__proto__']) {
      const r = await api('PUT', `/library/marks/${encodeURIComponent(list)}/movie%3A603`);
      expect(r.status, list).toBe(400);
    }
  });

  test('a broken %-escape in a path is a 400 in JSON, not a server error page', async () => {
    const r = await api('GET', '/library/collections/%E0%A4%A/x');
    expect(r.status).toBe(400);
    expect(r.headers.get('content-type')).toContain('application/json');
  });

  test('a body that is not JSON is a 400', async () => {
    const r = await api('POST', '/library/marks/batch', { raw: '{not json' });
    expect(r.status).toBe(400);
  });

  test('a body over 256 KB is refused before it is read', async () => {
    const r = await api('POST', '/library/marks/batch', { raw: JSON.stringify({ ops: [], pad: 'x'.repeat(300 * 1024) }) });
    expect(r.status).toBe(413);
  });

  test('a title TMDb does not have cannot be put into the shared catalogue', async () => {
    // Against a Worker without the check this request WOULD publish a fake
    // title to everybody (it did once, on 2026-09-19, and had to be removed
    // by hand). So it runs only once the hardened Worker is live, which the
    // proxy path allowlist from the same release gives away.
    const hardened = (await api('GET', '/tmdb/4/list/1')).status === 404;
    test.skip(!hardened, 'the live Worker predates the new-film check; running this would publish a fake title');
    const id = `e2e-sec-${Date.now().toString(36)}`;
    try {
      const r = await api('PUT', `/library/collections/${id}/films/${encodeURIComponent('movie:999999999')}`, {
        body: { name: 'x', film: { canonical_title_uk: 'Fake', providers: [{ name: 'x', url: 'javascript:alert(1)' }] } },
      });
      expect(r.status).toBe(400);
      expect((await api('GET', `/pool/films/${encodeURIComponent('movie:999999999')}`)).status).toBe(404);
    } finally {
      await api('DELETE', `/library/collections/${id}`);
    }
  });
});

test.describe('methods', () => {
  test('a mark is never set by GET or POST', async () => {
    const key = encodeURIComponent('movie:603');
    const before = (await api('GET', '/library/marks')).json.must;
    try {
      for (const method of ['GET', 'POST']) {
        const r = await api(method, `/library/marks/must/${key}`);
        expect(r.status, method).toBe(405);
      }
      expect((await api('GET', '/library/marks')).json.must).toEqual(before);
    } finally {
      // An older Worker SETS the mark on a GET; leave the list as found.
      if (!before.includes('movie:603')) await api('DELETE', `/library/marks/must/${key}`);
    }
  });

  test('the catalogue\'s read routes answer GET only', async () => {
    for (const path of ['/pool/version', '/pool/list', '/pool/random', '/pool/top']) {
      const r = await api('POST', path, { body: {} });
      expect(r.status, path).toBe(405);
    }
  });
});

test.describe('the proxies', () => {
  test('forward only the paths the app uses', async () => {
    for (const path of ['/tmdb/4/list/1', '/tmdb/', '/tmdb/..%2F..%2Fetc', '/wikidata/bigdata/namespace/wdq/sparql', '/translate/keygen', '/constructor/x', '/__proto__/x']) {
      const r = await api('GET', path);
      expect(r.status, path).toBe(404);
    }
  });

  test('never send anything but GET upstream', async () => {
    const r = await api('POST', '/tmdb/3/movie/603', { body: {} });
    expect(r.status).toBe(405);
  });
});

test.describe('a failure', () => {
  test('tells the caller nothing about the inside', async () => {
    for (const path of ['/pool/films/movie%3A0', '/library/nothing-here', '/pool/nothing-here', '/nothing-here']) {
      const r = await api('GET', path);
      expect(r.status, path).toBeGreaterThanOrEqual(400);
      expect(r.text, path).not.toMatch(LEAK);
    }
  });
});

test.describe('the site', () => {
  test('sends the security headers', async () => {
    const res = await fetch(SITE);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('referrer-policy')).toBeTruthy();
    expect(res.headers.get('content-security-policy') || '').toContain("frame-ancestors 'none'");
  });

  test('carries no secret in the page', async () => {
    const html = await (await fetch(SITE)).text();
    expect(html).not.toMatch(/X-Seenit-Service|SERVICE_KEY|TMDB_TOKEN|BOT_PASSWORD|-----BEGIN [A-Z ]*PRIVATE KEY/);
  });
});
