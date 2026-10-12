import { chromium } from 'playwright';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
const base = { extraHTTPHeaders: { 'CF-Connecting-IP': '1.2.3.4' } };
const ok = (n, c, x) => console.log((c ? 'OK   ' : 'FAIL ') + n + (!c && x !== undefined ? '  ' + x : ''));
const login = async (ctx) => { const p = await ctx.newPage(); await p.goto('http://localhost:8090/'); await p.waitForSelector('#providers button'); await Promise.all([ctx.waitForEvent('page'), p.click('#providers button')]); await p.waitForSelector('#app:not([hidden])'); return p };
const fire = (p) => p.evaluate(() => { window.__prompted = 0; const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = async () => { window.__prompted++ }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e) });
const ctx = await b.newContext({ ...base, viewport: { width: 1440, height: 900 } });
const p = await login(ctx); const state = await ctx.storageState();

// 1. Chrome juge-t-il l'application installable ?
const cdp = await ctx.newCDPSession(p);
await p.reload(); await p.waitForSelector('#app:not([hidden])'); await p.waitForTimeout(800);
const errs = (await cdp.send('Page.getInstallabilityErrors')).installabilityErrors || [];
const blocking = errs.filter((e) => e.errorId !== 'in-incognito'); // le navigateur de test est en mode privé : seul obstacle attendu
ok('Chrome : tous les critères d\'installation sont remplis (obstacles hors mode privé : ' + (blocking.length ? blocking.map((e) => e.errorId).join(', ') : 'aucun') + ')', blocking.length === 0, JSON.stringify(errs));
const mf = await cdp.send('Page.getAppManifest'); ok('Chrome lit le manifeste sans erreur', (mf.errors || []).length === 0 && mf.url.endsWith('manifest.webmanifest'), JSON.stringify(mf.errors));

// 2. proposition + installation
ok('aucun bandeau tant que le navigateur ne signale rien', !(await p.locator('#installbar').isVisible()));
await fire(p); await p.waitForSelector('#installbar:not([hidden])');
ok('bandeau d\'installation affiché', (await p.locator('#installbar').textContent()).includes('Installez JobRadar'));
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/in-banner.png', clip: { x: 0, y: 0, width: 1440, height: 160 } });
await p.click('#instGo'); await p.waitForTimeout(300);
ok('« Installer » ouvre l\'invite native du navigateur', (await p.evaluate(() => window.__prompted)) === 1);
ok('le bandeau disparaît après l\'installation', !(await p.locator('#installbar').isVisible()));

// 3. « Plus tard » : repoussé de 14 jours, le menu reste
await p.reload(); await p.waitForSelector('#app:not([hidden])'); await fire(p); await p.waitForSelector('#installbar:not([hidden])');
await p.click('#instLater'); await p.waitForTimeout(200);
const until = await p.evaluate(() => Number(localStorage.getItem('jr_install_until')));
ok('« Plus tard » masque le bandeau pour ~14 jours', !(await p.locator('#installbar').isVisible()) && until > Date.now() + 13 * 86400000 && until < Date.now() + 15 * 86400000);
await p.reload(); await p.waitForSelector('#app:not([hidden])'); await fire(p); await p.waitForTimeout(300);
ok('après rechargement : toujours masqué (repoussé)', !(await p.locator('#installbar').isVisible()));
await p.click('#acctBtn'); ok('mais « Installer l\'application » reste dans le menu du compte', (await p.locator('#acctMenu').textContent()).includes("Installer l'application"));
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/in-menu.png', clip: { x: 900, y: 0, width: 540, height: 380 } });
await p.click('#installBtn'); await p.waitForTimeout(300);
ok('l\'entrée du menu ouvre l\'invite native', (await p.evaluate(() => window.__prompted)) === 1);
// 4. deux refus : plus jamais proposé automatiquement
await p.evaluate(() => { localStorage.setItem('jr_install_dismissed', '1'); localStorage.removeItem('jr_install_until') });
await p.reload(); await p.waitForSelector('#app:not([hidden])'); await fire(p); await p.waitForSelector('#installbar:not([hidden])'); await p.click('#instLater');
await p.evaluate(() => localStorage.removeItem('jr_install_until')); await p.reload(); await p.waitForSelector('#app:not([hidden])'); await fire(p); await p.waitForTimeout(300);
ok('après deux « Plus tard » : plus de bandeau, même après le délai', !(await p.locator('#installbar').isVisible()));
// 5. événement appinstalled
await p.evaluate(() => { localStorage.removeItem('jr_install_dismissed'); localStorage.removeItem('jr_install_until') }); await p.reload(); await p.waitForSelector('#app:not([hidden])'); await fire(p); await p.waitForSelector('#installbar:not([hidden])');
await p.evaluate(() => window.dispatchEvent(new Event('appinstalled'))); await p.waitForSelector('#toast div');
ok('appinstalled : confirmation et bandeau retiré', (await p.locator('#toast').textContent()).includes('installée') && !(await p.locator('#installbar').isVisible()));

// 6. déjà installée (mode autonome) : rien n'est proposé
const sa = await b.newContext({ ...base, viewport: { width: 1440, height: 900 }, storageState: state });
await sa.addInitScript(() => { const mm = window.matchMedia.bind(window); window.matchMedia = (q) => (q.includes('display-mode: standalone') ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q)) });
const ps = await sa.newPage(); await ps.goto('http://localhost:8090/'); await ps.waitForSelector('#app:not([hidden])'); await fire(ps); await ps.waitForTimeout(300);
await ps.click('#acctBtn');
ok('application déjà installée : ni bandeau ni entrée de menu', !(await ps.locator('#installbar').isVisible()) && !(await ps.locator('#acctMenu').textContent()).includes("Installer l'application"));

// 7. iPhone (Safari) : pas d'invite native, un mode d'emploi
const ios = await b.newContext({ ...base, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', storageState: state });
const pi = await ios.newPage(); await pi.goto('http://localhost:8090/#/search'); await pi.waitForSelector('#app:not([hidden])'); await pi.waitForSelector('#installbar:not([hidden])');
ok('iPhone : bandeau avec « Comment faire »', (await pi.locator('#instGo').textContent()).includes('Comment faire'));
await pi.screenshot({ path: (process.env.E2E_OUT || '.out') + '/in-ios.png' });
await pi.click('#instGo'); await pi.waitForSelector('#dialog[open]');
ok('iPhone : mode d\'emploi (Partager, Sur l\'écran d\'accueil)', (await pi.locator('#dialog').textContent()).includes("Sur l'écran d'accueil") && (await pi.locator('#dialog').textContent()).includes('Partager'));
await pi.screenshot({ path: (process.env.E2E_OUT || '.out') + '/in-ios-help.png' });
ok('iPhone : aucun débordement horizontal', await pi.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await b.close();
