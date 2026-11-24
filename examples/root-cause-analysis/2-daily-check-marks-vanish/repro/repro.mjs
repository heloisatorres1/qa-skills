// usage: node repro.mjs <outPrefix>   (server must run on :5511 serving the workcopy)
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const out = process.argv[2];
const b = await chromium.launch({ channel: 'msedge' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e)));
// SETUP (allowed): seed a save that only skips onboarding (age gate, intro story, tutorial). daily is left at the default {streak:0,last:''}.
const streakSeed = Number(process.env.STREAK || 0); // 0 = fresh save; N = N days claimed in a row up to yesterday (setup only)
await p.addInitScript((streakSeed) => { if (!localStorage.getItem('pixelswarm.save.v1')) localStorage.setItem('pixelswarm.save.v1', JSON.stringify({ v: 2, savedAt: Date.now(), data: { ageGroup: '18+', storySeen: true, tutorialSeen: true, launches: 1, ...(streakSeed ? { daily: { streak: streakSeed, last: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })() } } : {}) } })); }, streakSeed);
await p.goto('http://localhost:5511/');
await p.waitForTimeout(4000);
await p.locator('#popup-offer [data-close]').click(); await p.waitForTimeout(800); // close the special-offer pop-up like a player
await p.locator('[data-action="activities"]').first().click();
await p.waitForSelector('#daily-claim', { state: 'visible' });
const n = async () => p.evaluate(() => document.querySelectorAll('#daily-grid .check').length);
console.log('before claim: checks =', await n(), '| button =', await p.locator('#daily-claim span').innerText());
await p.screenshot({ path: out + '-1-before.png' });
await p.locator('#daily-claim').click();
await p.waitForTimeout(600);
console.log('after claim: checks =', await n(), '| button =', await p.locator('#daily-claim span').innerText(),
  '| claimed cards =', await p.evaluate(() => document.querySelectorAll('#daily-grid .claimed').length));
console.log('saved daily =', await p.evaluate(() => JSON.stringify(Object.entries(localStorage).filter(([k]) => k === 'pixelswarm.save.v1').map(([k, v]) => { try { return [k, (JSON.parse(v).data||{}).daily]; } catch { return null; } }).filter(x => x && x[1]))));
await p.screenshot({ path: out + '-2-after.png' });
await p.keyboard.press('Escape'); await p.reload(); await p.waitForTimeout(4000);
await p.locator('[data-action="activities"]').first().click();
await p.waitForSelector('#daily-claim', { state: 'visible' });
console.log('after reload+reopen: checks =', await n(), '| button =', await p.locator('#daily-claim span').innerText());
await p.screenshot({ path: out + '-3-reopen.png' });
if (errs.length) console.log('page errors:', errs);
await b.close();
