// usage: node repro.mjs <projectFolderServedOnPort> <port> <outPrefix>
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const port = process.argv[2] || '5501', tag = process.argv[3] || 'run';
const shotDir = process.argv[4] || '.';
const mode = process.argv[5] || 'A'; // A = seeded save, plain load. B = live in-session stats via dev shortcut (index.html#achievements), then F5
const url = `http://localhost:${port}/index.html` + (mode === 'B' ? '#achievements' : '');
const seed = { v: 2, savedAt: Date.now(), data: { playerId: 'TEST-ABCD', ageGroup: 'adult', tutorialSeen: true, storySeen: true,
  coins: 900, gems: 40, progress: { 'flowers-easy': [3, 2, 3] }, gallery: ['flowers-easy-0'],
  stats: { levels: 12, firstTry: 7, perfect: 5, hard: 2, pixels: 4321, boosters: 3, coinsEarned: 560, daily: 4, eventWins: 1 } } };
const browser = await chromium.launch({ channel: 'msedge' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.addInitScript(([s]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('pixelswarm.save.v1', s); sessionStorage.setItem('seeded', '1'); } }, [JSON.stringify(seed)]);
async function readAch(label) {
  await page.locator('[data-action="collections"]').first().click();
  await page.locator('#screen-collections [data-action="col-tab"][data-tab="achievements"]').click();
  await page.waitForTimeout(300);
  const cards = await page.$$eval('#screen-collections .ach', els => els.map(e => e.querySelector('h4').textContent + '=' + e.querySelector('.ach-count').textContent));
  const counter = await page.evaluate(() => document.querySelector('#screen-collections').innerText.match(/Levels won: [\d,]+/)?.[0]);
  await page.screenshot({ path: `${shotDir}/${tag}-${label}.png` });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pixelswarm.save.v1')).data);
  console.log(label, counter, '|', cards.join(', '));
  console.log(label, 'saved stats in localStorage:', JSON.stringify(saved.stats), 'coins', saved.coins, 'gems', saved.gems, 'progress', JSON.stringify(saved.progress));
  await page.locator('#screen-collections [data-action="back"], #screen-collections .back-btn').first().click().catch(() => {});
}
await page.goto(url);
await page.waitForSelector('[data-action="collections"]', { state: 'visible', timeout: 30000 });
if (mode === 'B') { await page.waitForTimeout(800); console.log('before-refresh (live, dev shortcut):', await page.$$eval('#screen-collections .ach', els => els.map(e => e.querySelector('h4').textContent + '=' + e.querySelector('.ach-count').textContent).join(', '))); await page.screenshot({ path: `${shotDir}/${tag}-before-refresh.png` }); await page.evaluate(() => history.replaceState(null, '', location.pathname)); } else await readAch('before-refresh');
await page.reload(); // F5
await page.waitForSelector('[data-action="collections"]', { state: 'visible', timeout: 30000 });
await readAch('after-refresh');
console.log('page errors:', errs.length ? errs : 'none');
await browser.close();
