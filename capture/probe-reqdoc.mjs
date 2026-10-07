// Probe Daniel's "Request a document" wizard, step by step. Read-only: it
// walks forward to read the fields, then abandons without sending.
import { chromium } from 'playwright';
import { login, settle, SITES } from './lib.mjs';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

const dump = async (tag) => {
  const d = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
    const dlg = document.querySelector('[role=dialog]') || document.body;
    return {
      text: (dlg.innerText || '').replace(/\s+/g, ' ').slice(0, 1100),
      buttons: [...new Set([...dlg.querySelectorAll('button,[role=button]')].filter(vis)
        .map((e) => (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).filter((t) => t && t.length < 50))],
      fields: [...dlg.querySelectorAll('input,textarea,select,[role=combobox]')].filter(vis)
        .map((e) => ({ tag: e.tagName, role: e.getAttribute('role') || '', type: e.type || '', ph: e.placeholder || '', al: e.getAttribute('aria-label') || '' })),
      labels: [...new Set([...dlg.querySelectorAll('label')].filter(vis).map((e) => e.innerText.trim().replace(/\s+/g, ' ')))],
    };
  });
  console.log(`\n### ${tag}`);
  console.log('text   :', d.text);
  console.log('buttons:', d.buttons.join(' | '));
  console.log('fields :', JSON.stringify(d.fields));
  console.log('labels :', d.labels.join(' | '));
  await page.screenshot({ path: new URL(`../recon/reqdoc-${tag}.png`, import.meta.url).pathname });
};

await login(ctx, page, 'daniel', `${SITES.internal}/page/documents`);
await settle(page, 3000);
const btn = page.getByRole('button', { name: /REQUEST A DOCUMENT/i }).first();
console.log('REQUEST A DOCUMENT count:', await btn.count());
await btn.click();
await settle(page, 3000);
await dump('step1');

// Walk forward as far as the defaults allow, reading each panel.
for (const n of [2, 3]) {
  const next = page.locator('[role=dialog]').getByRole('button', { name: /^NEXT$/i }).first();
  if (!(await next.count())) { console.log(`\n(no NEXT for step ${n})`); break; }
  if (await next.isDisabled().catch(() => false)) { console.log(`\n(NEXT disabled at step ${n - 1} — needs input first)`); break; }
  await next.click();
  await settle(page, 2600);
  await dump(`step${n}`);
}
await browser.close();
