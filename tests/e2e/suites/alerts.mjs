import { chromium } from 'playwright';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
const ctx = await b.newContext({ extraHTTPHeaders: { 'CF-Connecting-IP': '1.2.3.4' }, viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage(); const errs = []; p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
const ok = (n, c) => console.log((c ? 'OK   ' : 'FAIL ') + n);
const txt = async (s) => (await p.locator(s).first().textContent().catch(() => '')) || '';
await p.goto('http://localhost:8090/'); await p.waitForSelector('#providers button');
await Promise.all([ctx.waitForEvent('page'), p.click('#providers button')]); await p.waitForSelector('#app:not([hidden])');
// préparer : IA + profil via l'interface existante
await p.click('#acctBtn'); await p.click('#acctMenu a[href="#/settings"]'); await p.waitForSelector('#prov');
await p.selectOption('#prov', 'fake'); await p.fill('#key', 'good'); await p.click('#saveKey'); await p.waitForSelector('.banner.ok');
await p.click('nav [data-nav=profile]'); await p.waitForSelector('#manual'); await p.click('#manual'); await p.waitForSelector('.savebar');
await p.fill('[data-path="identite.titre"]', 'Développeur web'); await p.fill('[data-path="resume"]', 'Développeur React et Node, deux ans.');
await p.click('[data-act="add:experiences"]'); await p.fill('[data-path="experiences.0.poste"]', 'Dev'); await p.click('#save'); await p.waitForSelector('#toast div');

// page Alertes vide
await p.click('nav [data-nav=alerts]'); await p.waitForSelector('#newAlert', { timeout: 8000 }).catch(async () => { console.log('VIEW:', (await p.locator('#view').innerText()).slice(0, 300)); console.log('ERRS:', errs.slice(0, 5)); process.exit(1) });
ok('onglet Alertes dans la navigation', (await p.locator('nav.tabs a').count()) === 3);
ok('état vide expliqué', (await txt('.empty')).includes('Aucune alerte'));
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/al-empty.png' });

// créer une alerte
await p.click('#newAlert'); await p.waitForSelector('#alertForm');
await p.fill('#alertForm [name=query]', 'développeur'); await p.fill('#alertForm [name=location]', 'Lyon'); await p.fill('#alertForm [name=name]', 'Dev à Lyon');
await p.locator('#alertForm label.site-chip', { hasText: 'Indeed' }).click();
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/al-dialog.png' });
await p.click('#alertForm button[type=submit]'); await p.waitForSelector('.alertrow');
ok('alerte créée et listée', (await txt('.alertrow')).includes('Dev à Lyon') && (await txt('.alertrow')).includes('score ≥ 70'));
ok('premier passage annoncé', (await txt('.alertrow .status')).includes('demain matin'));

// lancer maintenant : passage en cours puis rapport
await p.click('[data-run]'); await p.waitForSelector('.alertrow .spin');
ok('passage en cours affiché', (await txt('.alertrow .status')).includes('en cours'));
await p.waitForFunction(() => !document.querySelector('.alertrow .spin') && /retenue/.test(document.querySelector('.alertrow .status')?.textContent || ''), null, { timeout: 180000 });
ok('statut après passage (offres retenues)', /retenue/.test(await txt('.alertrow .status')));
await p.waitForSelector('.run .rowitem');
ok('rapport : offres avec scores en panneaux', (await p.locator('.run .rowitem .match').count()) > 0);
ok('rapport signalé "Nouveau" à l\'arrivée', (await txt('.run .tag')).includes('Nouveau') || (await p.locator('#alertBadge').isVisible()));
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/al-report.png' });
await p.waitForTimeout(2600);
ok('pastille de non-lus (avant lecture) puis effacée', !(await p.locator('#alertBadge').isVisible()));

// pause / reprise
await p.uncheck('[data-toggle]', { force: true }).catch(async () => { await p.locator('.switch').first().click() });
await p.waitForSelector('#toast div'); ok('alerte mise en pause', (await txt('#toast')).includes('pause'));

// créer depuis la recherche
await p.click('nav [data-nav=search]'); await p.waitForSelector('#q'); await p.fill('#q', 'développeur web'); await p.fill('#loc', 'Lyon'); await p.fill('#n', '2');
await p.click('#go'); await p.waitForSelector('.rowitem', { timeout: 120000 });
await p.click('#mkAlert'); await p.waitForSelector('#alertForm');
ok('création depuis la recherche : champs préremplis', (await p.inputValue('#alertForm [name=query]')) === 'développeur web' && (await p.inputValue('#alertForm [name=location]')) === 'Lyon');
await p.click('#alertForm button[type=submit]'); await p.waitForSelector('#toast div');

// plafond
await p.click('nav [data-nav=alerts]'); await p.waitForSelector('.alertrow');
for (let i = 0; i < 2; i++) { if (await p.locator('#newAlert').isDisabled()) break; await p.click('#newAlert'); await p.waitForSelector('#alertForm'); await p.fill('#alertForm [name=query]', 'test ' + i); await p.click('#alertForm button[type=submit]'); await p.waitForTimeout(700); }
ok('plafond de 3 alertes (bouton désactivé)', await p.locator('#newAlert').isDisabled());
// mobile
const m = await b.newContext({ extraHTTPHeaders: { 'CF-Connecting-IP': '1.2.3.4' }, viewport: { width: 390, height: 844 }, hasTouch: true, storageState: await ctx.storageState() }); const pm = await m.newPage();
await pm.goto('http://localhost:8090/#/alerts'); await pm.waitForSelector('.alertrow'); await pm.screenshot({ path: (process.env.E2E_OUT || '.out') + '/al-mobile.png' });
ok('mobile : aucun débordement horizontal', await pm.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
ok('mobile : barre sur une ligne', await pm.evaluate(() => document.querySelector('.appbar').getBoundingClientRect().height <= 60));
const real = errs.filter((e) => !e.includes('400 (Bad Request)') && !e.includes('404'));
ok('aucune erreur console / CSP', real.length === 0); if (real.length) console.log(real.slice(0, 5));
await b.close();
