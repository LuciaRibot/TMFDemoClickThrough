// Render a grid of player states so panel placement can be eyeballed in bulk.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname, DIST = path.join(ROOT, 'docs');
const T = {'.html':'text/html','.jpg':'image/jpeg','.png':'image/png'};
const srv = http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(DIST,u),(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':T[path.extname(u)]||'text/plain'});r.end(d)})});
await new Promise(r=>srv.listen(8096,r));
const steps = (process.env.STEPS || '4,9,11,16,30,35,42,45,48,56,61,66,73,79,83,86').split(',').map(Number);
const out = path.join(ROOT,'recon','sweep'); fs.mkdirSync(out,{recursive:true});
const b = await chromium.launch({headless:true});
const c = await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
const p = await c.newPage();
await p.goto('http://localhost:8096/',{waitUntil:'networkidle'});
await p.click('#start'); await p.waitForTimeout(500);
let at = 1;
for (const n of steps) {
  while (at < n) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(60); at++; }
  await p.waitForTimeout(900);
  await p.screenshot({ path: path.join(out, `s${String(n).padStart(2,'0')}.png`) });
}
await b.close(); srv.close(); console.log('sweep done ->', out);
