// Did Marcus's approval actually land? Read the Payroll tile state and the
// admin demo counters rather than trusting a screenshot taken above the fold.
import { chromium } from 'playwright';
import { login, settle, SITES } from './lib.mjs';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

await login(ctx, page, 'sofia', `${SITES.portal}/page/home`);
await settle(page, 3000);
const sofia = await page.evaluate(() => {
  const txt = (document.body.innerText || '').replace(/\s+/g, ' ');
  const m = txt.match(/Payroll Partner Platform[\s\S]{0,400}?(Available|Not subscribed|Requested[^.]*)/i);
  const avail = txt.match(/(\d+)\s*AVAILABLE TO YOU/i);
  const apps = txt.match(/(\d+)\s*applications/i);
  return {
    availableCount: avail ? avail[1] : null,
    appsSubtitle: apps ? apps[1] : null,
    payrollContext: m ? m[0].slice(0, 260) : 'NOT FOUND',
    notifications: (txt.match(/Payroll Partner Platform access[^.]*\./gi) || []).slice(0, 4),
  };
});
console.log('SOFIA:', JSON.stringify(sofia, null, 2));

await login(ctx, page, 'lucia', SITES.admin);
await settle(page, 2600);
await page.getByRole('tab', { name: /Demo controls/i }).first().click();
await settle(page, 2400);
const admin = await page.evaluate(() => {
  const t = (document.body.innerText || '').replace(/\s+/g, ' ');
  const g = (l) => { const m = t.match(new RegExp(`(\\d[\\d,]*)\\s+${l}`, 'i')); return m ? m[1] : null; };
  return {
    accessRequests: g('Access requests raised'),
    notifications: g('Notifications generated'),
    subscriptions: g('Subscriptions granted'),
    clean: /\bClean\./i.test(t),
  };
});
console.log('ADMIN DEMO STATE:', JSON.stringify(admin, null, 2));
await browser.close();
