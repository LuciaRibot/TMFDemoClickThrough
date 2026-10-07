// Focused recon of the Administration page: its tab strip and the Demo controls.
import { chromium } from 'playwright';
import { login, settle, SITES, ensureDir } from './lib.mjs';
import fs from 'node:fs';

const OUT = new URL('../recon/', import.meta.url).pathname;
ensureDir(OUT);

async function dump(page, tag) {
  const d = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
    const take = (sel) => [...document.querySelectorAll(sel)].filter(vis)
      .map((el) => (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' '))
      .filter((t) => t && t.length < 160);
    return {
      url: location.href,
      headings: [...new Set(take('h1,h2,h3,[role=heading]'))].slice(0, 40),
      buttons: [...new Set(take('button,[role=button],input[type=submit]'))].slice(0, 60),
      links: [...new Set(take('a'))].slice(0, 60),
      tabs: [...new Set(take('[role=tab],[role=tablist] *'))].slice(0, 30),
      body: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 2600),
    };
  });
  fs.writeFileSync(`${OUT}${tag}.json`, JSON.stringify(d, null, 2));
  await page.screenshot({ path: `${OUT}${tag}.png` });
  console.log(`\n##### ${tag}`);
  console.log('H   :', d.headings.slice(0, 14).join(' | '));
  console.log('TAB :', d.tabs.join(' | '));
  console.log('BTN :', d.buttons.slice(0, 22).join(' | '));
  console.log('LNK :', d.links.slice(0, 22).join(' | '));
  console.log('TXT :', d.body.slice(0, 1500));
  return d;
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

await login(ctx, page, 'lucia', SITES.admin);
await settle(page, 2600);
await dump(page, 'lucia-admin-landing');

// The tab strip is an a!tabLayout; find whatever is clickable and looks like a tab.
const tabNames = ['Application catalogue', 'Clients & identity', 'Security & audit', 'Demo controls'];
for (const name of tabNames) {
  try {
    let loc = page.getByRole('tab', { name, exact: false }).first();
    if (!(await loc.count())) loc = page.getByText(name, { exact: false }).first();
    if (!(await loc.count())) { console.log(`  tab "${name}" not found`); continue; }
    await loc.click({ timeout: 10000 });
    await settle(page, 2400);
    await dump(page, `lucia-admin-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
  } catch (e) { console.log(`  tab "${name}" FAILED: ${e.message.split('\n')[0]}`); }
}
await browser.close();
