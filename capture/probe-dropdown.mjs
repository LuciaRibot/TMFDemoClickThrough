// Work out how to drive an Appian dropdown (div[role=combobox]) and then
// walk the Request-a-document wizard properly. Abandons without sending.
import { chromium } from 'playwright';
import { login, settle, SITES } from './lib.mjs';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

/** Pick `label` from the nth combobox inside the dialog. */
async function pick(nth, labelRe) {
  const combo = page.locator('[role=dialog] [role=combobox]').nth(nth);
  await combo.click();
  await page.waitForTimeout(1200);
  const opts = await page.locator('[role=option]').allInnerTexts().catch(() => []);
  console.log(`  combobox ${nth} options:`, JSON.stringify(opts.slice(0, 14)));
  const opt = page.locator('[role=option]').filter({ hasText: labelRe }).first();
  if (!(await opt.count())) { console.log(`  !! no option matching ${labelRe}`); return false; }
  await opt.click();
  await settle(page, 2200);
  return true;
}

await login(ctx, page, 'daniel', `${SITES.internal}/page/documents`);
await settle(page, 3000);
await page.getByRole('button', { name: /REQUEST A DOCUMENT/i }).first().click();
await settle(page, 3000);

console.log('--- step 1 ---');
await pick(0, /Meridian Capital Holdings/i);
await pick(1, /Meridian Iberia/i);
await page.screenshot({ path: new URL('../recon/dd-step1-filled.png', import.meta.url).pathname });

const next = () => page.locator('[role=dialog]').getByRole('button', { name: /^NEXT$/i }).first();
await next().click();
await settle(page, 2600);

const dump = async (tag) => {
  const d = await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]') || document.body;
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
    return {
      text: (dlg.innerText || '').replace(/\s+/g, ' ').slice(0, 900),
      combos: [...dlg.querySelectorAll('[role=combobox]')].filter(vis).length,
      fields: [...dlg.querySelectorAll('input,textarea')].filter(vis).map((e) => ({ t: e.tagName, type: e.type, ph: e.placeholder || '' })),
      buttons: [...new Set([...dlg.querySelectorAll('button')].filter(vis).map((e) => e.innerText.trim()).filter(Boolean))],
    };
  });
  console.log(`\n### ${tag}`);
  console.log('text   :', d.text);
  console.log('combos :', d.combos, '| fields:', JSON.stringify(d.fields));
  console.log('buttons:', d.buttons.join(' | '));
  await page.screenshot({ path: new URL(`../recon/dd-${tag}.png`, import.meta.url).pathname });
};

await dump('step2');
console.log('--- step 2 picks ---');
await pick(0, /HR and payroll|HR & Payroll/i);
await pick(1, /Payroll variation form/i);
await dump('step2-filled');

await next().click();
await settle(page, 2600);
await dump('step3');
await browser.close();
