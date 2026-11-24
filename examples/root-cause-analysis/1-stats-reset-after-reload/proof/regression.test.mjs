// Regression test: a saved game's stats must survive a page refresh.
// usage: node regression.test.mjs <port>   (serves the project to test; exit 0 = PASS, 1 = FAIL)
// Should live in the project as e.g. tests/save-stats.test.mjs (run with the dev server up).
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const port = process.argv[2];
const saved = { levels: 12, firstTry: 7, perfect: 5, hard: 2, pixels: 4321, boosters: 3, coinsEarned: 560, daily: 4, eventWins: 1 };
const seed = { v: 2, savedAt: Date.now(), data: { playerId: 'TEST-ABCD', ageGroup: 'adult', tutorialSeen: true, storySeen: true, coins: 900, gems: 40, stats: saved } };
const b = await chromium.launch({ channel: 'msedge' });
const page = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.addInitScript(([s]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('pixelswarm.save.v1', s); sessionStorage.setItem('seeded', '1'); } }, [JSON.stringify(seed)]);
let failed = false;
for (const step of ['first load', 'after F5']) {
  if (step === 'after F5') await page.reload(); else await page.goto(`http://localhost:${port}/index.html`);
  await page.waitForSelector('[data-action="collections"]', { state: 'visible', timeout: 30000 });
  await page.locator('[data-action="collections"]').first().click();
  await page.locator('#screen-collections [data-action="col-tab"][data-tab="achievements"]').click();
  await page.waitForTimeout(300);
  const shown = await page.$eval('#screen-collections', el => el.innerText.match(/Levels won: ([\d,]+)/)[1]);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('pixelswarm.save.v1')).data.stats);
  const ok = shown === '12' && Object.entries(saved).every(([k, v]) => stored[k] === v);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${step}: screen says "Levels won: ${shown}" (expected 12); saved stats = ${JSON.stringify(stored)}`);
  if (!ok) failed = true;
}
await b.close();
console.log(failed ? 'RESULT: FAIL - achievements were reset to the defaults' : 'RESULT: PASS');
process.exit(failed ? 1 : 0);
