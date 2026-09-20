import { chromium } from 'playwright';
import { existsSync, unlinkSync, readFileSync } from 'node:fs';
const rmCalls = () => existsSync((process.env.E2E_TMP || '/tmp') + '/fake_calls.log') && unlinkSync((process.env.E2E_TMP || '/tmp') + '/fake_calls.log');
const calls = () => existsSync((process.env.E2E_TMP || '/tmp') + '/fake_calls.log') ? readFileSync((process.env.E2E_TMP || '/tmp') + '/fake_calls.log', 'utf8').trim().split('\\n').filter(Boolean).length : 0;
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
const mk = async (opts = {}) => b.newContext({ extraHTTPHeaders: { 'CF-Connecting-IP': '1.2.3.4' }, viewport: { width: 1440, height: 900 }, ...opts });
let ctx = await mk(); let p = await ctx.newPage(); const errs = [];
const watch = (pg) => { pg.on('console', m => m.type() === 'error' && errs.push(m.text())); pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); };
watch(p);
const ok = (name, cond) => console.log((cond ? 'OK   ' : 'FAIL ') + name);
const txt = async (sel) => (await p.locator(sel).first().textContent().catch(() => '')) || '';
const chip = (site) => p.locator('label.site-chip', { hasText: site });
const checked = (v) => p.locator('.site[value=' + v + ']').isChecked();

// connexion
await p.goto('http://localhost:8090/'); await p.waitForSelector('#providers button');
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/s-login.png' });
await Promise.all([ctx.waitForEvent('page'), p.click('#providers button')]); await p.waitForSelector('#app:not([hidden])');
ok('connexion -> app', await p.locator('#app').isVisible());
ok('police Barlow chargée', await p.evaluate(async () => { await document.fonts.ready; return document.fonts.check('700 20px "Barlow Semi Condensed"') && document.fonts.check('400 16px Barlow') }));
ok('bouton "Terminer la configuration" visible', (await txt('.setup')).includes('Terminer la configuration'));

// menu de compte
await p.click('#acctBtn'); ok('menu ouvert', await p.locator('#acctMenu').isVisible());
ok('menu : Mon profil / Paramètres / Se déconnecter', (await txt('#acctMenu')).includes('Mon profil') && (await txt('#acctMenu')).includes('Paramètres') && (await txt('#acctMenu')).includes('Se déconnecter'));
ok('focus sur le premier élément', await p.evaluate(() => document.activeElement?.getAttribute('role') === 'menuitem'));
await p.keyboard.press('ArrowDown'); ok('flèche bas : élément suivant', (await p.evaluate(() => document.activeElement?.textContent || '')).includes('Paramètres'));
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/s-menu.png' });
await p.keyboard.press('Escape'); ok('Échap ferme le menu et rend le focus', !(await p.locator('#acctMenu').isVisible()) && await p.evaluate(() => document.activeElement?.id === 'acctBtn'));

// recherche sans IA
await p.fill('#q', 'développeur web'); await p.fill('#loc', 'Lyon'); await p.fill('#n', '3');
if (await checked('linkedin')) await chip('LinkedIn').click();
await p.click('#go'); await p.waitForSelector('#dialog[open]');
ok('popup de suggestion', (await txt('#dialog')).includes('Activer les scores') && (await txt('#dialog')).includes('Configurer votre IA'));
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/s-nudge.png' });
await p.click('[data-close=go]'); await p.waitForSelector('.rowitem', { timeout: 120000 });
ok('offres affichées sans IA', (await p.locator('.rowitem').count()) > 0);
ok('panneaux "non évalué"', /[–~]/.test(await txt('.rowitem .match')));
await p.locator('.rowitem').first().click();
ok('description visible et rendue', await p.locator('#detail .md').isVisible() && !(await p.locator('#detail .md').innerHTML()).includes('**'));
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/s-search-noai.png' });

// profil sans IA
await p.click('nav [data-nav=profile]'); await p.waitForSelector('.import');
ok('import PDF désactivé sans IA', await p.locator('#pdf').isDisabled()); ok('saisie manuelle possible', await p.locator('#manual').isEnabled());
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/s-profile-import.png' });

// paramètres via le menu de compte
await p.click('#acctBtn'); await p.click('#acctMenu a[href="#/settings"]'); await p.waitForSelector('#prov');
await p.selectOption('#prov', 'fake'); await p.fill('#key', 'bad'); await p.click('#saveKey'); await p.waitForSelector('#toast div.err');
ok('mauvaise clé refusée', (await txt('#toast')).includes('refusée'));
await p.fill('#key', 'good'); await p.click('#saveKey'); await p.waitForSelector('.banner.ok');
ok('IA configurée', (await txt('.banner.ok')).includes('IA configurée'));
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/s-settings.png' });

// import du PDF, correction, enregistrement
await p.click('nav [data-nav=profile]'); await p.waitForSelector('#pdf:not([disabled])', { state: 'attached' });
await p.setInputFiles('#pdf', new URL('../fixtures/cv.pdf', import.meta.url).pathname); await p.waitForSelector('.savebar', { timeout: 60000 });
ok('profil extrait', (await p.inputValue('[data-path="identite.nom"]')) === 'Alice Martin');
ok('2 expériences', (await p.locator('[aria-label^="Expérience"]').count()) === 2);
ok('bandeau À vérifier', (await txt('.banner')).includes('À vérifier'));
ok('sommaire du profil', (await p.locator('.toc a').count()) === 6);
ok('boutons ↑↓✕ sont des icônes dessinées', (await p.locator('.tools svg').count()) >= 6 && !(await txt('.tools')).match(/[↑↓✕]/));
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/s-profile.png' });
await p.selectOption('[data-path="experiences.1.categorie"]', 'Alternance'); await p.fill('[data-path="experiences.1.poste"]', 'Alternant Node');
await p.fill('[data-path="competences.0.items"]', 'JavaScript, Python, SQL'); await p.click('[data-act="add:langues"]'); await p.fill('[data-path="langues.1.langue"]', 'Anglais');
await p.check('[data-check="recherche.contrats"][value=CDD]');
ok('indicateur de modifications', await p.locator('#dirty').isVisible());
await p.click('#save'); await p.waitForFunction(() => /Profil enregistré/.test(document.querySelector('#toast')?.textContent || ''), null, { timeout: 15000 }).catch(() => {}); ok('profil enregistré', (await p.locator('#toast').textContent()).includes('Profil enregistré'));
await p.waitForFunction(() => !document.querySelector('.setup'), null, { timeout: 8000 }).catch(() => {});
ok('bouton de configuration disparu', (await p.locator('.setup').count()) === 0);
await p.reload(); await p.waitForSelector('#app:not([hidden])'); await p.click('nav [data-nav=profile]'); await p.waitForSelector('.savebar');
ok('persisté : catégorie, poste, compétences, CDD', (await p.inputValue('[data-path="experiences.1.categorie"]')) === 'Alternance' && (await p.inputValue('[data-path="experiences.1.poste"]')) === 'Alternant Node' && (await p.inputValue('[data-path="competences.0.items"]')).includes('SQL') && await p.locator('[data-check="recherche.contrats"][value=CDD]').isChecked());

// recherche avec IA : lots, panneaux de match
await p.click('nav [data-nav=search]'); await p.waitForSelector('#q');
ok('recherche préremplie depuis le profil', (await p.inputValue('#q')) !== '' && (await p.locator('.tagc').allInnerTexts()).join().includes('Lyon'));
await p.fill('#n', '3'); if (await checked('linkedin')) await chip('LinkedIn').click();
await p.click('#go'); await p.waitForSelector('.match.t-strong, .match.t-mid', { timeout: 120000 });
ok('pas de popup quand tout est configuré', !(await p.locator('#dialog[open]').count()));
ok('scores en panneaux (90 fort, lot)', (await txt('.rowitem .match')).includes('90') && (await p.locator('.match.t-strong').count()) > 0);
await p.locator('.rowitem').first().click(); await p.waitForSelector('.dists');
ok('détail : deux grandes distances + modifications', (await p.locator('.dists .match.big').count()) === 2 && (await txt('#detail')).includes('Modifications proposées'));
ok('modifs non chargées d\'office (CTA)', (await p.locator('#evalOne').count()) === 1);
await p.click('#evalOne'); await p.waitForSelector('.modif', { timeout: 60000 });
ok('analyse détaillée : scores affichés (72)', (await txt('.dists')).includes('72'));
ok('sélection : pastille jaune', await p.evaluate(() => getComputedStyle(document.querySelector('.rowitem[aria-current=true] .roundel')).backgroundColor === 'rgb(255, 213, 0)'));
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/s-search-desktop.png' });
await p.click('#acctBtn'); await p.waitForTimeout(400); await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/s-menu2.png', clip: { x: 900, y: 0, width: 540, height: 340 } }); await p.keyboard.press('Escape');
await p.screenshot({ path: (process.env.E2E_OUT || '.out') + '/s-search-desktop-full.png', fullPage: true });
const cx = await p.evaluate(() => { const m = document.querySelector('main').getBoundingClientRect(); return Math.abs((m.left + m.right) / 2 - innerWidth / 2) < 12 });
ok('contenu centré dans la fenêtre', cx);
ok('aucun débordement horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

// mémoire : la même recherche ne repaie pas les offres déjà évaluées
rmCalls();
const titles1 = await p.locator('.rowitem b').allTextContents();
await p.click('#go'); await p.waitForFunction(() => /mémoire/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 120000 });
ok('mémoire : offres déjà évaluées signalées', /déjà évaluée/.test(await txt('#status')) || /en mémoire/.test(await txt('#status')));
const titles2 = await p.locator('.rowitem b').allTextContents(); const same = JSON.stringify([...titles1].sort()) === JSON.stringify([...titles2].sort()); console.log('   mêmes offres entre les deux recherches:', same, titles1.length, titles2.length);
const newOffers = titles2.filter((t) => !titles1.includes(t)).length; // les sites en direct renvoient parfois une offre différente
const logged = existsSync((process.env.E2E_TMP || '/tmp') + '/fake_calls.log') ? readFileSync((process.env.E2E_TMP || '/tmp') + '/fake_calls.log', 'utf8').trim().split('\\n').filter(Boolean) : [];
const evaluated = logged.reduce((n, l) => n + (+l.split(':')[1] || 0), 0);
ok('mémoire : seules les offres nouvelles sont évaluées (' + evaluated + ' évaluée(s) pour ' + newOffers + ' nouvelle(s))', evaluated <= newOffers); if (calls() !== 0) console.log('   DETAIL appels:', readFileSync((process.env.E2E_TMP || '/tmp') + '/fake_calls.log', 'utf8').trim().replace(/\n/g, ' '), '| statut:', await txt('#status'), '| offres:', titles2.length);

// sombre et mobile
const dark = await mk({ colorScheme: 'dark', storageState: await ctx.storageState() }); const pd = await dark.newPage(); watch(pd);
await pd.goto('http://localhost:8090/#/search'); await pd.waitForSelector('#app:not([hidden])'); await pd.waitForTimeout(500); await pd.screenshot({ path: (process.env.E2E_OUT || '.out') + '/s-dark-search.png' });
await pd.goto('http://localhost:8090/#/profile'); await pd.waitForSelector('.savebar'); await pd.screenshot({ path: (process.env.E2E_OUT || '.out') + '/s-dark-profile.png' });
const mob = await mk({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState(), hasTouch: true }); const pm = await mob.newPage(); watch(pm);
await pm.goto('http://localhost:8090/#/search'); await pm.waitForSelector('#app:not([hidden])'); await pm.screenshot({ path: (process.env.E2E_OUT || '.out') + '/s-mobile-search.png', fullPage: true });
ok('mobile : aucun débordement horizontal', await pm.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await pm.goto('http://localhost:8090/#/profile'); await pm.waitForSelector('.savebar'); await pm.screenshot({ path: (process.env.E2E_OUT || '.out') + '/s-mobile-profile.png' });
ok('mobile profil : aucun débordement horizontal', await pm.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

const real = errs.filter((e) => !e.includes('400 (Bad Request)'));
ok('aucune erreur console / CSP (hors 400 volontaire)', real.length === 0); if (real.length) console.log(real.slice(0, 6));
await b.close();
