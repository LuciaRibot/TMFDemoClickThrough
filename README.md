# TMF Unified Client Portal — interactive walkthrough

An 86-step Storylane-style click-through of the TMF demo, captured from the
live Appian environment on `cms-2.appiancloud.com`. Every frame is a real
screenshot; the hotspots were measured from the running DOM.

**Live artifact:** https://claude.ai/artifact/GSfzotktQRSuJL8eryrdyc *(private — share it from the page's Share menu)*

---

## Deploying to GitHub Pages

`dist/` is the whole site: one `index.html` with the steps inlined, plus
`shots/`. No build step, no server, no credentials.

```bash
cd ~/Desktop/tmf-demo-clickthrough
git init && git add -A && git commit -m "TMF portal walkthrough"
git branch -M main
git remote add origin git@github.com:<you>/tmf-portal-walkthrough.git
git push -u origin main
```

Then in **Settings → Pages**, set *Source* to **Deploy from a branch**,
branch `main`, folder **`/dist`**. The site appears at
`https://<you>.github.io/tmf-portal-walkthrough/`.

If you would rather publish from the repository root, move the contents of
`dist/` up one level and set the folder to `/ (root)`.

`.gitignore` already excludes `node_modules/`, `.env`, and the capture working
directories. **`.env` holds the demo passwords — keep it out of the repo.**

## Using the walkthrough

| | |
|---|---|
| Advance | click the pulsing marker, `→`, or `Space` |
| Back | `←` |
| Chapters | `C`, or the ☰ button |
| Jump to start / end | `Home` / `End` |
| Theme | the ◐ button, remembered per browser |
| Focus dimming on/off | `F`, or the ◎ button |
| Hide the panel | `H`, or the ▤ button |

Three kinds of step:

- **A click or a keystroke** — the marker pulses on the control and the rest of
  the screen is dimmed back a little, so the eye goes to the right place. The
  dim is deliberately light; the whole screen stays readable.
- **Narration with a marker** — the marker points, nothing is dimmed.
- **Narration without one** — a caption card in the lower corner, over the
  untouched screen.

Presenter lines are in the grey **SAY** block — they are for whoever is
driving, not for the room. `F` turns the dim off entirely and `H` hides the
panel, if you would rather talk over a clean screen. Both are remembered.

Works at phone width: the tooltip docks to the bottom of the screen.

## The eight chapters

1. **Access journey** — Sofia signs in, finds the one application she cannot reach
2. **AI copilot** — it answers from her own records, raises the request, and refuses another client's data
3. **Identity & administration** — Marcus approves inside Meridian; Lucia's federation and access reviews
4. **Documents & invoices** — Sofia raises a billing query, Daniel sees what she cannot and closes it
5. **Requesting documents** — TMF asks, the client supplies, TMF accepts
6. **Analytics** — the department view and the client view of the same platform
7. **Onboarding & integration** — a real outbound connection test
8. **Security & compliance** — layers, audit history, SIEM forwarding

## Re-capturing

```bash
npm install && npx playwright install chromium
cp .env.example .env     # then fill in TMF_PASS
npm run reset            # clean slate, verified
npm run capture:a        # chapter 1-2   (Sofia)
npm run capture:a2       # refusal + post-approval
npm run capture:b1       # admin + Sofia raises the query
npm run capture:b2       # Daniel resolves it
npm run capture:b3       # document request loop
npm run capture:b4       # analytics, onboarding, security
npm run assemble && npm run build
npm run verify           # renders desktop + phone, light + dark, checks overflow
npm run serve            # http://localhost:8099
```

Re-run one step with `ONLY=`, and suppress the writes with `NOWRITE=1`:

```bash
ONLY=33,34 NOWRITE=1 npm run capture:b1
```

`ONLY` filters by step id, so include whichever earlier steps do the
navigation — a step that only clicks a button fails on its own if the step
that opened the dialog was skipped.

### Things worth knowing before you re-run

- **Several steps are one-way.** Resolving the billing query and accepting the
  uploaded document cannot be replayed against the same records; re-running
  those phases captures the *after* state. Pick a different invoice, or
  restore the data first.
- **`npm run reset` clears access requests, notifications and subscriptions
  only.** Cases, documents and their statuses are not touched.
- **Chapter 1 needs Payroll Partner Platform unsubscribed.** Run `npm run
  reset` before `capture:a`, or the tile reads *Available* and contradicts the
  script.
- **The PDF preview pane is blank in captures.** The viewer is an `<object>`
  served by Appian's doc viewer and the headless PDF plugin does not paint it.
  It renders normally in a real browser.
- **Appian paragraph fields commit on blur.** A submit button stays disabled
  after `fill()` until the field loses focus.

## Layout

```
dist/           the deployable site — index.html + shots/
artifact/       same page without the HTML skeleton, for the Claude artifact
capture/        Playwright capture scripts, the player template, helpers
capture/state/  captured step metadata (gitignored)
inbox/          drop-point for externally supplied screenshots (gitignored)
recon/          DOM dumps and verification screenshots (gitignored)
```

The player template lives at `capture/player.html`; `npm run build` inlines
`capture/state/steps.final.json` into it and writes both outputs. Edit the
template, never `dist/index.html` directly.
