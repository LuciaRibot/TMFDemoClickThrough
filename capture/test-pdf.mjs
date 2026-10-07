import { chromium } from 'playwright';
import { login, settle, SITES } from './lib.mjs';
for (const opts of [{channel:'chrome', tag:'chrome'}, {tag:'bundled'}]) {
  let b;
  try {
    b = await chromium.launch({ headless: true, channel: opts.channel });
  } catch (e) { console.log(opts.tag, 'launch failed:', e.message.split('\n')[0]); continue; }
  const c = await b.newContext({ viewport:{width:1440,height:900} });
  const p = await c.newPage(); p.setDefaultTimeout(30000);
  await login(c, p, 'sofia', `${SITES.portal}/page/documents`);
  await settle(p, 2800);
  await p.locator('input[placeholder*="Search across all four"]').fill('INV-2026-0388');
  await settle(p, 2400);
  await p.getByText('INV-2026-0388',{exact:false}).first().click();
  await settle(p, 3600);
  const info = await p.evaluate(() => ({
    embeds: [...document.querySelectorAll('embed,object,iframe')].map(e => ({t:e.tagName, src:(e.src||e.data||'').slice(0,80)})),
  }));
  console.log(opts.tag, JSON.stringify(info));
  await p.screenshot({ path: `recon/pdf-${opts.tag}.png` });
  await b.close();
}
