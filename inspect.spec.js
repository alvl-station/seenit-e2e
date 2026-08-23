// Throwaway. Photographs the live header at phone width and reports whether
// the NEW and delete controls are actually reachable — reported as
// "неактивні", which could mean greyed out, covered by something, or pushed
// off the edge. Guessing between those costs a deploy cycle each; looking
// costs one run. Delete once answered.
const { test, expect } = require('@playwright/test');
const { CatalogPage } = require('./pages/CatalogPage');

test('photograph the header controls', async ({ page }) => {
  const catalog = new CatalogPage(page);
  await catalog.goto();
  await catalog.waitForCatalogLoaded();

  await page.screenshot({ path: 'shots/header.png', clip: { x: 0, y: 0, width: 390, height: 320 } });
  await page.screenshot({ path: 'shots/full.png', fullPage: false });

  const report = await page.evaluate(() => {
    const out = {};
    for (const [name, sel] of [['NEW', '#addMovieBtn'], ['DELETE', '#deleteModeBtn'], ['SEARCH', '#searchBtn'], ['INPUT', '#search']]) {
      const el = document.querySelector(sel);
      if (!el) { out[name] = 'MISSING'; continue; }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      // What is actually under the middle of the control? If it is not the
      // control itself, a tap there lands on whatever is.
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      out[name] = {
        box: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`,
        offscreen: r.x < 0 || r.right > window.innerWidth,
        display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
        pointerEvents: cs.pointerEvents, disabled: el.disabled === true,
        color: cs.color, background: cs.backgroundColor,
        topElement: hit ? (hit.id || hit.className || hit.tagName) : 'none',
        reachable: hit === el || el.contains(hit),
      };
    }
    out.rowWidth = document.querySelector('.search-row').getBoundingClientRect().width;
    out.viewport = window.innerWidth;
    return out;
  });
  console.log('REPORT ' + JSON.stringify(report, null, 2));
});
