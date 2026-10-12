import { chromium } from 'playwright';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
const base = { extraHTTPHeaders: { 'CF-Connecting-IP': '1.2.3.4' } };
const ctx = await b.newContext({ ...base, viewport: { width: 1440, height: 900 } });
const p0 = await ctx.newPage(); const errs = []; p0.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
const ok = (n, c, x) => console.log((c ? 'OK   ' : 'FAIL ') + n + (!c && x !== undefined ? '  ' + x : ''));
await p0.goto('http://localhost:8090/'); await p0.waitForSelector('#providers button');
await Promise.all([ctx.waitForEvent('page'), p0.click('#providers button')]); await p0.waitForSelector('#app:not([hidden])');
await p0.click('#acctBtn'); await p0.click('#acctMenu a[href="#/settings"]'); await p0.waitForSelector('#prov');
await p0.selectOption('#prov', 'fake'); await p0.fill('#key', 'good'); await p0.click('#saveKey'); await p0.waitForSelector('.provrow');
await p0.click('nav [data-nav=profile]'); await p0.waitForSelector('#manual'); await p0.click('#manual'); await p0.waitForSelector('.savebar');
await p0.fill('[data-path="resume"]', 'Développeur React et Node, deux ans.'); await p0.click('[data-act="add:experiences"]'); await p0.fill('[data-path="experiences.0.poste"]', 'Dev'); await p0.click('#save'); await p0.waitForSelector('#toast div');
const state = await ctx.storageState();

// ---------- téléphone
const m = await b.newContext({ ...base, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, storageState: state });
const p = await m.newPage(); p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await p.goto('http://localhost:8090/#/search'); await p.waitForSelector('#q');
ok('avant recherche : formulaire visible, pas de résumé', await p.locator('#form').isVisible() && !(await p.locator('#searchsum').isVisible()));
await p.fill('#q', 'développeur web'); await p.fill('#loc', 'Lyon'); await p.fill('#n', '4');
await p.evaluate(() => { for (const v of ['indeed', 'linkedin', 'glassdoor']) { const i = document.querySelector('.site[value=' + v + ']'); if (i.checked) i.click() } });
await p.click('#go'); await p.waitForFunction(() => document.querySelectorAll('.match.t-strong,.match.t-mid,.match.t-low').length >= 3, null, { timeout: 120000 }); await p.waitForTimeout(700);
ok('après recherche : formulaire replié, résumé visible', !(await p.locator('#form').isVisible()) && await p.locator('#searchsum').isVisible());
ok('résumé : poste, lieu et sites', /développeur web/.test(await p.locator('#sumtxt').textContent()) && /Lyon/.test(await p.locator('#sumtxt').textContent()));
const y1 = await p.evaluate(() => document.querySelector('.rowitem').getBoundingClientRect().top);
ok('la première offre est dans le premier écran (y=' + Math.round(y1) + ' px sur 844)', y1 < 420, y1);
ok('le détail n\'est pas affiché sous la liste', !(await p.locator('#detail').isVisible()));
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/mo-list.png' });

await p.locator('.rowitem').first().tap(); await p.waitForTimeout(500);
ok('ouvrir une offre : la liste disparaît, le détail s\'affiche', !(await p.locator('.list').isVisible()) && await p.locator('#detail').isVisible());
ok('en haut de page', (await p.evaluate(() => scrollY)) === 0);
const pos = await p.evaluate(() => ({ title: document.querySelector('#detail h2').getBoundingClientRect().top, dists: document.querySelector('.dists')?.getBoundingClientRect().top }));
ok('titre et scores visibles sans défiler (titre y=' + Math.round(pos.title) + ', scores y=' + Math.round(pos.dists) + ')', pos.title < 220 && pos.dists < 520, JSON.stringify(pos));
ok('barre « Résultats » + « Voir l\'offre » visible', await p.locator('#back').isVisible() && (await p.locator('.detailbar a').textContent()).includes("Voir l'offre"));
ok('formulaire et titre de page masqués dans le détail', !(await p.locator('#searchsum').isVisible()) && !(await p.locator('.page-head').isVisible()));
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/mo-detail.png' });
await p.evaluate(() => scrollTo(0, 700)); await p.waitForTimeout(250);
ok('la barre reste collée en haut pendant le défilement', await p.evaluate(() => { const r = document.querySelector('.detailbar').getBoundingClientRect(); return r.top >= 50 && r.top <= 70 }));
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/mo-detail-scrolled.png' });

await p.evaluate(() => scrollTo(0, 0)); await p.locator('#back').tap(); await p.waitForTimeout(500);
ok('« Résultats » : retour à la liste', await p.locator('.list').isVisible() && !(await p.locator('#detail').isVisible()));
await p.locator('.rowitem').nth(1).tap(); await p.waitForTimeout(400);
await p.goBack(); await p.waitForTimeout(500);
ok('bouton retour du navigateur : retour à la liste', await p.locator('.list').isVisible() && !(await p.locator('#detail').isVisible()));
ok('on reste sur la page de recherche', p.url().includes('#/search'));
await p.locator('#editSearch').tap(); await p.waitForTimeout(300);
ok('« Modifier » rouvre le formulaire', await p.locator('#form').isVisible() && !(await p.locator('#searchsum').isVisible()));
ok('aucun débordement horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

// ---------- ordinateur : rien ne change
const d = await b.newContext({ ...base, viewport: { width: 1440, height: 900 }, storageState: state }); const pd = await d.newPage();
await pd.goto('http://localhost:8090/#/search'); await pd.waitForSelector('#q'); await pd.fill('#q', 'développeur web'); await pd.fill('#loc', 'Lyon'); await pd.fill('#n', '3');
await pd.evaluate(() => { for (const v of ['indeed', 'linkedin', 'glassdoor']) { const i = document.querySelector('.site[value=' + v + ']'); if (i.checked) i.click() } });
await pd.click('#go'); await pd.waitForFunction(() => document.querySelectorAll('.match.t-strong,.match.t-mid,.match.t-low').length >= 2, null, { timeout: 120000 });
ok('ordinateur : formulaire non replié, pas de résumé', await pd.locator('#form').isVisible() && !(await pd.locator('#searchsum').isVisible()));
await pd.locator('.rowitem').first().click(); await pd.waitForTimeout(300);
ok('ordinateur : liste et détail côte à côte', await pd.locator('.list').isVisible() && await pd.locator('#detail').isVisible());
ok('ordinateur : pas de barre de détail', !(await pd.locator('.detailbar').isVisible()));
// bascule de largeur avec un détail ouvert
await pd.setViewportSize({ width: 390, height: 844 }); await pd.waitForTimeout(400);
ok('réduction de la fenêtre : le détail passe en plein écran', !(await pd.locator('.list').isVisible()) && await pd.locator('#detail').isVisible());
await pd.setViewportSize({ width: 1440, height: 900 }); await pd.waitForTimeout(400);
ok('agrandissement : retour à la vue côte à côte', await pd.locator('.list').isVisible() && await pd.locator('#detail').isVisible());
ok('aucune erreur JavaScript', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close();
