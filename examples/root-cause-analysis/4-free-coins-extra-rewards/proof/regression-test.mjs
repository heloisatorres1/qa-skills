// usage: node regression-test.mjs <projectDir> <port>
// Regression test: Free Coins must never pay more than 5 times a day, even with Enter/Space pressed while the ad plays.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const [dir, port] = process.argv.slice(2);
const srv = spawn(process.execPath, ['scripts/dev-server.mjs'], { cwd: dir, env: { ...process.env, PORT: port }, stdio: 'ignore' });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let failed = false;
try {
  await sleep(800);
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await (await browser.newContext({ viewport: { width: 480, height: 860 } })).newPage();
  await page.addInitScript(() => { if (!localStorage.getItem('pixelswarm.save.v1')) localStorage.setItem('pixelswarm.save.v1', JSON.stringify({ v: 2, data: { started: true, storySeen: true, tutorialSeen: true, ageGroup: '18+', coins: 0, stats: { levels: 1 } } })); });
  await page.goto(`http://localhost:${port}/index.html`); await sleep(1500);
  await page.locator('[data-action="store"]:visible').first().click(); await sleep(500);
  const watch = page.locator('[data-action="free-coins"]');
  await watch.click();
  for (let i = 0; i < 5; i++) { await sleep(400); await page.keyboard.press(i % 2 ? 'Space' : 'Enter'); }
  await sleep(4500);
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('pixelswarm.save.v1')).data);
  assert.equal(s.freeCoins.count, 1, `one Watch click plus 5 key presses during the ad must pay once, paid ${s.freeCoins.count} times (${s.coins} coins)`);
  // fill up to the limit, then confirm a 6th reward is impossible
  for (let k = 0; k < 6; k++) { if (await watch.isEnabled()) { await watch.click(); await sleep(4200); } }
  const e = await page.evaluate(() => JSON.parse(localStorage.getItem('pixelswarm.save.v1')).data);
  assert.equal(e.freeCoins.count, 5, `daily limit is 5, got ${e.freeCoins.count}`);
  console.log('PASS: Free Coins paid ' + e.freeCoins.count + ' times, ' + e.coins + ' coins');
  await browser.close();
} catch (err) { failed = true; console.log('FAIL: ' + err.message); }
srv.kill(); process.exit(failed ? 1 : 0);
