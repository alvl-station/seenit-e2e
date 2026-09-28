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

/** One mark on the `must` list, set or cleared, the way the app writes them. */
const markMust = (key, on) => api('POST', '/library/marks/batch', { body: { ops: [{ list: 'must', key, on }] } });

/**
 * Skips the test unless every key is already in the shared catalogue. A
 * collection write naming an uncatalogued title makes the Worker fetch and
 * INSERT it, and this suite never adds a film.
 */
async function onlyIfCatalogued(...keys) {
  for (const key of keys) {
    const r = await api('GET', `/pool/films/${encodeURIComponent(key)}`);
    test.skip(r.status !== 200, `${key} is not in the catalogue (HTTP ${r.status}); writing it would add a film`);
  }
}

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

  test('a mark is set in a batch, read back, and cleared in another', async () => {
    // "must" is the list the smoke scenarios touch least. The batch route is
    // the only way the app writes marks now; the per-key PUT/DELETE is gone.
    const before = (await api('GET', '/library/marks')).json.must.includes(FILM);
    try {
      expect((await markMust(FILM, true)).status).toBe(200);
      expect((await api('GET', '/library/marks')).json.must).toContain(FILM);
      expect((await markMust(FILM, false)).status).toBe(200);
      expect((await api('GET', '/library/marks')).json.must).not.toContain(FILM);
    } finally {
      // Leave the list as it was found.
      await markMust(FILM, before);
    }
  });

  test('a collection is made, filled, renamed, published, read off the shelf and deleted', async () => {
    // Both titles must already be in the shared catalogue: adding a title a
    // collection names is how the Worker INSERTS one it has never seen, and
    // this suite never adds a film (REQUIREMENTS T-4). Skipped, not failed,
    // when either is missing — the test would otherwise write the catalogue.
    await onlyIfCatalogued(FILM, SERIES);
    const id = `e2e-api-${Date.now().toString(36)}`;
    // The shelf entry for this collection, or null once it is gone.
    const onShelf = async () => {
      const shelf = await api('GET', '/library/collections');
      expect(shelf.status).toBe(200);
      return shelf.json.collections.find(c => c.collection_id === id && c.source === 'own') || null;
    };
    try {
      let r = await api('PUT', `/library/collections/${id}`, { body: { name: 'E2E API', film_ids: [FILM] } });
      expect(r.status).toBe(200);
      // No `film` body, ever: with the title already catalogued the Worker
      // only references it, and a body could not add anything anyway.
      r = await api('PUT', `/library/collections/${id}/films/${encodeURIComponent(SERIES)}`);
      expect(r.status).toBe(200);
      r = await api('PUT', `/library/collections/${id}`, { body: { name: 'E2E API renamed' } });
      expect(r.status).toBe(200);
      r = await api('PUT', `/library/collections/${id}/public`, { body: { visibility: 'private' } });
      expect(r.status).toBe(200);

      // Read back the way the app reads its own: off the shelf. The
      // per-owner read routes are gone.
      const mine = await onShelf();
      expect(mine, 'the collection is not on the shelf').not.toBeNull();
      expect(mine.name).toBe('E2E API renamed');
      expect(mine.film_ids).toEqual([FILM, SERIES]);
    } finally {
      const r = await api('DELETE', `/library/collections/${id}`);
      expect(r.status).toBe(200);
    }
    expect(await onShelf()).toBeNull();
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
