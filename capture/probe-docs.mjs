// Probe the Documents workspace: selecting an invoice, the action buttons it
// reveals, and the Raise billing query dialog. Read-only — it cancels out.
import { chromium } from 'playwright';
import { login, settle, SITES } from './lib.mjs';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

const dump = async (tag) => {
  const d = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
    const dlg = document.querySelector('[role=dialog]');
    const scope = dlg || document.body;
    return {
      hasDialog: !!dlg,
      dialogText: dlg ? (dlg.innerText || '').replace(/\s+/g, ' ').slice(0, 900) : null,
      buttons: [...new Set([...scope.querySelectorAll('button,[role=button],a')].filter(vis)
        .map((e) => (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).filter((t) => t && t.length < 70))].slice(0, 40),
      inputs: [...scope.querySelectorAll('input,textarea,select')].filter(vis)
        .map((e) => ({ tag: e.tagName, type: e.type || '', ph: e.placeholder || '', al: e.getAttribute('aria-label') || '' })),
      labels: [...new Set([...scope.querySelectorAll('label')].filter(vis).map((e) => e.innerText.trim().replace(/\s+/g, ' ')))].slice(0, 25),
    };
  });
  console.log(`\n### ${tag}`);
  console.log('dialog? ', d.hasDialog);
  if (d.dialogText) console.log('dlgTxt :', d.dialogText);
  console.log('buttons:', d.buttons.join(' | '));
  console.log('inputs :', JSON.stringify(d.inputs));
  console.log('labels :', d.labels.join(' | '));
  await page.screenshot({ path: new URL(`../recon/docs-${tag}.png`, import.meta.url).pathname });
};

await login(ctx, page, 'sofia', `${SITES.portal}/page/documents`);
await settle(page, 2800);
await dump('landing');

// Pick the February invoice — the clean one, with no existing query.
const row = page.getByText('INV-2026-0388', { exact: false }).first();
console.log('\nINV-2026-0388 found:', await row.count());
await row.click();
await settle(page, 2600);
await dump('selected-0388');

const raise = page.getByRole('button', { name: /RAISE BILLING QUERY/i }).first();
console.log('\nRAISE BILLING QUERY count:', await raise.count());
if (await raise.count()) {
  await raise.click();
  await settle(page, 2800);
  await dump('dialog-open');
  // Leave without writing anything.
  const cancel = page.locator('[role=dialog]').getByRole('button', { name: /^(cancel|close)$/i }).first();
  if (await cancel.count()) { await cancel.click(); console.log('cancelled'); }
}
await browser.close();
