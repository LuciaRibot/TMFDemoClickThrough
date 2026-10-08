// Every chapter anchor and a few step anchors must open on the right screen
// with the cover gone — the requirements map in the DSR links straight to these.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname, DOCS = path.join(ROOT, 'docs');
const T = {'.html':'text/html','.jpg':'image/jpeg','.png':'image/png'};
const srv = http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(DOCS,u),(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':T[path.extname(u)]||'text/plain'});r.end(d)})});
await new Promise(r=>srv.listen(8095,r));
const data = JSON.parse(fs.readFileSync(path.join(ROOT,'capture','state','steps.final.json'),'utf8'));
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
let bad = 0;
const probes = data.chapters.map((ch, n) => ['c=' + (n+1), ch.from, ch.name])
  .concat([['s=1', 1, 'first'], ['s=44', 44, 'mid'], ['s=86', 86, 'last'], ['s=999', null, 'out of range']]);
for (const [hash, want, label] of probes) {
  // about:blank first, so each probe is a genuine fresh load: navigating
  // between two hashes of the same URL fires hashchange without reloading.
  await p.goto('about:blank');
  await p.goto('http://localhost:8095/#' + hash, { waitUntil: 'networkidle' });
  await p.waitForTimeout(650);
  const got = await p.evaluate(() => ({
    cover: !document.getElementById('cover').hidden,
    count: document.getElementById('count').textContent.trim(),
    title: document.getElementById('tTitle').textContent.trim(),
  }));
  const n = parseInt(got.count, 10);
  const ok = want === null ? got.cover : (!got.cover && n === want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  #${hash.padEnd(6)} want ${String(want ?? 'cover').padStart(5)}  got ${got.cover ? 'cover' : String(n).padStart(5)}  ${got.cover ? '' : got.title.slice(0,38)}   [${label}]`);
}
// And the no-hash case must still show the cover.
await p.goto('http://localhost:8095/', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
const plain = await p.evaluate(() => !document.getElementById('cover').hidden);
console.log(`${plain ? 'ok  ' : 'FAIL'}  no hash           want cover  got ${plain ? 'cover' : 'STEP'}   [embedded copy]`);
if (!plain) bad++;
console.log(bad ? `\n${bad} FAILED` : '\nall deep links good');
await b.close(); srv.close();
