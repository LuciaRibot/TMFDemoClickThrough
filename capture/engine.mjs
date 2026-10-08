// Step runner.
//
// The contract for every step, in this order:
//   1. get the page into position (nav / prior action already done)
//   2. let it settle
//   3. screenshot
//   4. measure the click target's box, in viewport %
//   5. THEN perform the action
//
// That order matters: the hotspot has to point at the thing the viewer is
// about to click, on the screen as it looked *before* the click.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { login, settle, settleSlow, readError, boxPct, ensureDir, SITES } from './lib.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const SHOTS = path.join(ROOT, 'docs', 'shots');
const STATE = path.join(ROOT, 'capture', 'state');
ensureDir(SHOTS); ensureDir(STATE);

const SHRINK_PY = path.join(ROOT, 'capture', 'shrink.py');

/** Downscale + recompress so the published bundle stays small. */
function shrink(file, maxW = 1800, quality = 80) {
  try {
    execFileSync('python3', [SHRINK_PY, file, String(maxW), String(quality)],
      { stdio: 'pipe', cwd: path.join(ROOT, 'capture') });
  } catch (e) {
    const err = (e.stderr?.toString() || e.message || '').split('\n').filter(Boolean).pop();
    console.log(`   (shrink skipped: ${err})`);
  }
}

export class Capture {
  constructor({ headless = true, only = null } = {}) {
    this.headless = headless;
    this.only = only;              // Set of step ids to run, or null for all
    this.steps = [];
    this.errors = [];
    this.offscreen = [];
    this.n = 0;
    this.persona = null;
  }

  async open() {
    this.browser = await chromium.launch({ headless: this.headless, args: ['--force-color-profile=srgb'] });
    this.ctx = await this.browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      reducedMotion: 'reduce',
      colorScheme: 'light',
    });
    this.page = await this.ctx.newPage();
    this.page.setDefaultTimeout(35000);
    this.page.on('dialog', (d) => d.accept().catch(() => {}));
  }

  async close() { if (this.browser) await this.browser.close(); }

  async as(persona, url) {
    if (this.persona === persona && !url) return;
    console.log(`\n--- signing in as ${persona} ---`);
    await login(this.ctx, this.page, persona, url);
    this.persona = persona;
    await settle(this.page, 2200);
  }

  async goto(url, ms = 2400) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await settle(this.page, ms);
  }

  wanted(id) { return !this.only || this.only.has(id); }

  /**
   * Record one step.
   * @param {object} s
   *   id, chapter, title, body, say, persona
   *   target   -> Locator | () => Locator | null   (the thing to highlight)
   *   action   -> 'click' | 'type' | 'none'
   *   text     -> for action:'type'
   *   after    -> async () => {}   extra work once the action is done
   *   settle   -> ms to wait before the screenshot
   *   slow     -> true if the action starts a process / writes records
   *   noShot   -> reuse the previous image (for caption-only beats)
   */
  async step(s) {
    const id = s.id;
    if (!this.wanted(id)) return;
    this.n++;
    const label = `${String(id).padStart(2, '0')} ${s.title}`;
    process.stdout.write(`[${label}] `);

    try {
      if (s.before) await s.before(this.page);
      await settle(this.page, s.settle ?? 1600);

      const err = await readError(this.page);
      if (err) throw new Error(`screen is showing an error before capture: ${err}`);

      let file = `${String(id).padStart(2, '0')}.jpg`;
      const abs = path.join(SHOTS, file);
      if (!s.noShot) {
        await this.page.screenshot({ path: abs, type: 'jpeg', quality: 86 });
        shrink(abs, 1800, 80);
        // Highlight-only beats re-screenshot an unchanged screen; point at the
        // earlier file instead of shipping the same bytes twice.
        const hash = crypto.createHash('sha1').update(fs.readFileSync(abs)).digest('hex');
        const twin = this.hashes?.get(hash);
        if (twin) { fs.unlinkSync(abs); file = twin; }
        else { (this.hashes ??= new Map()).set(hash, file); }
      }

      const loc = typeof s.target === 'function' ? await s.target() : s.target;
      const box = await boxPct(this.page, loc);
      if (s.action && s.action !== 'none' && !box) {
        console.log('\n   WARNING: no target box measured — step will render as a caption card');
      }
      if (box && box.offscreen) {
        // The hotspot would sit on whatever occupies those coordinates in the
        // frame, which is not the thing the copy is talking about.
        this.offscreen.push({ id, title: s.title });
        console.log(`\n   OFF-SCREEN TARGET — scroll it into view in this step's before() hook`);
      }

      this.steps.push({
        id,
        chapter: s.chapter,
        title: s.title,
        body: s.body,
        say: s.say || null,
        persona: s.persona || this.persona,
        action: s.action || 'none',
        shot: s.noShot ? this.steps[this.steps.length - 1]?.shot : `shots/${file}`,
        target: box,
      });

      if (s.action === 'click' && loc) {
        await loc.first().click({ timeout: 20000 });
      } else if (s.action === 'type' && loc) {
        await loc.first().click({ timeout: 20000 });
        await loc.first().fill(s.text ?? '');
      }
      if (s.action && s.action !== 'none') {
        s.slow ? await settleSlow(this.page, s.slowMs ?? 5000) : await settle(this.page, 1400);
      }
      if (s.after) await s.after(this.page);

      const err2 = await readError(this.page);
      if (err2) throw new Error(`action produced an error: ${err2}`);

      console.log('ok');
    } catch (e) {
      const msg = String(e.message).split('\n')[0];
      console.log(`FAILED -> ${msg}`);
      this.errors.push({ id, title: s.title, error: msg });
      await this.page.screenshot({ path: path.join(STATE, `FAIL-${id}.png`) }).catch(() => {});
      if (s.critical) throw e;
    }
  }

  /** A beat with no app interaction — pure narration over the last screen. */
  async caption(s) { return this.step({ ...s, action: 'none', noShot: true }); }

  save(phase) {
    const f = path.join(STATE, `steps-${phase}.json`);
    // Merge, never clobber. A re-run with ONLY=<ids> must patch those ids and
    // leave every other previously captured step intact.
    let merged = [];
    if (fs.existsSync(f)) {
      try { merged = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { merged = []; }
    }
    const byId = new Map(merged.map((s) => [s.id, s]));
    for (const s of this.steps) byId.set(s.id, s);
    this.steps = [...byId.values()].sort((a, b) => a.id - b.id);
    fs.writeFileSync(f, JSON.stringify(this.steps, null, 2));
    console.log(`\nwrote ${this.steps.length} steps (${this.n} captured this run) -> ${f}`);
    if (this.offscreen.length) {
      console.log(`!! ${this.offscreen.length} step(s) measured an OFF-SCREEN target:`);
      for (const o of this.offscreen) console.log(`   ${o.id} ${o.title}`);
    }
    if (this.errors.length) {
      fs.writeFileSync(path.join(STATE, `errors-${phase}.json`), JSON.stringify(this.errors, null, 2));
      console.log(`!! ${this.errors.length} step(s) failed:`);
      for (const e of this.errors) console.log(`   ${e.id} ${e.title}: ${e.error}`);
    }
    return f;
  }
}

export { SITES, settle, settleSlow };
