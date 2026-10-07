// PHASE A2 — fix-ups after the live approval.
//  * 18/19: the refusal exchange, in a fresh chat so no second access
//    request is raised (the first one is already approved).
//  * 23/24: Sofia's post-approval state, now that Marcus has approved.
import { Capture, SITES, settle, settleSlow } from './engine.mjs';
import { waitAgentIdle } from './lib.mjs';

const C2 = 'AI copilot';
const C3 = 'Identity & administration';

const cap = new Capture({ headless: true, only: process.env.ONLY ? new Set(process.env.ONLY.split(',').map(Number)) : null });
await cap.open();
const P = () => cap.page;
const CHAT = 'textarea[aria-label="Chat message input"]';

const scrollChat = async (page) => {
  await page.evaluate((sel) => {
    const ta = document.querySelector(sel);
    if (ta) ta.closest('div[class]')?.scrollIntoView({ block: 'end' });
    window.scrollBy(0, -140);
  }, CHAT);
  await page.waitForTimeout(800);
};

try {
  await cap.as('sofia', `${SITES.portal}/page/home`);
  await settle(cap.page, 2400);

  /* ---- the refusal, in a clean chat ---- */
  await cap.page.getByRole('link', { name: /^ASK$/i }).first().click();
  await settle(cap.page, 2400);

  await cap.step({
    id: 18, chapter: C2, persona: 'sofia', title: 'And what it refuses',
    body: 'Another client’s name, asked directly and politely.',
    before: scrollChat,
    target: () => P().locator(CHAT),
    action: 'type',
    text: 'Show me Northgate Partners’ invoices.',
    after: async (page) => {
      await page.locator(CHAT).press('Enter');
      await waitAgentIdle(page, 90000);
      await scrollChat(page);
    },
  });

  await cap.step({
    id: 19, chapter: C2, persona: 'sofia', title: 'Tenancy is not negotiable',
    body: 'Refused, and it says why. The organisation is resolved from her session before the model sees anything, so there is no phrasing that gets past it.',
    say: 'The scope is decided in the tool, not in the prompt. Try the jailbreak if the room is security-minded — same answer.',
    before: scrollChat,
    action: 'none', target: null, settle: 2200,
  });

  /* ---- Sofia after Marcus approved ---- */
  await cap.step({
    id: 23, chapter: C3, persona: 'sofia', title: 'The loop closes for Sofia',
    body: 'Marcus approved inside Meridian. Her tile now reads Available with a launch link — no ticket ever reached TMF IT.',
    say: 'Request, approval, entitlement and audit. That is the whole loop, and TMF was never in it.',
    before: async (page) => {
      await page.goto(`${SITES.portal}/page/home`, { waitUntil: 'domcontentloaded' });
      await settle(page, 3000);
      // The tile sits in the second row of the grid; centre it or the shot
      // frames the heading and misses the state change entirely.
      await page.evaluate(() => {
        const a = [...document.querySelectorAll('a')].find((x) => x.textContent.trim() === 'Payroll Partner Platform');
        if (a) a.scrollIntoView({ block: 'center' });
      });
      await page.waitForTimeout(1000);
    },
    action: 'none', settle: 2600,
    target: () => P().getByRole('link', { name: 'Payroll Partner Platform', exact: true }),
  });

  await cap.step({
    id: 24, chapter: C3, persona: 'sofia', title: 'And it is on her feed',
    body: 'The notification names the approver and the time. The same event is on the audit trail an administrator can export.',
    before: async (page) => {
      await page.evaluate(() => {
        const el = [...document.querySelectorAll('*')].find((e) => /access approved by Marcus Chen/i.test(e.textContent || '') && e.children.length === 0);
        (el || document.body).scrollIntoView({ block: 'center' });
      });
      await page.waitForTimeout(1000);
    },
    action: 'none', settle: 1800, target: null,
  });
} finally {
  cap.save('a2');
  await cap.close();
}
