import { chromium } from 'playwright';
import crypto from 'node:crypto';
import { existsSync, unlinkSync, readFileSync } from 'node:fs';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
const ctx = await b.newContext({ extraHTTPHeaders: { 'CF-Connecting-IP': '1.2.3.4' }, viewport: { width: 1440, height: 900 }, permissions: ['notifications'] });
const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
const P256 = ecdh.getPublicKey().toString('base64url'), AUTH = crypto.randomBytes(16).toString('base64url');
await ctx.addInitScript(({ P256, AUTH }) => {  // abonnement push simulé : un Chrome automatisé n'a pas accès au vrai service de push
  let sub = null;
  PushManager.prototype.subscribe = async function () { sub = { endpoint: 'http://127.0.0.1:9997/push/e2e', toJSON() { return { endpoint: this.endpoint, keys: { p256dh: P256, auth: AUTH } } }, unsubscribe: async () => { sub = null; return true } }; return sub };
  PushManager.prototype.getSubscription = async function () { return sub };
}, { P256, AUTH });
const p = await ctx.newPage(); const errs = []; p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
const ok = (n, c, x) => console.log((c ? 'OK   ' : 'FAIL ') + n + (!c && x ? '  ' + x : ''));
const txt = async (s) => (await p.locator(s).first().textContent().catch(() => '')) || '';
await p.goto('http://localhost:8090/'); await p.waitForSelector('#providers button');
await Promise.all([ctx.waitForEvent('page'), p.click('#providers button')]); await p.waitForSelector('#app:not([hidden])');

// --- PWA
const sw = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return { scope: r.scope, active: !!r.active } });
ok('service worker enregistré et actif', sw.active && sw.scope === 'http://localhost:8090/', JSON.stringify(sw));
const man = await p.evaluate(async () => { const r = await fetch('/manifest.webmanifest'); return { ct: r.headers.get('content-type'), j: await r.json() } });
ok('manifeste valide (nom, mode autonome, 3 icônes)', man.j.name === 'JobRadar' && man.j.display === 'standalone' && man.j.icons.length === 3, JSON.stringify(man));
console.log('   type MIME du manifeste:', man.ct);
const icons = await p.evaluate(async () => Promise.all(['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/badge-72.png', 'icons/favicon.svg'].map(async (u) => { const r = await fetch('/' + u); return [u, r.status, r.headers.get('content-type')] })));
ok('icônes servies', icons.every(([, s]) => s === 200), JSON.stringify(icons));
ok('méta PWA dans la page', await p.evaluate(() => !!document.querySelector('link[rel=manifest]') && !!document.querySelector('meta[name=theme-color]') && !!document.querySelector('link[rel=apple-touch-icon]')));
ok('sw.js servi sans cache', (await p.evaluate(async () => (await fetch('/sw.js')).headers.get('cache-control'))) === 'no-cache');

// --- plusieurs fournisseurs
await p.click('#acctBtn'); await p.click('#acctMenu a[href="#/settings"]'); await p.waitForSelector('#prov');
await p.selectOption('#prov', 'fake'); await p.fill('#key', 'good'); await p.click('#saveKey'); await p.waitForSelector('.provrow');
ok('un fournisseur : bandeau "IA configurée" + invitation au secours', (await txt('.banner.ok')).includes('IA configurée') && (await txt('.banner.ok')).includes('secours'));
await p.selectOption('#prov', 'fake2'); await p.fill('#key', 'good'); await p.click('#saveKey'); await p.waitForFunction(() => document.querySelectorAll('.provrow').length === 2);
ok('deux fournisseurs listés avec leur rang', (await p.locator('.provrow').count()) === 2 && (await txt('.provrow .rank')) === '1');
ok('bandeau : bascule automatique', (await txt('.banner.ok')).includes('Bascule automatique'));
ok('le principal est signalé', (await p.locator('.provrow').first().textContent()).includes('Principal'));
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/pw-settings.png', fullPage: false });
await p.locator('.provrow').nth(1).locator('[data-mv="-1"]').click(); await p.waitForFunction(() => document.querySelector('.provrow .grow b')?.textContent.includes('Second'));
ok('réordonnancement : le second devient principal', (await p.locator('.provrow').first().textContent()).includes('Second fournisseur') && (await p.locator('.provrow').first().textContent()).includes('Principal'));
await p.click('#acctBtn'); ok('menu : "IA · … +1"', (await txt('#acctMenu')).includes('+1')); await p.keyboard.press('Escape');
// retirer
p.once('dialog', (d) => d.accept()); await p.locator('.provrow').nth(1).locator('[data-rm]').click(); await p.waitForFunction(() => document.querySelectorAll('.provrow').length === 1);
ok('retrait d\'un fournisseur', (await p.locator('.provrow').count()) === 1);

// --- notifications
await p.waitForSelector('#pushToggle');
ok('carte Notifications : bouton Activer', (await txt('#pushToggle')).includes('Activer'));
if (existsSync((process.env.E2E_TMP || '/tmp') + '/push_hits.log')) unlinkSync((process.env.E2E_TMP || '/tmp') + '/push_hits.log');
await p.click('#pushToggle'); await p.waitForFunction(() => document.querySelector('#pushToggle')?.textContent.includes('Désactiver'), null, { timeout: 15000 }).catch(() => {});
ok('abonnement de cet appareil enregistré', (await txt('#pushToggle')).includes('Désactiver') && (await p.locator('.devs li').count()) === 1, await txt('#toast'));
ok('appareil listé avec son nom', (await txt('.devs')).includes('Chrome'));
await p.click('#pushTest'); await p.waitForSelector('#toast div'); await p.waitForTimeout(800);
const hits = existsSync((process.env.E2E_TMP || '/tmp') + '/push_hits.log') ? readFileSync((process.env.E2E_TMP || '/tmp') + '/push_hits.log', 'utf8').trim().split('\n').filter(Boolean) : [];
ok('notification de test réellement envoyée au service de push', hits.length === 1, (await txt('#toast')) + ' | hits=' + hits.length);
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/pw-notifs.png', fullPage: true });
p.once('dialog', (d) => d.accept()); await p.click('#pushToggle'); await p.waitForFunction(() => document.querySelector('#pushToggle')?.textContent.includes('Activer'), null, { timeout: 15000 }).catch(() => {});
ok('désactivation de cet appareil', (await txt('#pushToggle')).includes('Activer') && (await p.locator('.devs li').count()) === 0);

// mobile
const m = await b.newContext({ extraHTTPHeaders: { 'CF-Connecting-IP': '1.2.3.4' }, viewport: { width: 390, height: 844 }, hasTouch: true, storageState: await ctx.storageState() }); const pm = await m.newPage();
await pm.goto('http://localhost:8090/#/settings'); await pm.waitForSelector('.provrow'); await pm.screenshot({ path: (process.env.E2E_OUT || '.out') + '/pw-mobile.png', fullPage: true });
ok('mobile : aucun débordement horizontal', await pm.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
const real = errs.filter((e) => !e.includes('400 (Bad Request)') && !/404/.test(e));
ok('aucune erreur console / CSP', real.length === 0, real.slice(0, 3).join(' | '));
await b.close();
