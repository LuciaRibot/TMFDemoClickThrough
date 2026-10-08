// Inline steps.final.json into the player template and emit both builds:
//   docs/index.html      standalone — full skeleton, for local use and GitHub Pages
//   artifact/index.html  content only — the Artifact publish adds its own skeleton
import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const tpl = fs.readFileSync(path.join(ROOT, 'capture', 'player.html'), 'utf8');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'capture/state/steps.final.json'), 'utf8'));

// A literal </script> inside the JSON would close the tag early.
const json = JSON.stringify(data).replace(/<\//g, '<\\/');
const body = tpl.replace('__STEPS_JSON__', json);
if (body === tpl) throw new Error('placeholder __STEPS_JSON__ not found in template');

// Artifact build: no doctype/html/head/body of our own.
fs.mkdirSync(path.join(ROOT, 'artifact'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'artifact', 'index.html'), body);

// Standalone build: the skeleton the Artifact runtime would otherwise add.
const standalone = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>
  :root { color-scheme: light; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
  body { margin: 0; font: 14px system-ui, sans-serif; background: #fafafa; }
  img { max-width: 100%; }
  [hidden] { display: none !important; }
</style>
${body}
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'docs', 'index.html'), standalone);

console.log(`built ${data.steps.length} steps`);
console.log(`  docs/index.html      ${(standalone.length / 1024).toFixed(0)} KB (standalone)`);
console.log(`  artifact/index.html  ${(body.length / 1024).toFixed(0)} KB (for Artifact publish)`);
