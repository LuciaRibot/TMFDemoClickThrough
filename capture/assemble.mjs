// Merge every captured phase into one ordered steps.json for the player.
//
// Also applies the handful of corrections that are cheaper to make here than
// by recapturing: copy that over-claimed what a screenshot actually shows,
// and two hotspots that resolved to a whole dialog rather than a control.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const STATE = path.join(ROOT, 'capture', 'state');
const SHOTS = path.join(ROOT, 'dist', 'shots');
const INBOX = path.join(ROOT, 'inbox');

const byId = new Map();
for (const f of fs.readdirSync(STATE).filter((f) => /^steps-(a|a2|b1|b2|b3|b4)\.json$/.test(f)).sort()) {
  for (const s of JSON.parse(fs.readFileSync(path.join(STATE, f), 'utf8'))) byId.set(s.id, s);
}

/* ---- corrections ---- */
const patch = (id, fields) => { const s = byId.get(id); if (s) Object.assign(s, fields); };

// The screenshot catches the tool call mid-flight, so the copy should describe
// that rather than a finished confirmation.
patch(17, {
  title: 'It runs the real process',
  body: 'The copilot hands off to TMF Service Access Request — the same governed process the Request access button starts. The tool call is on screen while it runs.',
});
// Both of these measured the dialog itself; a spotlight over a whole modal is
// noise, so they read as caption cards instead.
patch(68, { target: null });
patch(72, { target: null });
// 47 ("above the fold, identical") is about the whole header, and its box
// landed on blank card above the PROGRESS label rather than on a control.
patch(47, { target: null });
patch(71, {
  title: 'He reviews and accepts',
  body: 'Review and accept is internal-only, and only appears while the document is sitting in Received. It is the last step of the exchange.',
  say: 'Documents that arrive through DocCenter carry their extracted fields here for reconciliation — this one was supplied straight to the portal.',
});
patch(72, {
  body: 'Accepting files it against Meridian’s records and tells Sofia it landed. She is not asked to review her own document — that would be circular.',
});

// The document preview is an <object> served by Appian's doc viewer, which the
// headless PDF plugin does not paint, so the frame shows an empty preview box.
// The copy describes what the frame actually shows; the preview itself is still
// there to demonstrate live.
patch(33, {
  body: 'She picks INV-2026-0388. It opens in the portal beside its own facts and actions \u2014 no download, no second system to log into.',
});
patch(34, {
  title: 'Read it and act on it, same screen',
  body: 'The document, its entity and jurisdiction, its status and the two things she can do with it, all in one pane. Raising a query is a click, not an email with an attachment.',
  say: 'The preview renders the PDF inline here \u2014 it is blank in this capture only because the recorder had no PDF plugin.',
});

/* ---- Chapter 3 inserts: the approval Marcus actually did ---- */
const marcus = [
  {
    id: 20, chapter: 'Identity & administration', persona: 'marcus',
    title: 'What Marcus receives',
    body: 'TMF house style, rendered from a versioned rule rather than a mail template — table-based with inline styles, so it survives Outlook and blocked images.',
    say: 'The branded mail carries the context. Appian’s own notification carries the working task link — click through from that one.',
    action: 'none', shot: 'shots/20.jpg', target: null,
  },
  {
    id: 21, chapter: 'Identity & administration', persona: 'marcus',
    title: 'The task, before he can act',
    body: 'Appian makes him accept the task before completing it, so two administrators cannot answer the same request twice.',
    action: 'none', shot: null, target: null,
  },
  {
    id: 22, chapter: 'Identity & administration', persona: 'marcus',
    title: 'Approving inside his own organisation',
    body: 'The form says it plainly: TMF operates the platform, but who at Meridian holds which service is decided here, by Marcus. The decision is written to the portal audit trail.',
    say: 'This is the line the whole identity story turns on.',
    action: 'none', shot: null, target: null,
  },
];
// Pick up the two task screenshots if they have been dropped into inbox/.
const inboxFiles = fs.existsSync(INBOX)
  ? fs.readdirSync(INBOX).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort()
  : [];
const assign = { 21: inboxFiles.find((f) => /21|accept|task/i.test(f)), 22: inboxFiles.find((f) => /22|approve/i.test(f)) };
for (const m of marcus) {
  if (m.shot === null && assign[m.id]) {
    const src = path.join(INBOX, assign[m.id]);
    const dest = path.join(SHOTS, `${m.id}.jpg`);
    try {
      const { execFileSync } = await import('node:child_process');
      execFileSync('python3', [path.join(ROOT, 'capture', 'to-jpg.py'), src, dest], { cwd: path.join(ROOT, 'capture') });
      m.shot = `shots/${m.id}.jpg`;
      console.log(`  inbox: ${assign[m.id]} -> ${m.shot}`);
    } catch (e) { console.log(`  inbox convert failed for ${m.id}: ${e.message.split('\n')[0]}`); }
  }
  byId.set(m.id, m);
}

/* ---- order, renumber, and emit ---- */
const CHAPTERS = [
  'Access journey',
  'AI copilot',
  'Identity & administration',
  'Documents & invoices',
  'Requesting documents',
  'Analytics',
  'Onboarding & integration',
  'Security & compliance',
];
const ordered = [...byId.values()].sort((a, b) => a.id - b.id);
const missingShot = ordered.filter((s) => !s.shot);
const steps = ordered.filter((s) => s.shot).map((s, i) => ({
  n: i + 1,
  chapter: s.chapter,
  title: s.title,
  body: s.body,
  say: s.say || null,
  persona: s.persona,
  action: s.action || 'none',
  shot: s.shot,
  target: s.target || null,
}));

const chapters = CHAPTERS.filter((c) => steps.some((s) => s.chapter === c)).map((c) => ({
  name: c,
  from: steps.find((s) => s.chapter === c).n,
  count: steps.filter((s) => s.chapter === c).length,
}));

const out = {
  title: 'TMF Unified Client Portal',
  subtitle: 'An interactive walkthrough of the live demo environment',
  captured: new Date().toISOString().slice(0, 10),
  chapters,
  steps,
};
fs.writeFileSync(path.join(STATE, 'steps.final.json'), JSON.stringify(out, null, 2));

console.log(`\n${steps.length} steps across ${chapters.length} chapters`);
for (const c of chapters) console.log(`  ${String(c.count).padStart(2)}  ${c.name}  (from ${c.from})`);
if (missingShot.length) {
  console.log(`\nAWAITING AN IMAGE (left out of the player until supplied):`);
  for (const s of missingShot) console.log(`  ${s.id}  ${s.title}`);
  console.log(`  drop files into ${INBOX}/ named 21-*.png and 22-*.png, then re-run assemble`);
}
const noHot = steps.filter((s) => s.action !== 'none' && !s.target);
if (noHot.length) console.log(`\nACTION STEPS WITHOUT A HOTSPOT: ${noHot.map((s) => s.n).join(', ')}`);
