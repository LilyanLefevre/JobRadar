// Cibles tactiles : sur un écran tactile (pointer: coarse), tout contrôle visible fait au moins 44 px.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
const BASE = process.env.BASE || 'http://localhost:8090';
const ok = (n, c, x = '') => console.log((c ? 'OK   ' : 'FAIL ') + n + (!c && x ? '  ' + x : ''));
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const su = JSON.parse(sh(`curl -s ${BASE}/api/collections/_superusers/auth-with-password -H 'Content-Type: application/json' -d '{"identity":"admin@test.local","password":"adminpass123"}'`)).token;
const email = 'touch' + Date.now() + '@t.io';
const u = JSON.parse(sh(`curl -s ${BASE}/api/collections/users/records -H 'Content-Type: application/json' -H 'Authorization: ${su}' -d '{"email":"${email}","password":"password123","passwordConfirm":"password123"}'`));
const tok = JSON.parse(sh(`curl -s -X POST ${BASE}/api/collections/users/impersonate/${u.id} -H 'Authorization: ${su}'`)).token;
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const p = await c.newPage();
await p.addInitScript(([t, m]) => { localStorage.setItem('pocketbase_auth', JSON.stringify({ token: t, record: m })); }, [tok, { id: u.id, email }]);
for (const route of ['search', 'alerts', 'profile', 'settings']) {
  await p.goto(`${BASE}/#/${route}`); await p.waitForSelector('#app:not([hidden])'); await p.waitForTimeout(400);
  await p.click('.avatar'); await p.waitForTimeout(400); // ouvre le menu : ses entrées comptent aussi
  const small = await p.evaluate(() => [...document.querySelectorAll('button, a[href], select, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), summary, [role=menuitem]')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden]') && getComputedStyle(e).display !== 'inline'; })
    .filter((e) => { const r = e.getBoundingClientRect(); return r.height < 43.5 || (r.width < 43.5 && !e.matches('input, select')); })
    .map((e) => { const r = e.getBoundingClientRect(); return `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} ${Math.round(r.width)}x${Math.round(r.height)}`; }));
  ok(`/${route} : tous les contrôles font ≥ 44 px`, small.length === 0, small.slice(0, 8).join(' | '));
}
await b.close();
