// Render specific player states for eyeballing.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs'; import path from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname, DIST = path.join(ROOT,'dist');
const T = {'.html':'text/html','.jpg':'image/jpeg','.png':'image/png'};
const srv = http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(DIST,u),(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':T[path.extname(u)]||'text/plain'});r.end(d)})});
await new Promise(r=>srv.listen(8098,r));
const b = await chromium.launch({headless:true});
for (const [tag, step, scheme] of [['s11-dark',11,'dark'],['s11-light',11,'light'],['s14-caption',14,'light'],['s44-caption',44,'dark']]) {
  const c = await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2,colorScheme:scheme});
  const p = await c.newPage();
  await p.goto('http://localhost:8098/',{waitUntil:'networkidle'});
  await p.waitForTimeout(700);
  await p.click('#start'); await p.waitForTimeout(600);
  for (let k=1;k<step;k++){ await p.keyboard.press('ArrowRight'); await p.waitForTimeout(170); }
  await p.waitForTimeout(900);
  await p.screenshot({path: path.join(ROOT,'recon',`state-${tag}.png`)});
  await c.close();
}
await b.close(); srv.close(); console.log('done');
