import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
const base = { extraHTTPHeaders: { 'CF-Connecting-IP': '1.2.3.4' } };
const ok = (n, c, x) => console.log((c ? 'OK   ' : 'FAIL ') + n + (!c && x !== undefined ? '  ' + x : ''));
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const ctx = await b.newContext({ ...base, viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await p.goto('http://localhost:8090/'); await p.waitForSelector('#providers button');
await Promise.all([ctx.waitForEvent('page'), p.click('#providers button')]); await p.waitForSelector('#app:not([hidden])');
const uid = await p.evaluate(() => JSON.parse(localStorage.getItem('pocketbase_auth')).record.id);
const su = sh("curl -s localhost:8090/api/collections/_superusers/auth-with-password -H 'Content-Type: application/json' -d '{\"identity\":\"admin@test.local\",\"password\":\"adminpass123\"}' | python3 -c \"import sys,json;print(json.load(sys.stdin)['token'])\"");
// profil minimal pour afficher la page Profil
const tok = sh("curl -s -X POST localhost:8090/api/collections/users/impersonate/" + uid + " -H 'Authorization: " + su + "' | python3 -c \"import sys,json;print(json.load(sys.stdin)['token'])\"");
sh("curl -s -o /dev/null -X PATCH localhost:8090/api/collections/users/records/" + uid + " -H 'Authorization: " + tok + "' -H 'Content-Type: application/json' -d '{\"profile\":{\"resume\":\"Dev\",\"experiences\":[{\"poste\":\"Dev\",\"entreprise\":\"X\",\"categorie\":\"Emploi\",\"debut\":\"2024\",\"fin\":\"\",\"lieu\":\"\",\"description\":\"x\"}]}}'");

// 1. sans photo : initiales
await p.reload(); await p.waitForSelector('#app:not([hidden])');
ok('sans photo : initiales dans le bouton de compte', (await p.locator('#acctBtn .pic').textContent()).trim().length > 0 && (await p.locator('#acctBtn img').count()) === 0);
await p.click('#acctBtn'); ok('sans photo : initiales dans le menu', (await p.locator('#acctMenu .who .pic img').count()) === 0 && (await p.locator('#acctMenu .who .pic').textContent()).trim().length > 0); await p.keyboard.press('Escape');
await p.click('nav [data-nav=profile]'); await p.waitForSelector('.savebar');
ok('sans photo : pas de bloc photo dans le profil', (await p.locator('.idblock .pic').count()) === 0);

// 2. avec photo (comme celle reprise de GitHub)
sh("curl -s -o /dev/null -X PATCH localhost:8090/api/collections/users/records/" + uid + " -H 'Authorization: " + su + "' -F avatar=@" + new URL('../../../server/pb_public/icons/icon-512.png', import.meta.url).pathname);
await p.reload(); await p.waitForSelector('#app:not([hidden])'); await p.waitForTimeout(500);
const info = await p.evaluate(() => { const i = document.querySelector('#acctBtn img'); return i ? { src: i.getAttribute('src'), w: i.naturalWidth, ok: i.complete && i.naturalWidth > 0 } : null });
ok('photo dans le bouton de compte (image chargée)', !!info && info.ok, JSON.stringify(info));
ok('miniature 96x96 demandée (pas l\'image d\'origine)', !!info && info.src.includes('thumb=96x96') && info.src.includes('/api/files/'), info && info.src);
ok('la miniature est réellement plus petite que l\'original', !!info && info.w <= 96, info && info.w);
ok('le bouton garde un nom accessible', (await p.locator('#acctBtn').getAttribute('aria-label')).includes('Menu du compte'));
await p.click('#acctBtn'); await p.waitForTimeout(400);
const mi = await p.evaluate(() => { const i = document.querySelector('#acctMenu .who img'); return i ? { src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0 } : null });
ok('photo dans l\'en-tête du menu (miniature 96, affichée en 44 px)', !!mi && mi.ok && mi.src.includes('thumb=96x96'), JSON.stringify(mi));
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/av-menu.png', clip: { x: 880, y: 0, width: 560, height: 260 } }); await p.keyboard.press('Escape');
await p.click('nav [data-nav=profile]'); await p.waitForSelector('.idblock .pic img'); await p.waitForTimeout(400);
ok('photo en tête de l\'identité du profil', await p.evaluate(() => { const i = document.querySelector('.idblock img'); return i.complete && i.naturalWidth > 0 }));
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/av-profile.png', clip: { x: 160, y: 180, width: 1120, height: 330 } });
await p.goto('http://localhost:8090/#/settings'); await p.waitForSelector('.whoami img'); await p.waitForTimeout(300);
ok('photo dans la section Compte des paramètres', await p.evaluate(() => { const i = document.querySelector('.whoami img'); return i.complete && i.naturalWidth > 0 }));

// 3. image illisible : retour aux initiales
const bad = await b.newContext({ ...base, viewport: { width: 1440, height: 900 }, storageState: await ctx.storageState() });
await bad.route('**/api/files/**', (r) => r.abort());
const pb = await bad.newPage(); pb.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await pb.goto('http://localhost:8090/#/search'); await pb.waitForSelector('#app:not([hidden])'); await pb.waitForTimeout(800);
ok('photo qui ne charge pas : repli sur les initiales', (await pb.locator('#acctBtn img').count()) === 0 && (await pb.locator('#acctBtn .pic').textContent()).trim().length > 0);

// 4. téléphone
const m = await b.newContext({ ...base, viewport: { width: 390, height: 844 }, hasTouch: true, storageState: await ctx.storageState() });
const pm = await m.newPage(); await pm.goto('http://localhost:8090/#/profile'); await pm.waitForSelector('.idblock img'); await pm.waitForTimeout(500);
await pm.screenshot({ path: (process.env.E2E_OUT || '.out') + '/av-mobile.png' });
ok('téléphone : barre sur une ligne et pas de débordement', await pm.evaluate(() => document.querySelector('.appbar').getBoundingClientRect().height <= 60 && document.documentElement.scrollWidth <= innerWidth));
ok('aucune erreur JavaScript', errs.length === 0, errs.join(' | '));
await b.close();
