// PHASE B1 — Lucia's administration, then the client half of the Scenario 3
// spine: Sofia searches, opens an invoice and raises a real billing query.
import { Capture, SITES, settle, settleSlow } from './engine.mjs';

const C3 = 'Identity & administration';
const C4 = 'Documents & invoices';

const cap = new Capture({ headless: true, only: process.env.ONLY ? new Set(process.env.ONLY.split(',').map(Number)) : null });
await cap.open();
const P = () => cap.page;
const top = async (page) => { await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500); };
const centre = (text) => async (page) => {
  await page.evaluate((t) => {
    const el = [...document.querySelectorAll('*')].find((e) => (e.textContent || '').trim().startsWith(t) && e.children.length < 4);
    if (el) el.scrollIntoView({ block: 'center' });
  }, text);
  await page.waitForTimeout(900);
};

try {
  /* ============================ CHAPTER 3 — Lucia ======================= */
  await cap.as('lucia', SITES.admin);

  await cap.step({
    id: 25, chapter: C3, title: 'The administrator’s view',
    body: 'Lucia is a TMF access controller. She sees Administration and nothing else — 18 client organisations, 4,286 external users, 23 applications, no open security findings.',
    say: 'Same platform, a third set of rules. She cannot see a single client document.',
    before: top, action: 'none', settle: 2800,
    target: () => P().getByText('CLIENT ORGS', { exact: false }).first(),
  });

  await cap.step({
    id: 26, chapter: C3, title: 'Every client, its own identity provider',
    body: 'Five organisations on screen, each federated to its own IdP — Entra, Okta, Ping, Google. Onboarding state is tracked per client.',
    action: 'click', settle: 2000,
    target: () => P().getByRole('tab', { name: /Clients & identity/i }),
  });

  await cap.step({
    id: 27, chapter: C3, title: 'Federation, per client',
    body: 'Meridian runs Entra ID over OpenID Connect with JIT provisioning, a named delegated administrator, and a second IdP for external advisers routed by URL.',
    say: 'This panel is configuration shown as configuration — the metadata exchange is prepared, not a live round trip.',
    before: centre('Federation setup'),
    action: 'none', settle: 2400, target: null,
  });

  await cap.step({
    id: 28, chapter: C3, title: 'Access reviews, scheduled',
    body: 'Quarterly recertification, a dormant-account sweep and third-party adviser access that expires with the engagement rather than outliving it.',
    before: centre('Access reviews'),
    action: 'none', settle: 1800, target: null,
  });

  /* ======================= CHAPTER 4 — Sofia's half ===================== */
  await cap.as('sofia', `${SITES.portal}/page/documents`);

  await cap.step({
    id: 30, chapter: C4, title: 'Four repositories, one search',
    body: 'SharePoint, OpenText, Box and the Appian Document Centre presented as one workspace. 15 documents in scope, surfaced through integration rather than copied.',
    say: 'She never has to know which repository TMF happens to keep a thing in.',
    before: top, action: 'none', settle: 3000,
    target: () => P().getByText('REPOSITORIES', { exact: false }).first(),
  });

  await cap.step({
    id: 31, chapter: C4, title: 'Search spans all of them',
    body: 'One box across document name, type and entity. Typing filters live, across every repository at once.',
    action: 'type', text: 'INV-2026',
    target: () => P().locator('input[placeholder*="Search across all four"]'),
    after: async (page) => { await settle(page, 2200); },
  });

  await cap.step({
    id: 32, chapter: C4, title: 'Filters a client actually wants',
    body: 'Entity, service line, country, date range, source repository and status — and the result count tells her the scope is hers alone.',
    before: top, action: 'none', settle: 1800,
    target: () => P().getByText('Source repository', { exact: false }).first(),
  });

  await cap.step({
    id: 33, chapter: C4, title: 'Open the February invoice',
    body: 'She picks INV-2026-0388. It previews inside the portal — no download, no second system.',
    before: async (page) => {
      // The result row sits below the filter block; centre it so the hotspot
      // lands on the row the copy names rather than on the filters.
      await page.evaluate(() => {
        const el = [...document.querySelectorAll('*')]
          .find((e) => (e.textContent || '').trim() === 'INV-2026-0388' && e.children.length === 0);
        if (el) el.scrollIntoView({ block: 'center' });
      });
      await page.waitForTimeout(900);
    },
    action: 'click', settle: 1600,
    target: () => P().getByText('INV-2026-0388', { exact: false }).first(),
  });

  await cap.step({
    id: 34, chapter: C4, title: 'Read it and act on it, same screen',
    body: 'The preview sits beside the facts and the two things she can do with it. Raising a query is a click, not an email with an attachment.',
    settle: 2600, action: 'none',
    target: () => P().getByRole('button', { name: /RAISE BILLING QUERY/i }),
  });

  await cap.step({
    id: 35, chapter: C4, title: 'She raises a billing query',
    body: 'The action is only offered on financial documents — raising one against a board resolution would be meaningless, so it is not there.',
    action: 'click', settle: 1400, slow: true, slowMs: 3000,
    target: () => P().getByRole('button', { name: /RAISE BILLING QUERY/i }),
  });

  await cap.step({
    id: 36, chapter: C4, title: 'One field, and what it promises',
    body: 'The dialog states the consequence up front: a governed case with a five working day SLA, linked to this document.',
    action: 'type',
    text: 'This invoice includes an advisory line we did not agree. Clause 7.2 of the MSA caps the quarterly retainer — please review the variance and confirm the correct amount.',
    target: () => P().locator('[role=dialog] textarea'),
    after: async (page) => { await settle(page, 1200); },
  });

  await cap.step({
    id: 37, chapter: C4, title: 'Confirm — and it is in the app',
    body: 'No email leaves the building. The case is raised, the thread is opened against the invoice and TMF is notified in-product.',
    say: 'This is the whole mechanism. There is no inbox in this story.',
    // NOWRITE=1 re-measures this step's hotspot without submitting again,
    // so a re-run never raises a second case.
    action: process.env.NOWRITE ? 'none' : 'click', slow: true, slowMs: 9000,
    target: () => P().locator('[role=dialog]').getByRole('button', { name: /^CONFIRM$/i }),
  });

  await cap.step({
    id: 38, chapter: C4, title: 'The invoice carries its own state',
    body: 'The document now reads Query raised, and the thread she just started hangs off it. The status is the document’s, not a separate ticket’s.',
    before: async (page) => {
      await page.goto(`${SITES.portal}/page/documents`, { waitUntil: 'domcontentloaded' });
      await settle(page, 3000);
      await page.locator('input[placeholder*="Search across all four"]').fill('INV-2026-0388');
      await settle(page, 2400);
      const row = page.getByText('INV-2026-0388', { exact: false }).first();
      if (await row.count()) { await row.click(); await settle(page, 2600); }
      // Centre the detail pane: the status pill and the thread it opened are
      // the point of this step and both sit below the fold otherwise.
      await page.evaluate(() => {
        const el = [...document.querySelectorAll('*')].find((e) => /Query raised/i.test((e.textContent || '').trim()) && e.children.length === 0);
        if (el) el.scrollIntoView({ block: 'center' });
        else window.scrollBy(0, 620);
      });
      await page.waitForTimeout(1000);
    },
    action: 'none', settle: 2200, target: null,
  });

  await cap.step({
    id: 39, chapter: C4, title: 'It is a tracked case now',
    body: 'In her Requests tab the query is a case with a reference, an SLA and an owner — the same object TMF works, not a copy of it.',
    before: async (page) => {
      await page.goto(`${SITES.portal}/page/requests`, { waitUntil: 'domcontentloaded' });
      await settle(page, 3200);
      await page.locator('input[placeholder*="Search requests"]').fill('Billing query');
      await settle(page, 2400);
    },
    action: 'none', settle: 1800,
    target: () => P().getByText(/Billing query/i).first(),
  });

  await cap.step({
    id: 40, chapter: C4, title: 'What the client gets to see',
    body: 'A three-step tracker, the SLA, who holds it, and the conversation. That is the whole of it.',
    before: centre('PROGRESS'),
    action: 'none', settle: 2000,
    target: () => P().getByText('PROGRESS', { exact: false }).first(),
  });

  await cap.caption({
    id: 41, chapter: C4, title: 'And what she does not',
    body: 'No process timeline, no approval chain, no audit trail, no internal status, no View Full Details link. She sees enough to trust it — not TMF’s working.',
    say: 'One case, one record, two audiences. Hold this screen in mind — Daniel’s is next.',
  });
} finally {
  cap.save('b1');
  await cap.close();
}
