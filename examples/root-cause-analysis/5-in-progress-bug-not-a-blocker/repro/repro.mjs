// usage: node repro.mjs <label> [port]   (app must already run on the port)
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const label = process.argv[2] ?? 'run';
const port = process.argv[3] ?? '5541';
const out = new URL('../evidence/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const b = await chromium.launch({ channel: 'msedge' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();
await page.goto(`http://localhost:${port}/#/releases`);
await page.evaluate(() => localStorage.clear());
await page.goto(`http://localhost:${port}/#/releases`);
await page.reload();
await page.waitForTimeout(500);
// open release 0.8.4 (Orbit Garden) with a real click
await page.locator('.page-head select').selectOption({ label: '0.8.4 (Hotfix) · hotfix' });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}${label}-1-release.png` });
const callout = await page.locator('text=/critical bugs? unresolved/').first().textContent().catch(() => 'NO CALLOUT');
console.log(`[${label}] release callout:`, callout);
// Triage: Critical + Any status, then default
await page.getByRole('link', { name: /triage/i }).first().click();
await page.waitForTimeout(300);
await page.locator('#f-sev').selectOption('critical'); await page.waitForTimeout(400);
const defRows = await page.locator('tbody tr').allTextContents();
console.log(`[${label}] Triage critical + default (Open + in progress) rows:`, defRows.filter(r=>/CP-10[49]/.test(r)).map(r=>r.slice(0,95)));
await page.screenshot({ path: `${out}${label}-2-triage-default.png` });
await page.locator('#f-status').selectOption('all'); await page.waitForTimeout(400);
const allRows = await page.locator('tbody tr').allTextContents();
console.log(`[${label}] Triage critical + Any status CP-104/109:`, allRows.filter(r=>/CP-10[49]/.test(r)).map(r=>r.slice(0,95)));
await page.screenshot({ path: `${out}${label}-3-triage-any.png` });
await b.close();
