import { chromium } from 'playwright';
import { login, settle, SITES, waitAgentIdle } from './lib.mjs';
const b = await chromium.launch({headless:true});
const c = await b.newContext({viewport:{width:1440,height:900}});
const p = await c.newPage(); p.setDefaultTimeout(30000);
await login(c,p,'sofia',`${SITES.portal}/page/home`);
await settle(p,2400);
await p.getByRole('link',{name:/^ASK$/i}).first().click();
await settle(p,2400);
const CHAT='textarea[aria-label="Chat message input"]';
await p.locator(CHAT).fill('What do I have access to?');
await p.locator(CHAT).press('Enter');
await waitAgentIdle(p, 90000);
await settle(p,1500);
const info = await p.evaluate(() => {
  const out=[];
  for (const el of document.querySelectorAll('*')) {
    const t=(el.textContent||'').trim();
    if (!/^Executed expression rule/.test(t)) continue;
    if (t.length>90) continue;
    const r=el.getBoundingClientRect();
    out.push({tag:el.tagName, role:el.getAttribute('role')||'', cls:(el.className||'').toString().slice(0,60),
              w:Math.round(r.width), h:Math.round(r.height), x:Math.round(r.x), y:Math.round(r.y),
              kids:el.children.length, txt:t.slice(0,60)});
  }
  return out;
});
console.log(JSON.stringify(info,null,1));
await b.close();
