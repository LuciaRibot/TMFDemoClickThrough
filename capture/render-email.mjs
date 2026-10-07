// Render the branded approval email (real output of TMF_approvalEmailHtml,
// captured via testRule) as step 20 of the click-through.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const html = fs.readFileSync(path.join(ROOT, 'capture/state/approval-email.html'), 'utf8');
const out = path.join(ROOT, 'dist/shots/20.jpg');

const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.setContent(html, { waitUntil: 'load' });
await p.waitForTimeout(600);
await p.screenshot({ path: out, type: 'jpeg', quality: 86 });
await b.close();
execFileSync('python3', [path.join(ROOT, 'capture/shrink.py'), out, '1800', '80'], { cwd: path.join(ROOT, 'capture') });
console.log('wrote', out);
