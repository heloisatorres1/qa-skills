// usage: node repro.mjs <projectDir> <port> <outPrefix>
// Starts the game server from <projectDir>, then tries 3 real-input ways to use Free Coins.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
import { spawn } from 'node:child_process';
const [dir, port, out] = process.argv.slice(2);
const srv = spawn(process.execPath, ['scripts/dev-server.mjs'], { cwd: dir, env: { ...process.env, PORT: port }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const browser = await chromium.launch({ channel: 'msedge' });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function scenario(name, fn) {
  const ctx = await browser.newContext({ viewport: { width: 480, height: 860 } });
  const page = await ctx.newPage();
  // setup only (not the trigger): a returning player's save with intro/tutorial/age already done, 0 free coins used
  await page.addInitScript(() => { if (!localStorage.getItem('pixelswarm.save.v1')) localStorage.setItem('pixelswarm.save.v1', JSON.stringify({ v: 2, data: { started: true, storySeen: true, tutorialSeen: true, ageGroup: '18+', coins: 0, stats: { levels: 1 } } })); });
  await page.goto(`http://localhost:${port}/index.html`);
  await sleep(1500);
  await page.locator('[data-action="store"]:visible').first().click();   // real click on a visible Store button
  await sleep(500);
  const read = () => page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('pixelswarm.save.v1')).data;
    return { count: s.freeCoins.count, coins: s.coins, label: document.querySelector('.card.free small')?.textContent };
  });
  const before = await read();
  await fn(page);
  await sleep(4500);                                                 // let every ad finish
  const after = await read();
  await page.screenshot({ path: `${out}-${name}.png` });
  console.log(`${name}: before=${JSON.stringify(before)} after=${JSON.stringify(after)} rewards=${after.count} (limit 5)`);
  await ctx.close();
}
const watch = (p) => p.locator('[data-action="free-coins"]');
// A: patient mouse use, one click per finished ad (6 attempts)
await scenario('A-mouse-patient', async (p) => { for (let i = 0; i < 6; i++) { if (await watch(p).isEnabled()) await watch(p).click(); await sleep(4200); } });
// B: mouse double-click
await scenario('B-mouse-dblclick', async (p) => { for (let i = 0; i < 3; i++) { await watch(p).dblclick().catch(() => {}); await sleep(4200); } await watch(p).dblclick().catch(() => {}); });
// C: click Watch, then press Enter / Space on the still-focused button while the ad runs (6 presses, 400 ms apart)
await scenario('C-keyboard-repeat', async (p) => { await watch(p).click(); for (let i = 0; i < 5; i++) { await sleep(400); await p.keyboard.press(i % 2 ? 'Space' : 'Enter'); } });
await browser.close(); srv.kill();
