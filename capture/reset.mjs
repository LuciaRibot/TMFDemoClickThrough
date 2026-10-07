// Reset the demo data as Lucia and verify the three counters came back zero.
// Used before capture (clean slate) and after capture (leave it clean).
import { chromium } from 'playwright';
import { login, settle, settleSlow, readError, SITES } from './lib.mjs';

export async function resetDemoData({ headless = true, tag = 'reset' } = {}) {
  const browser = await chromium.launch({ headless });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(40000);
  const report = { tag, ok: false, before: null, after: null, error: null };
  try {
    await login(ctx, page, 'lucia', SITES.admin);
    await settle(page, 2500);

    await page.getByRole('tab', { name: /Demo controls/i }).first().click();
    await settle(page, 2200);

    const counters = async () => {
      const txt = await page.locator('body').innerText();
      const grab = (label) => {
        const re = new RegExp(`(\\d[\\d,]*)\\s*\\n?\\s*${label}`, 'i');
        const m = txt.replace(/\s+/g, ' ').match(new RegExp(`(\\d[\\d,]*)\\s+${label}`, 'i')) || txt.match(re);
        return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
      };
      return {
        accessRequests: grab('Access requests raised'),
        notifications: grab('Notifications generated'),
        subscriptions: grab('Subscriptions granted'),
        clean: /\bClean\./i.test(txt),
      };
    };

    report.before = await counters();
    console.log(`[${tag}] before:`, JSON.stringify(report.before));

    const btn = page.getByRole('button', { name: /RESET DEMO DATA/i }).first();
    // The button disables itself when there is nothing to clear. Already-clean
    // is the desired end state, so that counts as verified, not as a failure.
    if (await btn.isDisabled().catch(() => false)) {
      const b = report.before;
      if (b.accessRequests === 0 && b.notifications === 0 && b.subscriptions === 0) {
        report.after = b;
        report.ok = true;
        report.skipped = 'already clean — reset button disabled, nothing to clear';
        console.log(`[${tag}] already clean (reset disabled) — VERIFIED CLEAN`);
        return report;
      }
      throw new Error(`reset button disabled but counters are not zero: ${JSON.stringify(b)}`);
    }
    await btn.click();
    await page.waitForTimeout(1200);

    // Appian confirmation dialog, when the action declares one.
    const dlg = page.locator('[role=dialog]');
    if (await dlg.count()) {
      const confirm = dlg.getByRole('button', { name: /^(reset|confirm|yes|ok|reset demo data)$/i }).first();
      if (await confirm.count()) { await confirm.click(); }
      else {
        const any = dlg.locator('button').last();
        if (await any.count()) await any.click();
      }
    }
    await settleSlow(page, 7000);

    const err = await readError(page);
    if (err) throw new Error(`reset surfaced an error: ${err}`);

    // The reset runs a process; re-read rather than trusting the first repaint.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await settle(page, 2500);
    await page.getByRole('tab', { name: /Demo controls/i }).first().click();
    await settle(page, 2600);

    report.after = await counters();
    console.log(`[${tag}] after :`, JSON.stringify(report.after));

    const a = report.after;
    report.ok = a.accessRequests === 0 && a.notifications === 0 && a.subscriptions === 0;
    if (!report.ok) throw new Error(`counters not zero after reset: ${JSON.stringify(a)}`);
    console.log(`[${tag}] VERIFIED CLEAN`);
  } catch (e) {
    report.error = e.message;
    console.error(`[${tag}] FAILED:`, e.message);
    await page.screenshot({ path: new URL(`../recon/${tag}-FAIL.png`, import.meta.url).pathname }).catch(() => {});
  } finally {
    await browser.close();
  }
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await resetDemoData({ tag: process.argv[2] || 'reset' });
  process.exit(r.ok ? 0 : 1);
}
