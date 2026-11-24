// Blast radius check: does the stats reset re-lock boosters in a level? usage: node blast-boosters.mjs <port> <tag>
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const port = process.argv[2], tag = process.argv[3];
const seed = { v: 2, savedAt: Date.now(), data: { playerId: 'TEST-ABCD', ageGroup: 'adult', tutorialSeen: true, storySeen: true, coins: 900, gems: 40,
  stats: { levels: 12, firstTry: 7, perfect: 5, hard: 2, pixels: 4321, boosters: 3, coinsEarned: 560, daily: 4, eventWins: 1 } } };
const b = await chromium.launch({ channel: 'msedge' });
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
await page.addInitScript(([s]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('pixelswarm.save.v1', s); sessionStorage.setItem('seeded', '1'); } }, [JSON.stringify(seed)]);
await page.goto(`http://localhost:${port}/index.html`);
await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, { timeout: 60000 });
await page.waitForTimeout(1500);
const bx = await page.locator('[data-action=play]').boundingBox();
await page.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2);
await page.waitForSelector('#g-boosters .bst', { state: 'visible', timeout: 30000 });
const r = await page.$$eval('#g-boosters .bst', e => e.map(x => (x.getAttribute('aria-label')) + (x.classList.contains('locked') ? ' [LOCKED]' : ' [open]')));
await page.screenshot({ path: `evidence/${tag}-boosters-in-level.png` });
console.log(tag, 'boosters in level after load with 12 levels won:', r.join(' | '));
await b.close();
