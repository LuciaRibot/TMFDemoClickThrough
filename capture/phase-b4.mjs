// PHASE B4 — document intelligence, analytics, onboarding, security.
// Read-only throughout except the connection tests, which are real outbound
// HTTP calls that write nothing.
import { Capture, SITES, settle, settleSlow } from './engine.mjs';

const C5 = 'Requesting documents';
const C6 = 'Analytics';
const C7 = 'Onboarding & integration';
const C8 = 'Security & compliance';

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
  /* ------------------ document intelligence, honestly ------------------ */
  await cap.as('daniel', `${SITES.internal}/page/documents`);

  await cap.step({
    id: 73, chapter: C5, title: 'What the AI did on the way in',
    body: 'Documents are classified and their fields extracted on arrival. The hub carries the average confidence, and anything under the threshold is held for a person rather than auto-accepted.',
    say: 'This is Appian DocCenter behind the workspace. The invoice on screen has a value flagged for human review.',
    before: async (page) => {
      await settle(page, 2800);
      await page.locator('input[placeholder*="Search across all four"]').fill('INV-2026-0413');
      await settle(page, 2600);
      const row = page.getByText('INV-2026-0413', { exact: false }).first();
      if (await row.count()) { await row.click(); await settle(page, 2800); }
      await page.evaluate(() => window.scrollTo(0, 0));
    },
    action: 'none', settle: 2000,
    target: () => P().getByText(/AVG EXTRACTION/i).first(),
  });

  await cap.step({
    id: 74, chapter: C5, title: 'And the internal-only controls',
    body: 'Re-run AI extraction and Assign to local specialist are never offered to a client. The same document, a different set of verbs.',
    before: centre('RE-RUN AI EXTRACTION'),
    action: 'none', settle: 1800,
    target: () => P().getByRole('button', { name: /RE-RUN AI EXTRACTION/i }),
  });

  /* ---------------------------- analytics ------------------------------ */
  await cap.step({
    id: 75, chapter: C6, title: 'Daniel’s department, measured',
    body: 'SLA attainment, what sits with his team, what is at risk, and how many clients his line serves — aggregated live, not pasted from a spreadsheet.',
    before: async (page) => { await page.goto(`${SITES.internal}/page/insights`, { waitUntil: 'domcontentloaded' }); await settle(page, 3200); await page.evaluate(() => window.scrollTo(0, 0)); },
    action: 'none', settle: 2400,
    target: () => P().getByText(/DEPARTMENT SLA/i).first(),
  });

  await cap.step({
    id: 76, chapter: C6, title: 'Whose backlog is it',
    body: 'Open work split by client and by who is holding it. Work sitting with a client is not his department’s backlog — and the chart says so.',
    before: centre('Open cases by client'),
    action: 'none', settle: 2000, target: null,
  });

  await cap.step({
    id: 77, chapter: C6, title: 'Analytics that acts',
    body: 'From the bottleneck callout he can raise a pre-emptive document request for every filing due in the next window — one click, one request per client.',
    say: 'Automation acting on the analysis, rather than just reporting it.',
    before: centre('pre-emptive document request'),
    action: 'none', settle: 1800,
    target: () => P().getByText(/pre-emptive document request/i).first(),
  });

  await cap.as('sofia', `${SITES.portal}/page/insights`);

  await cap.step({
    id: 78, chapter: C6, title: 'The same platform, her numbers',
    body: 'TMF’s SLA attainment against her, filings overdue, requests waiting on her, and invoice ageing — her holding structure read live from TMF’s systems of record.',
    before: top, action: 'none', settle: 3000,
    target: () => P().getByText(/TMF SLA ATTAINMENT/i).first(),
  });

  await cap.step({
    id: 79, chapter: C6, title: 'Compliance by jurisdiction',
    body: 'Nine statutory obligations across eight jurisdictions. Anything overdue is a penalty exposure and a good-standing risk, so it leads.',
    before: centre('Filings by jurisdiction'),
    action: 'none', settle: 2000, target: null,
  });

  await cap.step({
    id: 80, chapter: C6, title: 'The number most providers hide',
    body: 'In-flight requests split by where the delay actually sits — with TMF, or with her own team. Publishing that is a statement of confidence.',
    say: 'Say it plainly: “requests waiting on you” is a number most providers will not show a client.',
    before: centre('where the delay sits'),
    action: 'none', settle: 2000, target: null,
  });

  await cap.step({
    id: 81, chapter: C6, title: 'And the BI they already own',
    body: 'The same figures rendered in Power BI, embedded in the portal so an executive never leaves it.',
    say: 'This panel is a placeholder — say “embedded BI drops in here, scoped by the same organisation claim”.',
    before: top,
    action: 'click', settle: 2200, slow: true, slowMs: 5000,
    target: () => P().getByRole('button', { name: /^POWER BI$/i }),
  });

  /* ------------------------ onboarding & integration ------------------- */
  await cap.as('lucia', SITES.admin);

  await cap.step({
    id: 82, chapter: C7, title: 'The connected application catalogue',
    body: 'Six applications, each with a status, a client-access switch and a connection test. Five live, five client-facing.',
    before: top, action: 'none', settle: 2800,
    target: () => P().getByText(/CONNECTED APPLICATIONS/i).first(),
  });

  await cap.step({
    id: 83, chapter: C7, title: 'Test it for real',
    body: 'Not a stored flag. Clicking this makes an outbound HTTP call to the application’s health endpoint, right now.',
    before: centre('Test connection'),
    action: 'click', settle: 1800, slow: true, slowMs: 8000,
    target: () => P().getByRole('link', { name: /Test connection/i }).first(),
  });

  await cap.step({
    id: 84, chapter: C7, title: 'The evidence it returns',
    body: 'The status line, the server’s own Date header and the response body — so Live is a thing the endpoint earned, not a value somebody typed.',
    action: 'none', settle: 2600, target: null,
  });

  await cap.step({
    id: 85, chapter: C7, title: 'Onboard a new one',
    body: 'Registering an application is a guided form: what it is, what it does, who provides it, the SSO launch URL and the health endpoint.',
    before: async (page) => {
      await page.goto(SITES.admin, { waitUntil: 'domcontentloaded' });
      await settle(page, 3000);
      await page.evaluate(() => window.scrollTo(0, 0));
    },
    action: 'click', settle: 2200, slow: true, slowMs: 4000,
    target: () => P().getByRole('button', { name: /ONBOARD NEW APPLICATION/i }),
  });

  await cap.step({
    id: 86, chapter: C7, title: 'SSO metadata and health endpoint',
    body: 'The SSO launch URL is where the portal hands the user off with their federated identity preserved. The health endpoint is what decides Live or Testing.',
    say: 'The wand icon prefills a worked example if you would rather not type on stage.',
    before: async (page) => {
      // Scroll the dialog to the two fields this step is about: they sit below
      // its fold, and the descriptive panel above them is not the point.
      await page.evaluate(() => {
        const dlg = document.querySelector('[role=dialog]');
        if (!dlg) return;
        const el = [...dlg.querySelectorAll('*')]
          .find((e) => /API health endpoint/i.test(e.textContent || '') && e.children.length === 0);
        if (el) el.scrollIntoView({ block: 'center' });
      });
      await page.waitForTimeout(1000);
    },
    action: 'none', settle: 2400,
    // Appian dropdowns carry 1x1 hidden inputs that still satisfy :visible,
    // so point at the field's own label instead.
    target: () => P().locator('[role=dialog]').getByText(/API health endpoint/i).first(),
  });

  /* ----------------------------- security ------------------------------ */
  await cap.step({
    id: 87, chapter: C8, title: 'Six layers, stated as architecture',
    body: 'Identity at the IdP, authorisation in Appian, record-level security through data fabric, OAuth to partner platforms, AES-256 at rest with EU residency, and full audit logging.',
    before: async (page) => {
      const close = page.locator('[role=dialog]').getByRole('button', { name: /close/i }).first();
      if (await close.count()) { await close.click().catch(() => {}); await settle(page, 1600); }
      await page.getByRole('tab', { name: /Security & audit/i }).first().click();
      await settle(page, 2800);
      await page.evaluate(() => window.scrollTo(0, 0));
    },
    action: 'none', settle: 2200,
    target: () => P().getByText(/Security layers in force/i).first(),
  });

  await cap.step({
    id: 88, chapter: C8, title: 'Audit history, with the actor named',
    body: 'Every authentication, permission change, document access and AI interaction — who, what and when, exportable.',
    before: centre('Audit history'),
    action: 'none', settle: 2000, target: null,
  });

  await cap.step({
    id: 89, chapter: C8, title: 'Streamed to the SIEM they run',
    body: 'Authentication, authorisation, document access and administrative events forward to Microsoft Sentinel over a standard integration — last batch and today’s count on screen.',
    before: centre('SIEM forwarding'),
    action: 'none', settle: 1800, target: null,
  });
} finally {
  cap.save('b4');
  await cap.close();
}
