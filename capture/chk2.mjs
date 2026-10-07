import { chromium } from 'playwright';
import { login, settle, SITES } from './lib.mjs';
const b = await chromium.launch({headless:true});
const c = await b.newContext({viewport:{width:1440,height:900}});
const p = await c.newPage(); p.setDefaultTimeout(30000);

await login(c,p,'sofia',`${SITES.portal}/page/requests`);
await settle(p,3000);
await p.locator('input[placeholder*="Search requests"]').fill('Billing query');
await settle(p,2600);
let t = await p.evaluate(()=> (document.body.innerText||'').replace(/\s+/g,' '));
const i = t.search(/Billing query — INV-2026-0388/i);
console.log('CASE ROW:', i>=0 ? t.slice(i, i+150) : 'NOT FOUND');
console.log('tracker has Complete:', /Complete/i.test(t.slice(i, i+400)));

await p.goto(`${SITES.portal}/page/documents`,{waitUntil:'domcontentloaded'});
await settle(p,2800);
await p.locator('input[placeholder*="Search across all four"]').fill('INV-2026-0388');
await settle(p,2600);
await p.getByText('INV-2026-0388',{exact:false}).first().click();
await settle(p,2800);
t = await p.evaluate(()=> (document.body.innerText||'').replace(/\s+/g,' '));
const j = t.search(/INV-2026-0388/);
console.log('DOC STATUS CONTEXT:', t.slice(j, j+300));
console.log('says Query resolved:', /Query resolved/i.test(t));
console.log('Daniel reply present:', /credit note|CN-2026-0119|billed in error/i.test(t));
await b.close();
