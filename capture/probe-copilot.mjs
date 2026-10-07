// Probe the copilot bar: how it expands, where the input is, how answers land.
import { chromium } from 'playwright';
import { login, settle, settleSlow, SITES } from './lib.mjs';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);
await login(ctx, page, 'sofia', SITES.portal);
await settle(page, 2500);

const snap = async (tag) => {
  const d = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
    return {
      inputs: [...document.querySelectorAll('input,textarea')].filter(vis).map((el) => ({
        tag: el.tagName, type: el.type || '', ph: el.placeholder || '',
        al: el.getAttribute('aria-label') || '', id: el.id || '',
      })),
      buttons: [...new Set([...document.querySelectorAll('button,[role=button],a')].filter(vis)
        .map((el) => (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).filter((t) => t && t.length < 60))],
      iframes: [...document.querySelectorAll('iframe')].map((f) => ({ src: (f.src || '').slice(0, 120), title: f.title || '' })),
      copilotText: (() => {
        const el = [...document.querySelectorAll('*')].find((e) => /Ask TMF/i.test(e.textContent || '') && e.children.length < 8);
        return el ? (el.innerText || '').replace(/\s+/g, ' ').slice(0, 400) : null;
      })(),
      bodyTail: (document.body.innerText || '').replace(/\s+/g, ' ').slice(-1400),
    };
  });
  console.log(`\n### ${tag}`);
  console.log('frames   :', page.frames().length, page.frames().map((f) => f.url().slice(0, 70)));
  console.log('iframes  :', JSON.stringify(d.iframes));
  console.log('inputs   :', JSON.stringify(d.inputs));
  console.log('buttons  :', d.buttons.slice(0, 30).join(' | '));
  console.log('copilot  :', d.copilotText);
  console.log('bodyTail :', d.bodyTail.slice(-700));
  await page.screenshot({ path: new URL(`../recon/copilot-${tag}.png`, import.meta.url).pathname });
};

await snap('before');

// Expand it.
const ask = page.getByRole('link', { name: /^ASK$/i }).first();
console.log('\nASK link count:', await ask.count());
await ask.click();
await settle(page, 2600);
await snap('expanded');

// Ask something cheap and see where the answer renders.
const ta = page.locator('textarea').last();
if (await ta.count()) {
  await ta.click();
  await ta.fill('What do I have access to?');
  await settle(page, 600);
  await snap('typed');
  await ta.press('Enter');
  console.log('\n--- waiting for the agent ---');
  await settleSlow(page, 16000);
  await snap('answered');
} else {
  console.log('NO TEXTAREA FOUND');
}
await browser.close();
