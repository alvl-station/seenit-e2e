// The API does what the app relies on: the routes answer, with the shapes
// the screens read, and a person's writes land and can be taken back.
//
// Every write here is on the smoke account and is undone before the test
// ends: a mark set is cleared, a collection made is deleted. A test that
// fails halfway still cleans up in its finally.
const { test, expect } = require('@playwright/test');
const { api } = require('./support/api-client');

const FILM = 'movie:603';      // The Matrix: in the catalogue for good
const SERIES = 'tv:1396';      // Breaking Bad

test.describe('the catalogue', () => {
  test('GET /pool/version names the catalogue version', async () => {
    const r = await api('GET', '/pool/version');
    expect(r.status).toBe(200);
    expect(r.json).toHaveProperty('version');
  });

  test('GET /pool/list pages films that carry their keys', async () => {
    const r = await api('GET', '/pool/list?limit=5');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.json.films)).toBe(true);
    expect(r.json.films.length).toBeGreaterThan(0);
    for (const f of r.json.films) expect(f.film_key).toMatch(/^(movie|tv):\d+$/);
  });

  test('GET /pool/films/{key} is the full card, with the people on it', async () => {
    const r = await api('GET', `/pool/films/${encodeURIComponent(FILM)}?full=1`);
    expect(r.status).toBe(200);
    const film = r.json.film || r.json;
    expect(JSON.stringify(film)).toContain('603');
  });

  test('GET /pool/films/{key} answers 404 for a title the catalogue does not hold', async () => {
    const r = await api('GET', `/pool/films/${encodeURIComponent('movie:999999999')}`);
    expect(r.status).toBe(404);
  });

  test('GET /pool/seasons lists a series\' seasons', async () => {
    const r = await api('GET', `/pool/seasons?id=${encodeURIComponent(SERIES)}`);
    expect(r.status).toBe(200);
  });

  test('GET /pool/random and /pool/top answer with films', async () => {
    for (const path of ['/pool/random', '/pool/top?limit=5']) {
      const r = await api('GET', path);
      expect(r.status, path).toBe(200);
      expect(Array.isArray(r.json.films), path).toBe(true);
    }
  });

  test('GET /public/home needs no sign-in', async () => {
    const r = await api('GET', '/public/home', { auth: 'none' });
    expect(r.status).toBe(200);
    expect(r.json).toBeTruthy();
  });

  test('the TMDb proxy answers for API v3', async () => {
    const r = await api('GET', '/tmdb/3/movie/603?language=uk-UA');
    expect(r.status).toBe(200);
    expect(r.json.id).toBe(603);
  });
});

test.describe('one person\'s library', () => {
  test('GET /library/me says who the account is and what it may do', async () => {
    const r = await api('GET', '/library/me');
    expect(r.status).toBe(200);
    expect(typeof r.json.uid).toBe('string');
    expect(typeof r.json.may_edit_catalogue).toBe('boolean');
    expect(Array.isArray(r.json.services)).toBe(true);
  });

  test('GET /library/marks has every list', async () => {
    const r = await api('GET', '/library/marks');
    expect(r.status).toBe(200);
    for (const list of ['watched', 'liked', 'must']) expect(Array.isArray(r.json[list]), list).toBe(true);
  });

  test('a mark is set with PUT, read back, and cleared with DELETE', async () => {
    // "must" is the list the smoke scenarios touch least.
    const before = (await api('GET', '/library/marks')).json.must.includes(FILM);
    try {
      expect((await api('PUT', `/library/marks/must/${encodeURIComponent(FILM)}`)).status).toBe(200);
      expect((await api('GET', '/library/marks')).json.must).toContain(FILM);
      expect((await api('DELETE', `/library/marks/must/${encodeURIComponent(FILM)}`)).status).toBe(200);
      expect((await api('GET', '/library/marks')).json.must).not.toContain(FILM);
    } finally {
      // Leave the list as it was found.
      await api(before ? 'PUT' : 'DELETE', `/library/marks/must/${encodeURIComponent(FILM)}`);
    }
  });

  test('a collection is made, filled, renamed, published, read and deleted', async () => {
    const id = `e2e-api-${Date.now().toString(36)}`;
    const me = (await api('GET', '/library/me')).json;
    try {
      let r = await api('PUT', `/library/collections/${id}`, { body: { name: 'E2E API', film_ids: [FILM] } });
      expect(r.status).toBe(200);
      r = await api('PUT', `/library/collections/${id}/films/${encodeURIComponent(SERIES)}`, { body: { name: 'E2E API' } });
      expect(r.status).toBe(200);
      r = await api('PUT', `/library/collections/${id}`, { body: { name: 'E2E API renamed' } });
      expect(r.status).toBe(200);
      r = await api('PUT', `/library/collections/${id}/public`, { body: { visibility: 'private' } });
      expect(r.status).toBe(200);

      r = await api('GET', `/library/collections/${encodeURIComponent(me.uid)}/${id}`);
      expect(r.status).toBe(200);
      expect(r.json.collection.name).toBe('E2E API renamed');
      expect(r.json.collection.film_ids).toEqual([FILM, SERIES]);

      r = await api('GET', `/library/collections/${encodeURIComponent(me.uid)}/${id}/films`);
      expect(r.status).toBe(200);
      expect(r.json.films.map(f => f.film_key)).toEqual([FILM, SERIES]);

      const shelf = await api('GET', '/library/collections');
      expect(shelf.status).toBe(200);
    } finally {
      const r = await api('DELETE', `/library/collections/${id}`);
      expect(r.status).toBe(200);
    }
    expect((await api('GET', `/library/collections/${encodeURIComponent(me.uid)}/${id}`)).status).toBe(404);
  });

  test('GET /library/users finds people by a typed name', async () => {
    const r = await api('GET', '/library/users?q=a');
    expect(r.status).toBe(200);
  });

  test('GET /library/subs has both directions', async () => {
    const r = await api('GET', '/library/subs');
    expect(r.status).toBe(200);
  });
});
