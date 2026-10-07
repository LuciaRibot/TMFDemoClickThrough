// PHASE B3 — the other direction. TMF asks the client for a document, the
// client supplies it, TMF accepts it. Real writes throughout.
import { Capture, SITES, settle, settleSlow } from './engine.mjs';
import path from 'node:path';

const C5 = 'Requesting documents';
const FIXTURE = path.join(new URL('.', import.meta.url).pathname, 'fixtures', 'payroll-variation-form-iberia.pdf');
const DOC = 'Payroll variation form';

const cap = new Capture({ headless: true, only: process.env.ONLY ? new Set(process.env.ONLY.split(',').map(Number)) : null });
await cap.open();
const P = () => cap.page;
const top = async (page) => { await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500); };

/** Pick an option from the nth Appian dropdown inside the open dialog. */
async function pick(nth, labelRe) {
  const combo = P().locator('[role=dialog] [role=combobox]').nth(nth);
  await combo.click();
  await P().waitForTimeout(1100);
  const opt = P().locator('[role=option]').filter({ hasText: labelRe }).first();
  if (!(await opt.count())) throw new Error(`no dropdown option matching ${labelRe}`);
  await opt.click();
  await settle(P(), 2000);
}
const nextBtn = () => P().locator('[role=dialog]').getByRole('button', { name: /^NEXT$/i }).first();

try {
  await cap.as('daniel', `${SITES.internal}/page/documents`);

  await cap.step({
    id: 59, chapter: C5, title: 'Now TMF needs something',
    body: 'Daniel is working the Spanish payroll variance and needs the authorising form from Meridian Iberia. He asks for it from the same workspace.',
    say: 'Same relationship, opposite direction. Watch where it lands.',
    before: top, action: 'click', settle: 2800, slow: true, slowMs: 3500,
    target: () => P().getByRole('button', { name: /REQUEST A DOCUMENT/i }),
  });

  await cap.step({
    id: 60, chapter: C5, title: 'Who it is for',
    body: 'Three guided steps. The entity list follows the client he picks, so a request cannot be addressed to a mismatched pair.',
    action: 'none', settle: 2200,
    target: () => P().locator('[role=dialog] [role=combobox]').first(),
    after: async () => {
      await pick(0, /Meridian Capital Holdings/i);
      await pick(1, /Meridian Iberia/i);
      await settle(P(), 1400);
    },
  });

  await cap.step({
    id: 61, chapter: C5, title: 'Client and entity chosen',
    body: 'Meridian Capital Holdings, Meridian Iberia S.L. — the Spanish entity the variance sits on.',
    action: 'click', settle: 1600, slow: true, slowMs: 3000,
    target: () => nextBtn(),
  });

  await cap.step({
    id: 62, chapter: C5, title: 'What you need, from the library',
    body: 'Not a free-text ask. He picks from the documents TMF routinely requests, and that choice sets the service line and the reason for him.',
    action: 'none', settle: 2200,
    target: () => P().locator('[role=dialog] [role=combobox]').first(),
    after: async () => {
      await pick(0, /HR and payroll/i);
      await pick(1, new RegExp(DOC, 'i'));
      await settle(P(), 1600);
    },
  });

  await cap.step({
    id: 63, chapter: C5, title: 'The library explains itself',
    body: '“Usually needed because: authorises a change to pay or benefits. Routes to HR & Payroll.” The routing is derived, not typed.',
    say: 'This is why the request cannot be mis-addressed — the library carries the rules.',
    action: 'click', settle: 2000, slow: true, slowMs: 3000,
    target: () => nextBtn(),
  });

  await cap.step({
    id: 64, chapter: C5, title: 'When, and why',
    body: 'A due date and a reason the client reads verbatim. The reason arrives prefilled from the library and he sharpens it for this case.',
    action: 'type',
    text: 'Needed to close REQ-4788, the Spanish payroll variance. This form authorises the corrected shift allowance rate and the back-payment for the four affected staff.',
    target: () => P().locator('[role=dialog] textarea').first(),
    before: async (page) => {
      const date = page.locator('[role=dialog] input[placeholder="mm/dd/yyyy"]').first();
      if (await date.count()) { await date.fill('10/21/2026'); await date.blur(); await settle(page, 1600); }
    },
    after: async (page) => { await page.locator('[role=dialog] textarea').first().blur(); await settle(page, 2000); },
  });

  await cap.step({
    id: 65, chapter: C5, title: 'Send it',
    body: 'It does not become an email. It becomes a row in her own document workspace, with a due date against it.',
    action: process.env.NOWRITE ? 'none' : 'click', slow: true, slowMs: 10000,
    target: () => P().locator('[role=dialog]').getByRole('button', { name: /SEND REQUEST/i }),
  });

  /* ---------------- the client supplies it ---------------- */
  await cap.as('sofia', `${SITES.portal}/page/documents`);

  await cap.step({
    id: 66, chapter: C5, title: 'It is waiting for her',
    body: 'The form sits in her workspace marked Requested, with the date and the reason Daniel gave. Nothing to find in an inbox.',
    before: async (page) => {
      await settle(page, 3000);
      await page.locator('input[placeholder*="Search across all four"]').fill(DOC);
      await settle(page, 2600);
      const row = page.getByText(new RegExp(DOC, 'i')).first();
      if (await row.count()) { await row.click(); await settle(page, 2800); }
    },
    action: 'none', settle: 2000,
    target: () => P().getByText(new RegExp(DOC, 'i')).first(),
  });

  await cap.step({
    id: 67, chapter: C5, title: 'She uploads it',
    body: 'The action only appears on a document TMF has asked for and she has not yet supplied — so it is never offered where it would make no sense.',
    action: 'click', settle: 2000, slow: true, slowMs: 3500,
    target: () => P().getByRole('button', { name: /Upload the requested document/i }),
  });

  await cap.step({
    id: 68, chapter: C5, title: 'Attached to the existing request',
    body: 'It attaches to the request Daniel raised rather than creating a second, unrelated document. One thing, tracked once.',
    action: 'none', settle: 2200,
    target: () => P().locator('[role=dialog]').first(),
    after: async (page) => {
      const input = page.locator('[role=dialog] input[type=file]').first();
      if (await input.count()) {
        await input.setInputFiles(FIXTURE);
        await settleSlow(page, 9000);
      } else {
        console.log('   (no file input found in the dialog)');
      }
    },
  });

  await cap.step({
    id: 69, chapter: C5, title: 'Sent back to TMF',
    body: 'Submitting moves the document to Received and tells the service team. Her part is done.',
    action: process.env.NOWRITE ? 'none' : 'click', slow: true, slowMs: 11000,
    target: () => P().locator('[role=dialog]').getByRole('button', { name: /^(CONFIRM|SUBMIT|UPLOAD|SEND)/i }).first(),
  });

  /* ---------------- TMF accepts it ---------------- */
  await cap.as('daniel', `${SITES.internal}/page/documents`);

  await cap.step({
    id: 70, chapter: C5, title: 'And TMF closes the loop',
    body: 'It is back on Daniel’s side marked Received, waiting for him. The exchange has never left the portal.',
    before: async (page) => {
      await settle(page, 3000);
      await page.locator('input[placeholder*="Search across all four"]').fill(DOC);
      await settle(page, 2600);
      const row = page.getByText(new RegExp(DOC, 'i')).first();
      if (await row.count()) { await row.click(); await settle(page, 2800); }
    },
    action: 'none', settle: 2200,
    target: () => P().getByRole('button', { name: /Review and accept/i }),
  });

  await cap.step({
    id: 71, chapter: C5, title: 'The AI has already read it',
    body: 'Accepting shows the fields DocCenter classified and extracted on upload, with anything below the confidence threshold held for a human.',
    say: 'This is Appian DocCenter. Nothing below 0.90 is auto-accepted — it waits for someone.',
    action: 'click', settle: 2600, slow: true, slowMs: 5000,
    target: () => P().getByRole('button', { name: /Review and accept/i }),
  });

  await cap.step({
    id: 72, chapter: C5, title: 'Filed, and the client is told',
    body: 'Accepting files it against Meridian’s records and notifies Sofia. She is not asked to review her own document — that would be circular.',
    action: 'none', settle: 2200,
    target: () => P().locator('[role=dialog]').first(),
  });
} finally {
  cap.save('b3');
  await cap.close();
}
