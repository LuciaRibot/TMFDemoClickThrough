// Probe the real page URLs behind each site nav link, then dump each page.
import { chromium } from 'playwright';
import { login, settle, SITES, ensureDir } from './lib.mjs';
import fs from 'node:fs';

const OUT = new URL('../recon/', import.meta.url).pathname;
ensureDir(OUT);

async function dump(page, tag) {
  const data = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
    const take = (sel) => [...document.querySelectorAll(sel)].filter(vis)
      .map((el) => (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' '))
      .filter((t) => t && t.length < 140);
    return {
      url: location.href,
      headings: [...new Set(take('h1,h2,h3,[role=heading]'))].slice(0, 50),
      buttons: [...new Set(take('button,[role=button],input[type=submit]'))].slice(0, 70),
      links: [...new Set(take('a'))].slice(0, 70),
      inputs: [...document.querySelectorAll('input,textarea,select')].filter(vis)
        .map((el) => ({ tag: el.tagName, type: el.type || '', ph: el.placeholder || '', al: el.getAttribute('aria-label') || '' })).slice(0, 40),
      body: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 2200),
    };
  });
  fs.writeFileSync(`${OUT}${tag}.json`, JSON.stringify(data, null, 2));
  await page.screenshot({ path: `${OUT}${tag}.png` });
  console.log(`\n##### ${tag} :: ${data.url}`);
  console.log('H  :', data.headings.slice(0, 12).join(' | '));
  console.log('BTN:', data.buttons.slice(0, 24).join(' | '));
  console.log('LNK:', data.links.slice(0, 24).join(' | '));
  console.log('IN :', JSON.stringify(data.inputs.slice(0, 10)));
  console.log('TXT:', data.body.slice(0, 1100));
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

const who = process.argv[2] || 'sofia';
const target = { sofia: SITES.portal, daniel: SITES.internal, lucia: SITES.admin }[who];
await login(ctx, page, who, target);
await settle(page, 2000);

// Read the hrefs straight off the nav instead of guessing accessible names.
const hrefs = await page.evaluate(() => [...document.querySelectorAll('a')]
  .map((a) => ({ text: (a.innerText || '').trim(), href: a.getAttribute('href') || '' }))
  .filter((a) => a.href.includes('/sites/') && a.text && a.text.length < 30));
console.log('NAV HREFS:', JSON.stringify(hrefs, null, 1));

const seen = new Set();
for (const { text, href } of hrefs) {
  const url = href.startsWith('http') ? href : `https://cms-2.appiancloud.com${href}`;
  if (seen.has(url)) continue; seen.add(url);
  const tag = `${who}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await settle(page, 2400);
    await dump(page, tag);
  } catch (e) { console.log(`  ${tag} FAILED: ${e.message.split('\n')[0]}`); }
}
await browser.close();
