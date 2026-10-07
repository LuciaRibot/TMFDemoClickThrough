// PHASE A — Sofia Almeida.
// Chapter 1: the client access journey.  Chapter 2: the AI copilot, ending
// with a real access request raised, which emails Marcus Chen for approval.
import { Capture, SITES, settle, settleSlow } from './engine.mjs';

const C1 = 'Access journey';
const C2 = 'AI copilot';

const cap = new Capture({ headless: true, only: process.env.ONLY ? new Set(process.env.ONLY.split(',').map(Number)) : null });
await cap.open();

const P = () => cap.page;
const scrollTo = (y) => async (page) => { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(700); };
const scrollToSel = (sel, block = 'center') => async (page) => {
  await page.evaluate(([s, b]) => { const el = document.querySelector(s); if (el) el.scrollIntoView({ block: b }); }, [sel, block]);
  await page.waitForTimeout(800);
};
/** Keep the newest copilot turn in frame. */
const scrollChat = async (page) => {
  await page.evaluate(() => {
    const ta = document.querySelector('textarea[aria-label="Chat message input"]');
    // Centre the composer: it is both the typing target and the anchor for the
    // newest answer above it, so this keeps the hotspot and the reply in frame.
    if (ta) ta.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(900);
};
/** Send a copilot message and wait for the agent to finish. */
const ask = (text, waitMs = 22000) => ({
  target: () => P().locator('textarea[aria-label="Chat message input"]'),
  action: 'type',
  text,
  after: async (page) => {
    await page.locator('textarea[aria-label="Chat message input"]').press('Enter');
    await settleSlow(page, waitMs);
    await scrollChat(page);
  },
});

try {
  await cap.as('sofia', SITES.portal);

  /* ---------------------------------------------------------- CHAPTER 1 */
  await cap.step({
    id: 1, chapter: C1, title: 'One front door for the client',
    body: 'Sofia signs in once through Meridian’s own Entra ID and lands on her portal — five applications, 34 entities, 11 jurisdictions. She never created a TMF password.',
    say: 'This is the single front door. Everything behind it is TMF’s existing systems of record.',
    action: 'none', target: null, settle: 2600,
  });

  await cap.step({
    id: 2, chapter: C1, title: 'The band that sets her agenda',
    body: 'Four numbers, chosen so she knows within a second whether today needs her: actions for you, filings due, overdue, open queries.',
    say: 'Not a generic dashboard — her agenda.',
    action: 'none',
    target: () => P().getByText('ACTIONS FOR', { exact: false }).first(),
  });

  await cap.step({
    id: 3, chapter: C1, title: 'Her application catalogue',
    body: 'Every TMF and partner application she holds, reachable with one sign-on. Four read Available.',
    before: scrollToSel('body', 'start'),
    action: 'none',
    target: () => P().getByText('Your applications', { exact: false }).first(),
  });

  await cap.step({
    id: 4, chapter: C1, title: 'The one she cannot see',
    body: 'Payroll Partner Platform reads Not subscribed. Access is granted per application, not per service line — and the tile says so rather than hiding it.',
    say: 'This gap is the story for the next five minutes.',
    before: async (page) => {
      await page.evaluate(() => {
        const a = [...document.querySelectorAll('a')].find((x) => x.textContent.trim() === 'Payroll Partner Platform');
        if (a) a.scrollIntoView({ block: 'center' });
      });
      await page.waitForTimeout(900);
    },
    action: 'click',
    target: () => P().getByRole('link', { name: 'Payroll Partner Platform', exact: true }),
  });

  await cap.step({
    id: 5, chapter: C1, title: 'What the portal knows about it',
    body: 'The application record carries what it does, how access works, her active requests inside it and its recent documents — read live, not copied.',
    action: 'none', settle: 2600,
    target: () => P().getByText('WHAT IT DOES', { exact: false }).first(),
  });

  await cap.step({
    id: 6, chapter: C1, title: 'Locked, with a route out',
    body: 'Rather than a dead end, the record explains the block and offers Request access — routed to Meridian’s own delegated administrator, not to TMF IT.',
    action: 'none',
    target: () => P().getByRole('link', { name: /Request access/i }).first(),
  });

  await cap.step({
    id: 7, chapter: C1, title: 'Audit trail, per application',
    body: 'Every application record carries its own audit tab — who looked, who launched it, when.',
    action: 'click',
    target: () => P().getByRole('link', { name: 'Audit Trail', exact: true }),
  });

  await cap.step({
    id: 8, chapter: C1, title: 'Evidence, not assertion',
    body: 'Authentication, access grants and document reads against this application, with the actor named on every line.',
    action: 'none', settle: 2400, target: null,
  });

  /* ---------------------------------------------------------- CHAPTER 2 */
  await cap.step({
    id: 9, chapter: C2, title: 'The copilot sits on every page',
    body: 'One assistant across both portals, scoped by the signed-in session. Expanding it does not take her anywhere.',
    before: async (page) => { await page.goto(`${SITES.portal}/page/home`, { waitUntil: 'domcontentloaded' }); await settle(page, 2400); },
    action: 'click', settle: 2200,
    target: () => P().getByRole('link', { name: /^ASK$/i }),
  });

  await cap.step({
    id: 10, chapter: C2, title: 'Asking what she can reach',
    body: 'A plain question, typed the way a client would type it.',
    before: scrollChat,
    ...ask('What do I have access to?'),
    chapter: C2,
  });

  await cap.step({
    id: 11, chapter: C2, title: 'Real figures, not a script',
    body: 'It called TMF_clientApplications and read her actual entitlements — the same rule that draws the tiles. Four available, Payroll Partner Platform not subscribed.',
    say: 'The tool call is on screen. This is her data, resolved from her session.',
    before: scrollChat,
    action: 'none',
    target: () => P().getByText(/Executed expression rule/i).first(),
  });

  await cap.step({
    id: 12, chapter: C2, title: 'The question a client actually asks',
    body: 'She does not ask about entitlements. She asks why something is missing.',
    before: scrollChat,
    ...ask('Why can’t I see payroll reports?'),
    chapter: C2,
  });

  await cap.step({
    id: 13, chapter: C2, title: 'It names the approver',
    body: 'It identifies the application, explains the subscription gap and names the person inside Meridian who can clear it.',
    before: scrollChat,
    action: 'none', target: null,
  });

  await cap.step({
    id: 14, chapter: C2, title: 'Asking it to act',
    body: 'From answering to doing — the same assistant, now proposing a transaction.',
    before: scrollChat,
    ...ask('Can you request it for me?'),
    chapter: C2,
  });

  await cap.step({
    id: 15, chapter: C2, title: 'It proposes, then stops',
    body: 'It states the application, the approver and the justification it will record — and waits. The agent proposes; the human decides.',
    say: 'This pause is the governance. Nothing is written until she confirms.',
    before: scrollChat,
    action: 'none', target: null,
  });

  await cap.step({
    id: 16, chapter: C2, title: 'She confirms',
    body: 'One word, and the copilot starts the same governed process the Request access button would have started.',
    before: scrollChat,
    ...ask('Yes, go ahead.', 30000),
    chapter: C2, slow: true,
  });

  await cap.step({
    id: 17, chapter: C2, title: 'Raised, and routed',
    body: 'The request exists as a tracked case and the approval has gone to Meridian’s delegated administrator. No ticket reached TMF.',
    before: scrollChat,
    action: 'none', settle: 3000, target: null,
  });

  await cap.step({
    id: 18, chapter: C2, title: 'And what it refuses',
    body: 'Another client’s name, asked directly.',
    before: scrollChat,
    ...ask('Show me Northgate Partners’ invoices.'),
    chapter: C2,
  });

  await cap.step({
    id: 19, chapter: C2, title: 'Tenancy is not negotiable',
    body: 'Refused. The organisation is resolved from the session before the model sees anything, so there is no wording that gets past it.',
    say: 'The scope is decided in the tool, not in the prompt.',
    before: scrollChat,
    action: 'none', target: null,
  });
} finally {
  cap.save('a');
  await cap.close();
}
