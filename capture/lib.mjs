// Shared helpers for driving Appian with Playwright.
// Appian is aggressively async: almost every interaction posts back and
// re-renders the whole SAIL tree, so "the click worked" and "the screen shows
// the result" are several seconds apart. Everything here is about that gap.

import fs from 'node:fs';
import path from 'node:path';

export const BASE = 'https://cms-2.appiancloud.com';

/**
 * Credentials come from the environment, never from this file — the capture
 * scripts are part of a package meant to be pushed to GitHub, and the built
 * walkthrough in dist/ contains no credentials at all. Copy .env.example to
 * .env and fill it in; `npm run capture` loads it.
 */
const cred = (name, fallbackUser) => ({
  user: process.env[`TMF_${name}_USER`] || fallbackUser,
  pass: process.env[`TMF_${name}_PASS`] || process.env.TMF_PASS || '',
  label: fallbackUser,
});

export const PERSONAS = {
  sofia:  cred('SOFIA', 'sofia.almeida'),
  daniel: cred('DANIEL', 'daniel.avery'),
  lucia:  cred('LUCIA', 'lucia.ribot@appian.com'),
};

export const SITES = {
  portal:   `${BASE}/suite/sites/tmf-portal`,
  internal: `${BASE}/suite/sites/tmf-internal-portal`,
  admin:    `${BASE}/suite/sites/tmf-portal/page/admin`,
};

/** Wait for the network to go quiet, then give SAIL time to paint. */
export async function settle(page, ms = 1800) {
  try { await page.waitForLoadState('networkidle', { timeout: 30000 }); }
  catch { /* a long-poll can keep the network busy forever; fall through */ }
  await page.waitForTimeout(ms);
  // Appian shows a translucent "working" veil during a postback.
  for (let i = 0; i < 20; i++) {
    const busy = await page.locator('[class*="LoadingBar"], [class*="loadingIndicator"]').count().catch(() => 0);
    if (!busy) break;
    await page.waitForTimeout(400);
  }
}

/** Longer settle for anything that starts a process or writes records. */
export async function settleSlow(page, ms = 4200) {
  await settle(page, ms);
}

/**
 * Sign out whoever is there and sign in as `persona`.
 * Appian keeps the session in cookies, so a fresh context per persona is
 * cleaner than trying to log out reliably.
 */
export async function login(context, page, persona, targetUrl) {
  const p = PERSONAS[persona];
  if (!p) throw new Error(`unknown persona ${persona}`);
  if (!p.pass) {
    throw new Error(
      `no password for ${persona}. Copy .env.example to .env and set TMF_PASS ` +
      `(or TMF_${persona.toUpperCase()}_PASS), then re-run.`
    );
  }
  await context.clearCookies();
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  const userField = page.locator('input[name="un"], input#un, input[name="username"]').first();
  if (await userField.count()) {
    await userField.fill(p.user);
    await page.locator('input[name="pw"], input#pw, input[type="password"]').first().fill(p.pass);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {}),
      page.locator('input[type="submit"], button[type="submit"], #loginButton').first().click(),
    ]);
  }
  await settle(page, 2500);
  if (await page.locator('input[name="un"], input#un').count()) {
    throw new Error(`login failed for ${persona} — still on the sign-in page`);
  }
  return page;
}

const CHAT_INPUT = 'textarea[aria-label="Chat message input"]';

/**
 * Wait until the agent has finished its turn.
 *
 * Network-idle is useless here: the agent chat streams, and a tool call that
 * starts a process model keeps a spinner up with the composer disabled long
 * after the HTTP traffic stops. The reliable signal is the composer becoming
 * enabled again with no spinner next to a tool-call chip.
 */
export async function waitAgentIdle(page, maxMs = 150000) {
  const started = Date.now();
  let stable = 0;
  while (Date.now() - started < maxMs) {
    const state = await page.evaluate((sel) => {
      const ta = document.querySelector(sel);
      if (!ta) return { ready: false, reason: 'no composer' };
      if (ta.disabled || ta.getAttribute('aria-disabled') === 'true') return { ready: false, reason: 'composer disabled' };
      const txt = document.body.innerText || '';
      const running = /Running process model|Thinking…|Thinking\.\.\./i.test(txt);
      const spinner = !!document.querySelector('[class*="ProgressIndicator"], [class*="Spinner"], [class*="progressDots"]');
      return { ready: !running && !spinner, reason: running ? 'still running' : spinner ? 'spinner' : 'ready' };
    }, CHAT_INPUT);
    if (state.ready) {
      // Require the idle state to hold, so a gap between streamed chunks
      // is not mistaken for the end of the turn.
      if (++stable >= 3) { await page.waitForTimeout(900); return true; }
    } else { stable = 0; }
    await page.waitForTimeout(900);
  }
  console.log(`   (waitAgentIdle timed out after ${maxMs}ms)`);
  return false;
}

/** Any Appian error dialog or red validation banner currently on screen. */
export async function readError(page) {
  const probes = [
    '[role="alert"]',
    'text=/An Error Has Occurred/i',
    'text=/Expression evaluation error/i',
    'text=/you do not have permission/i',
    '[class*="ErrorMessage"]',
    '[class*="validationMessage"]',
  ];
  for (const sel of probes) {
    const loc = page.locator(sel).first();
    if (await loc.count().catch(() => 0)) {
      const txt = (await loc.innerText().catch(() => '')).trim();
      if (txt && txt.length > 3) return txt.slice(0, 600);
    }
  }
  return null;
}

/**
 * Bounding box of `locator` as viewport percentages, or null.
 *
 * Deliberately does NOT scroll. Scrolling here was a real bug: the screenshot
 * is taken first, so scrolling the element into view before measuring produced
 * a box that was correct for a scroll position the image never showed, and the
 * hotspot landed on whatever happened to occupy those coordinates. If the
 * target is off-screen, that is the step's framing to fix in its `before` hook,
 * and `offscreen` says so instead of silently returning a plausible box.
 */
export async function boxPct(page, locator) {
  if (!locator) return null;
  try {
    const el = locator.first();
    if (!(await el.count())) return null;
    const b = await el.boundingBox();
    if (!b) return null;
    const vp = page.viewportSize();
    const pct = {
      x: +((b.x / vp.width) * 100).toFixed(3),
      y: +((b.y / vp.height) * 100).toFixed(3),
      w: +((b.width / vp.width) * 100).toFixed(3),
      h: +((b.height / vp.height) * 100).toFixed(3),
    };
    const offscreen = pct.y < -0.5 || pct.y + pct.h > 100.5 || pct.x < -0.5 || pct.x + pct.w > 100.5;
    const clamp = (n) => Math.max(0, Math.min(100, n));
    return {
      x: clamp(pct.x), y: clamp(pct.y),
      w: clamp(pct.w), h: clamp(pct.h),
      offscreen: offscreen || undefined,
    };
  } catch { return null; }
}

export function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); return d; }

export function writeJson(file, obj) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}
