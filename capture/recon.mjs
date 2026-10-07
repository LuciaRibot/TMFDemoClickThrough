// Reconnaissance: log in as each persona, dump what is actually on screen so
// the capture script can use real accessible names instead of guesses.
import { chromium } from 'playwright';
import { login, settle, SITES, ensureDir } from './lib.mjs';
import fs from 'node:fs';

const OUT = new URL('../recon/', import.meta.url).pathname;
ensureDir(OUT);

async function dump(page, tag) {
  const data = await page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden';
    };
    const take = (sel) => [...document.querySelectorAll(sel)]
      .filter(vis)
      .map((el) => (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' '))
      .filter((t) => t && t.length < 120);
    return {
      title: document.title,
      url: location.href,
      headings: take('h1,h2,h3,[role=heading]').slice(0, 60),
      links: [...new Set(take('a'))].slice(0, 80),
      buttons: [...new Set(take('button,[role=button],input[type=button],input[type=submit]'))].slice(0, 80),
      tabs: [...new Set(take('[role=tab]'))].slice(0, 30),
      inputs: [...document.querySelectorAll('input,textarea,select')].filter(vis)
        .map((el) => ({ type: el.type || el.tagName, name: el.name || '', ph: el.placeholder || '', al: el.getAttribute('aria-label') || '' }))
        .slice(0, 40),
      bodyStart: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 1500),
    };
  });
  fs.writeFileSync(`${OUT}${tag}.json`, JSON.stringify(data, null, 2));
  await page.screenshot({ path: `${OUT}${tag}.png`, fullPage: false });
  console.log(`\n===== ${tag} =====`);
  console.log('URL      :', data.url);
  console.log('headings :', data.headings.slice(0, 14).join(' | '));
  console.log('tabs     :', data.tabs.join(' | '));
  console.log('buttons  :', data.buttons.slice(0, 26).join(' | '));
  console.log('links    :', data.links.slice(0, 26).join(' | '));
  console.log('body     :', data.bodyStart.slice(0, 500));
  return data;
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

const who = process.argv[2] || 'sofia';
const target = { sofia: SITES.portal, daniel: SITES.internal, lucia: SITES.admin }[who];

try {
  await login(ctx, page, who, target);
  await settle(page, 2500);
  await dump(page, `${who}-landing`);

  // Walk the site's own navigation tabs and dump each.
  const navNames = await page.locator('[role=tab], nav a, [class*="SiteNav"] a').allInnerTexts().catch(() => []);
  const names = [...new Set(navNames.map((t) => t.trim()).filter((t) => t && t.length < 30))];
  console.log('\nNAV CANDIDATES:', names.join(' | '));
  for (const n of names.slice(0, 8)) {
    try {
      const loc = page.getByRole('link', { name: n, exact: true }).first();
      if (!(await loc.count())) continue;
      await loc.click({ timeout: 8000 });
      await settle(page, 2200);
      await dump(page, `${who}-nav-${n.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
    } catch (e) { console.log(`  nav ${n}: ${e.message.split('\n')[0]}`); }
  }
} catch (e) {
  console.error('RECON FAILED:', e.message);
  await page.screenshot({ path: `${OUT}${who}-FAIL.png` }).catch(() => {});
} finally {
  await browser.close();
}
