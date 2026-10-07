// PHASE B2 — the internal half of the Scenario 3 spine.
// Daniel finds the case Sofia just raised, sees everything she could not,
// answers her in the thread and closes it. The resolve is a real write.
import { Capture, SITES, settle, settleSlow } from './engine.mjs';

const C4 = 'Documents & invoices';
const CASE = 'Billing query';

const cap = new Capture({ headless: true, only: process.env.ONLY ? new Set(process.env.ONLY.split(',').map(Number)) : null });
await cap.open();
const P = () => cap.page;
const top = async (page) => { await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500); };
const centre = (re) => async (page) => {
  await page.evaluate((src) => {
    const rx = new RegExp(src, 'i');
    const el = [...document.querySelectorAll('*')].find((e) => rx.test((e.textContent || '').trim()) && e.children.length === 0);
    if (el) el.scrollIntoView({ block: 'center' });
  }, re);
  await page.waitForTimeout(900);
};

try {
  await cap.as('daniel', `${SITES.internal}/page/home`);

  await cap.step({
    id: 42, chapter: C4, title: 'The other side of the desk',
    body: 'Daniel runs HR & Payroll for TMF. His home is a worklist across every client on his line, worst first — and cases sitting with a client are marked, because those are not his to clear.',
    say: 'Same platform. A completely different job.',
    before: top, action: 'none', settle: 2800,
    target: () => P().getByText('WITH YOUR TEAM', { exact: false }).first(),
  });

  await cap.step({
    id: 43, chapter: C4, title: 'Scope beyond his own line',
    body: 'Sofia’s query routed to Tax & Accounting — the invoice’s service line, not his. One toggle widens the queue to every line.',
    before: async (page) => { await page.goto(`${SITES.internal}/page/my-requests`, { waitUntil: 'domcontentloaded' }); await settle(page, 3000); },
    action: 'click', settle: 2200,
    target: () => P().getByRole('button', { name: /ALL SERVICE LINES/i }),
  });

  await cap.step({
    id: 44, chapter: C4, title: 'Find it by name',
    body: 'The same search the client has, over reference, title, entity and service line.',
    action: 'type', text: CASE,
    target: () => P().locator('input[placeholder*="Search requests"]'),
    after: async (page) => { await settle(page, 2600); },
  });

  await cap.step({
    id: 45, chapter: C4, title: 'Her case, on his screen',
    body: 'He selects it and the detail pane fills — the same record object she is looking at, not a copy that has to be kept in step.',
    action: 'click', settle: 2000,
    target: () => P().getByText(/Billing query — INV-2026-0388/i).first(),
  });

  await cap.step({
    id: 46, chapter: C4, title: 'Open the full case record',
    body: 'From the queue into the record itself, where the internal view lives.',
    action: 'click', settle: 2400, slow: true, slowMs: 3500,
    target: () => P().getByRole('link', { name: /Open the full case record/i }),
  });

  await cap.step({
    id: 47, chapter: C4, title: 'Above the fold, identical',
    body: 'Same reference, same SLA, same conversation — with Sofia’s wording intact. Nothing has been retyped or summarised between them.',
    before: top, action: 'none', settle: 2600,
    target: () => P().getByText('PROGRESS', { exact: false }).first(),
  });

  await cap.step({
    id: 48, chapter: C4, title: 'And then the part she cannot see',
    body: 'View Full Details is internal-only. It is the line between what the client is trusted with and what TMF works with.',
    say: 'This link does not exist on her screen. That is the whole governance story in one control.',
    action: 'click', settle: 2200, slow: true, slowMs: 3000,
    target: () => P().getByRole('link', { name: /View Full Details/i }),
  });

  await cap.step({
    id: 49, chapter: C4, title: 'The process timeline',
    body: 'Every step the case has been through, who holds the current one, and what it is waiting on — live, not a status someone typed.',
    before: centre('Process timeline'),
    action: 'none', settle: 2000, target: null,
  });

  await cap.step({
    id: 50, chapter: C4, title: 'The approval chain, with jurisdictions',
    body: 'Each approver, their jurisdiction and whether the step is internal or client-facing. This is what an auditor asks for.',
    before: centre('Approvals'),
    action: 'none', settle: 1800, target: null,
  });

  await cap.step({
    id: 51, chapter: C4, title: 'And the audit trail',
    body: 'Every action, human or automated, with the actor named and timestamped. Exportable, and the same source the SIEM feed reads.',
    before: centre('Audit trail'),
    action: 'none', settle: 1800, target: null,
  });

  await cap.step({
    id: 52, chapter: C4, title: 'He answers her, in the case',
    body: 'Not an email. The reply is written against the case, so it survives handovers and stays on the record.',
    before: centre('Conversation'),
    action: 'type',
    text: 'Reviewed against clause 7.2 of the MSA. The advisory line was billed in error — EUR 4,200 is being credited and a corrected invoice follows this week. Apologies for the variance.',
    target: () => P().locator('textarea[placeholder*="Reply to the client"]'),
    after: async (page) => {
      await page.locator('textarea[placeholder*="Reply to the client"]').blur();
      await settle(page, 2600);
    },
  });

  await cap.step({
    id: 53, chapter: C4, title: 'Posted to the thread',
    body: 'It lands on the case and, because the case came from a document, under the invoice in her workspace too. One thread, two places to read it.',
    action: 'click', slow: true, slowMs: 6000,
    target: () => P().getByRole('button', { name: /POST COMMENT/i }),
  });

  await cap.step({
    id: 54, chapter: C4, title: 'Now he closes it',
    body: 'The resolution is required — a close with no explanation is not a resolution. The client reads this text verbatim.',
    before: centre('Resolve this'),
    action: 'type',
    text: 'Credit note CN-2026-0119 raised for EUR 4,200 against INV-2026-0388. The advisory line was outside the agreed scope under clause 7.2 and should not have been billed. No action needed from you.',
    target: () => P().locator('textarea[placeholder*="What was found"]'),
    after: async (page) => {
      await page.locator('textarea[placeholder*="What was found"]').blur();
      await settle(page, 2600);
    },
  });

  await cap.step({
    id: 55, chapter: C4, title: 'One action, six things',
    body: 'Closing advances the tracker, writes the audit line, posts the resolution into the thread, releases the invoice and notifies Sofia — in a single write.',
    say: 'Everything the task email could do, done on the case the client is already looking at.',
    action: process.env.NOWRITE ? 'none' : 'click', slow: true, slowMs: 11000,
    target: () => P().getByRole('button', { name: /RESOLVE AND CLOSE/i }),
  });

  await cap.step({
    id: 56, chapter: C4, title: 'Closed, and evidenced',
    body: 'The case reads Complete, the tracker has advanced and the close is on the audit trail with Daniel’s name against it.',
    before: async (page) => { await page.reload({ waitUntil: 'domcontentloaded' }); await settle(page, 3400); await page.evaluate(() => window.scrollTo(0, 0)); },
    action: 'none', settle: 2400, target: null,
  });

  /* ---- back to the client, to see what she got ---- */
  await cap.as('sofia', `${SITES.portal}/page/requests`);

  await cap.step({
    id: 57, chapter: C4, title: 'What Sofia sees of all that',
    body: 'Complete, on step three of her tracker, with TMF’s answer in her conversation. None of the internal machinery — just the outcome and the reason.',
    before: async (page) => {
      await settle(page, 3000);
      await page.locator('input[placeholder*="Search requests"]').fill(CASE);
      await settle(page, 2600);
    },
    action: 'none', settle: 2000,
    target: () => P().getByText(/Billing query/i).first(),
  });

  await cap.step({
    id: 58, chapter: C4, title: 'And the invoice is released',
    body: 'INV-2026-0388 is settled again and his answer is under it — the same message, in the place she asked the question.',
    before: async (page) => {
      await page.goto(`${SITES.portal}/page/documents`, { waitUntil: 'domcontentloaded' });
      await settle(page, 3000);
      await page.locator('input[placeholder*="Search across all four"]').fill('INV-2026-0388');
      await settle(page, 2400);
      const row = page.getByText('INV-2026-0388', { exact: false }).first();
      if (await row.count()) { await row.click(); await settle(page, 2800); }
      await page.evaluate(() => window.scrollBy(0, 620));
      await page.waitForTimeout(900);
    },
    action: 'none', settle: 2200, target: null,
  });
} finally {
  cap.save('b2');
  await cap.close();
}
