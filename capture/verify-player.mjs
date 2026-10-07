// Render the built player locally and screenshot the states that matter:
// cover, a hotspot step, a caption step, the chapter rail and the end screen,
// at desktop and phone width, light and dark. Reports console errors.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'recon');
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  const fp = path.join(DIST, u);
  fs.readFile(fp, (e, d) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(fp)] || 'application/octet-stream' });
    res.end(d);
  });
});
await new Promise((r) => server.listen(8099, r));
const URL_ = 'http://localhost:8099/';

const browser = await chromium.launch({ headless: true });
const errors = [];

async function shoot(tag, { width, height, scheme, steps = 0, rail = false, end = false }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: scheme });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${tag}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${tag}] PAGEERROR ${e.message}`));
  await page.goto(URL_, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  if (steps > 0) {
    await page.click('#start');
    await page.waitForTimeout(700);
    for (let k = 1; k < steps; k++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(260); }
    await page.waitForTimeout(700);
  }
  if (rail) { await page.click('#chapBtn'); await page.waitForTimeout(500); }
  if (end) { await page.evaluate(() => { document.getElementById('end').hidden = false; }); await page.waitForTimeout(400); }
  await page.screenshot({ path: path.join(OUT, `player-${tag}.png`) });

  // Horizontal overflow is the classic responsive bug; assert it directly.
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const coverHidden = await page.evaluate(() => {
    const c = document.getElementById('cover');
    return c.hidden ? getComputedStyle(c).display : 'visible';
  });
  console.log(`${tag.padEnd(22)} overflowX=${over}  cover=${coverHidden}`);
  await ctx.close();
}

await shoot('desktop-cover', { width: 1440, height: 900, scheme: 'light' });
await shoot('desktop-hotspot', { width: 1440, height: 900, scheme: 'light', steps: 4 });
await shoot('desktop-caption', { width: 1440, height: 900, scheme: 'light', steps: 14 });
await shoot('desktop-dark', { width: 1440, height: 900, scheme: 'dark', steps: 4 });
await shoot('desktop-rail', { width: 1440, height: 900, scheme: 'dark', steps: 4, rail: true });
await shoot('desktop-end', { width: 1440, height: 900, scheme: 'light', steps: 2, end: true });
await shoot('phone-cover', { width: 390, height: 844, scheme: 'light' });
await shoot('phone-hotspot', { width: 390, height: 844, scheme: 'light', steps: 4 });
await shoot('phone-dark', { width: 390, height: 844, scheme: 'dark', steps: 6 });

await browser.close();
server.close();
console.log('\nconsole errors:', errors.length ? errors : 'none');
