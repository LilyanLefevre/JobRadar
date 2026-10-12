import { chromium } from 'playwright';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
const base = { extraHTTPHeaders: { 'CF-Connecting-IP': '1.2.3.4' } };
const ok = (n, c, x) => console.log((c ? 'OK   ' : 'FAIL ') + n + (!c && x !== undefined ? '  ' + x : ''));
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
const P256 = ecdh.getPublicKey().toString('base64url'), AUTH = crypto.randomBytes(16).toString('base64url');
const stub = ({ P256, AUTH }) => {  // abonnement push simulé mais persistant entre les rechargements, comme dans un vrai navigateur
  const mk = () => ({ endpoint: 'http://127.0.0.1:9997/push/n' + Math.random().toString(16).slice(2, 8), toJSON() { return { endpoint: this.endpoint, keys: { p256dh: P256, auth: AUTH } } }, unsubscribe: async () => { localStorage.removeItem('stubsub'); return true } });
  PushManager.prototype.subscribe = async function () { const s = mk(); localStorage.setItem('stubsub', s.endpoint); return s };
  PushManager.prototype.getSubscription = async function () { const e = localStorage.getItem('stubsub'); return e ? { ...mk(), endpoint: e } : null };
};
const newCtx = (extra = {}) => b.newContext({ ...base, viewport: { width: 1440, height: 900 }, permissions: ['notifications'], ...extra });
const ctx = await newCtx(); await ctx.addInitScript(stub, { P256, AUTH });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await p.goto('http://localhost:8090/'); await p.waitForSelector('#providers button');
await Promise.all([ctx.waitForEvent('page'), p.click('#providers button')]); await p.waitForSelector('#app:not([hidden])');
const uid = await p.evaluate(() => JSON.parse(localStorage.getItem('pocketbase_auth')).record.id);
const su = sh("curl -s localhost:8090/api/collections/_superusers/auth-with-password -H 'Content-Type: application/json' -d '{\"identity\":\"admin@test.local\",\"password\":\"adminpass123\"}' | python3 -c \"import sys,json;print(json.load(sys.stdin)['token'])\"");
const tok = sh("curl -s -X POST localhost:8090/api/collections/users/impersonate/" + uid + " -H 'Authorization: " + su + "' | python3 -c \"import sys,json;print(json.load(sys.stdin)['token'])\"");
const hide = async (pg) => !(await pg.locator('#installbar').isVisible());
const devices = () => JSON.parse(sh("curl -s localhost:8090/jr/push/devices -H 'Authorization: " + tok + "'")).devices.length;
const clearKeys = (pg) => pg.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('jr_notif_') || k.startsWith('jr_install_') || k === 'stubsub') localStorage.removeItem(k) });

// 1. sans alerte : rien à notifier, pas d'invitation
await p.reload(); await p.waitForSelector('#app:not([hidden])'); await p.waitForTimeout(600);
ok('aucune alerte : pas d\'invitation aux notifications', await hide(p));

// 2. création d'une alerte dans l'interface : l'invitation arrive aussitôt
await p.goto('http://localhost:8090/#/alerts'); await p.waitForSelector('#newAlert'); await p.click('#newAlert'); await p.waitForSelector('#alertForm');
await p.fill('#alertForm [name=query]', 'développeur'); await p.click('#alertForm button[type=submit]');
await p.waitForSelector('#installbar:not([hidden])', { timeout: 8000 }).catch(() => {});
ok('juste après la création d\'une alerte : invitation affichée sans recharger', (await p.locator('#installbar').isVisible()) && (await p.locator('#installbar').textContent()).includes('Activez les notifications'));
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/nt-banner.png', clip: { x: 0, y: 0, width: 1440, height: 160 } });

// 3. activer
await p.click('#ntGo'); await p.waitForFunction(() => document.querySelector('#installbar')?.hidden, null, { timeout: 15000 }).catch(() => {});
ok('« Activer » : appareil abonné côté serveur', devices() === 1, devices());
ok('l\'invitation disparaît une fois abonné', await hide(p));
await p.reload(); await p.waitForSelector('#app:not([hidden])'); await p.waitForTimeout(600);
ok('après rechargement : pas de nouvelle invitation (appareil déjà abonné)', await hide(p));

// 4. désactivation volontaire : on ne redemande pas
await p.goto('http://localhost:8090/#/settings'); await p.waitForSelector('#pushToggle'); await p.click('#pushToggle');
await p.waitForFunction(() => document.querySelector('#pushToggle')?.textContent.includes('Activer'), null, { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(500);
ok('désactivation volontaire : l\'invitation ne revient pas', await hide(p));
await p.reload(); await p.waitForSelector('#app:not([hidden])'); await p.waitForTimeout(500);
ok('…même après rechargement', await hide(p));

// 5. « Plus tard » : 7 jours, puis arrêt après deux refus
await clearKeys(p); await p.reload(); await p.waitForSelector('#installbar:not([hidden])');
await p.click('#ntLater'); await p.waitForTimeout(200);
const until = await p.evaluate(() => Number(localStorage.getItem('jr_notif_until')));
ok('« Plus tard » : masqué pour ~7 jours', await hide(p) && until > Date.now() + 6 * 86400000 && until < Date.now() + 8 * 86400000);
await p.reload(); await p.waitForSelector('#app:not([hidden])'); await p.waitForTimeout(500);
ok('…toujours masqué après rechargement', await hide(p));
await p.evaluate(() => { localStorage.removeItem('jr_notif_until') }); await p.reload(); await p.waitForSelector('#installbar:not([hidden])'); await p.click('#ntLater');
await p.evaluate(() => { localStorage.removeItem('jr_notif_until') }); await p.reload(); await p.waitForSelector('#app:not([hidden])'); await p.waitForTimeout(500);
ok('après deux « Plus tard » : plus jamais proposé automatiquement', await hide(p));
ok('mais les Paramètres permettent toujours d\'activer', await (async () => { await p.goto('http://localhost:8090/#/settings'); await p.waitForSelector('#pushToggle'); return (await p.locator('#pushToggle').textContent()).includes('Activer') })());

// 6. priorité : notifications d'abord, puis installation
await clearKeys(p); await p.goto('http://localhost:8090/#/search'); await p.reload(); await p.waitForSelector('#installbar:not([hidden])');
await p.evaluate(() => { window.__prompted = 0; const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = async () => { window.__prompted++ }; e.userChoice = Promise.resolve({ outcome: 'dismissed' }); window.dispatchEvent(e) }); await p.waitForTimeout(300);
ok('installation et notifications possibles : les notifications passent d\'abord', (await p.locator('#installbar').textContent()).includes('Activez les notifications'));
await p.click('#ntGo'); await p.waitForTimeout(800);
ok('une fois abonné, le bandeau d\'installation prend le relais', (await p.locator('#installbar').isVisible()) && (await p.locator('#installbar').textContent()).includes('Installez JobRadar'));

// 7. refus du navigateur : on n'insiste pas, les Paramètres expliquent
const den = await newCtx({ storageState: await ctx.storageState() }); await den.addInitScript(stub, { P256, AUTH });
await den.addInitScript(() => { Object.defineProperty(Notification, 'permission', { get: () => 'denied' }) });
const pd = await den.newPage(); await pd.goto('http://localhost:8090/#/search'); await pd.waitForSelector('#app:not([hidden])'); await pd.waitForTimeout(700);
ok('notifications bloquées par le navigateur : pas d\'invitation', await hide(pd));
await pd.goto('http://localhost:8090/#/settings'); await pd.waitForSelector('.banner.warn');
ok('Paramètres : explication pour réautoriser', (await pd.locator('#nt-t').locator('xpath=../..').textContent()).includes('bloquées'));

// 8. iPhone non installé : pas de notifications possibles, on propose d'installer
const ios = await newCtx({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', storageState: await ctx.storageState() });
const pi = await ios.newPage(); await pi.goto('http://localhost:8090/#/search'); await pi.waitForSelector('#installbar:not([hidden])');
ok('iPhone non installé : invitation à installer (pas aux notifications)', (await pi.locator('#installbar').textContent()).includes('Installez JobRadar'));

// 9. téléphone
const mo = await newCtx({ viewport: { width: 390, height: 844 }, hasTouch: true, storageState: await ctx.storageState() });
await mo.addInitScript(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('jr_notif_') || k.startsWith('jr_install_') || k === 'stubsub') localStorage.removeItem(k) }); await mo.addInitScript(stub, { P256, AUTH });
const pm = await mo.newPage(); await pm.goto('http://localhost:8090/#/search'); await pm.waitForSelector('#installbar:not([hidden])'); await pm.screenshot({ path: (process.env.E2E_OUT || '.out') + '/nt-mobile.png' });
ok('téléphone : bandeau compact, pas de débordement', await pm.evaluate(() => document.querySelector('#installbar').getBoundingClientRect().height < 130 && document.documentElement.scrollWidth <= innerWidth));
ok('aucune erreur JavaScript', errs.length === 0, errs.join(' | '));
await b.close();
