// usage: node repro.mjs <projectDir> <port> <outPrefix> [wins]
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
import { spawn } from 'node:child_process';
const [dir, port, out, winsArg] = process.argv.slice(2);
const WINS = Number(winsArg || 10);
const srv = spawn(process.execPath, ['scripts/dev-server.mjs'], { cwd: dir, env: { ...process.env, PORT: port }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: 'msedge' });
const page = await (await browser.newContext({ viewport: { width: 420, height: 800 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e)));
async function dismiss() {
  if (await page.locator('#cutscene:not([hidden])').count()) { await page.locator('.cs-skip').click(); await page.waitForTimeout(400); }
  for (let k = 0; k < 4; k++) {
    const vis = await page.locator('.overlay:not([hidden])').count();
    if (!vis) break;
    if (await page.locator('#popup-age:not([hidden])').count()) { await page.locator('.age-btn[data-age="18+"]').click(); await page.locator('#age-confirm').click(); await page.waitForTimeout(300); continue; }
    const btn = page.locator('.overlay:not([hidden]) [data-close], .overlay:not([hidden]) .gbtn').first();
    if (await btn.count()) await btn.click({ timeout: 1500 }).catch(() => {}); else break;
    await page.waitForTimeout(300);
  }
}
await page.addInitScript(() => { try { if (!localStorage.getItem('pixelswarm.save.v1')) localStorage.setItem('pixelswarm.save.v1', JSON.stringify({ tutorialSeen: true, storySeen: true, ageGroup: '18+' })); } catch (e) {} }); // setup only: skip first-run story/tutorial/age gate; all progress fields stay at defaults
try {
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => !document.getElementById("loading"), null, { timeout: 15000 }); await page.waitForTimeout(600);
  // fresh save: only the browser's own empty storage
  for (let i = 0; i < WINS; i++) {
    await dismiss();
    if (await page.locator('[data-action="play"]:visible').count()) await page.locator('[data-action="play"]:visible').first().click({ timeout: 5000, force: true });
    await page.waitForTimeout(700);
    await dismiss();
    await dismiss();
    await page.locator('#dbg-btn').click();
    await page.locator('[data-cmd="win"]').click();
    await page.waitForTimeout(500);
    if (process.env.SHOT) await page.screenshot({ path: 'evidence/dbg-win'+i+'.png' });
    await page.locator('[data-action="win-continue"]').click();
    await page.waitForTimeout(500);
    if (await page.locator('#ad-overlay:not([hidden])').count()) await page.waitForFunction(() => document.getElementById('ad-overlay').hidden, null, { timeout: 8000 });
    await page.waitForTimeout(300);
    // back to menu if we are inside the next level
    const home = page.locator('[data-action="home"]:visible').first();
    if (await page.locator('#popup-pause:not([hidden])').count()) {}
  }
  // leave the level through the pause menu, like a player (the profile button is on the main menu)
  if (!(await page.locator('[data-action="profile"]:visible').count())) { await page.locator('[data-action="pause"]:visible').click(); await page.locator('[data-action="quit"]:visible').click(); await page.waitForTimeout(600); await dismiss(); }
  const s = await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('pixelswarm.save.v1')).data; return { levelsWon: o.stats.levels, playerLevel: o.playerLevel, xp: o.xp, xpToNext: o.xpToNext }; });
  await page.screenshot({ path: out + '-before-profile.png' });
  if (!(await page.locator('[data-action="profile"]:visible').count())) await page.locator('.nav-btn[data-screen="menu"]:visible').click({ force: true });
  await page.locator('[data-action="profile"]:visible').first().click({ force: true });
  await page.waitForTimeout(500);
  const ui = await page.evaluate(() => ({ xpText: document.getElementById('ui-xp-text').textContent, level: [...document.querySelectorAll('#popup-profile .ui-player-level')].map(e => e.textContent), fill: [...document.querySelectorAll('#popup-profile .ui-xp-fill')].map(e => e.style.width) }));
  await page.screenshot({ path: out + '-profile.png' });
  await page.locator('[data-avatar="bee_fly"]').click(); await page.waitForTimeout(300);
  const toastText = await page.locator('#toast').textContent();
  console.log('LOCKED AVATAR (needs level 10) TOAST', JSON.stringify(toastText));
  console.log('SAVE', JSON.stringify(s)); console.log('PROFILE UI', JSON.stringify(ui)); console.log('PAGE ERRORS', JSON.stringify(errs));
  console.log(s.playerLevel > 1 || s.xp !== 1 ? 'RESULT: level/xp progressed (bug absent)' : `RESULT: BUG - ${s.levelsWon} levels won, playerLevel=${s.playerLevel}, xp=${s.xp}/${s.xpToNext}`);
} finally { await browser.close(); srv.kill(); }
