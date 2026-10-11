const pb = new PocketBase(location.origin);
const $ = s => document.querySelector(s);
const jobs = {};
let selected = null;
const cls = n => n >= 70 ? 'hi' : n >= 45 ? 'md' : 'lo';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const status = t => $('#status').textContent = t;

async function call(path, method = 'GET', body) {
  const r = await fetch('/jr/' + path, {method, body: body && JSON.stringify(body),
    headers: {'Content-Type': 'application/json', Authorization: pb.authStore.token}});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || j.message || 'Erreur ' + r.status);
  return j;
}

async function start() {
  const authed = pb.authStore.isValid && await pb.collection('users').authRefresh().then(() => true, () => false);
  $('#login').hidden = authed;
  $('#app').hidden = !authed;
  if (authed) return enter();
  try {
    const {oauth2} = await pb.collection('users').listAuthMethods();
    $('#providers').innerHTML = oauth2.providers.map(p => `<button data-p="${esc(p.name)}">Continuer avec ${esc(p.displayName)}</button>`).join('');
    if (!oauth2.providers.length) $('#loginMsg').textContent = "Aucun fournisseur de connexion n'est configuré.";
    document.querySelectorAll('#providers button').forEach(b => b.onclick = async () => {
      try { await pb.collection('users').authWithOAuth2({provider: b.dataset.p}); start(); }
      catch (e) { $('#loginMsg').textContent = 'Connexion impossible : ' + e.message; }
    });
  } catch (e) { $('#loginMsg').textContent = 'Serveur injoignable.'; }
}

async function enter() {
  const u = pb.authStore.record;
  $('#who').textContent = u.name || u.email || '';
  $('#cv').value = u.cv || '';
  keyState();
}
let providers = [];
async function keyState() {
  if (!providers.length) {
    providers = (await call('providers')).providers;
    $('#provider').innerHTML = providers.map(p => `<option value="${esc(p.id)}">${esc(p.label)}${p.free ? ' · gratuit' : ''}</option>`).join('');
    $('#provider').onchange = provNote;
  }
  const {has_key, provider} = await call('status');
  if (provider) $('#provider').value = provider;
  const label = providers.find(p => p.id === provider)?.label;
  $('#keyState').textContent = has_key ? `✓ Clé enregistrée (${label || provider}).` : 'Aucune clé : choisissez un fournisseur et ajoutez-la.';
  provNote();
}
function provNote() {
  const p = providers.find(p => p.id === $('#provider').value);
  $('#provNote').innerHTML = p ? `${esc(p.note)} <a href="${esc(p.key_url)}" target="_blank" rel="noopener">Obtenir une clé</a>` : '';
}

$('#delAccount').onclick = async () => {
  if (!confirm('Supprimer définitivement votre compte, votre CV et votre clé API ?')) return;
  await pb.collection('users').delete(pb.authStore.record.id);
  pb.authStore.clear(); start();
};
$('#logout').onclick = () => { pb.authStore.clear(); start(); };
$('#saveKey').onclick = async () => {
  try { await call('key', 'POST', {provider: $('#provider').value, key: $('#key').value}); $('#key').value = ''; keyState(); }
  catch (e) { $('#keyState').textContent = e.message; }
};
$('#delKey').onclick = async () => { await call('key', 'DELETE'); keyState(); };
$('#saveCv').onclick = async () => {
  await pb.collection('users').update(pb.authStore.record.id, {cv: $('#cv').value});
  status('CV enregistré.');
};

$('#go').onclick = async () => {
  if (!$('#q').value.trim() || !$('#cv').value.trim()) return status('Poste et CV requis.');
  $('#go').disabled = true;
  try {
    await pb.collection('users').update(pb.authStore.record.id, {cv: $('#cv').value});
    status('Recherche en cours (30 s environ)…');
    const res = await call('search', 'POST', {
      query: $('#q').value, location: $('#loc').value, n: $('#n').value, hours: $('#hours').value,
      sites: [...document.querySelectorAll('.site:checked')].map(e => e.value)});
    Object.keys(jobs).forEach(k => delete jobs[k]);
    res.jobs.forEach(j => jobs[j.id] = j);
    render();
    await evaluateAll(res.jobs);
  } catch (e) { status(e.message); }
  $('#go').disabled = false;
};

async function evaluateAll(list) {
  let done = 0;
  const queue = [...list];
  const worker = async () => {
    while (queue.length) {
      const j = queue.shift();
      jobs[j.id].ev = await call('evaluate', 'POST', j).catch(e => ({error: e.message}));
      status(`Évaluation ${++done}/${list.length}`);
      render();
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  status('Terminé.');
}

function render() {
  const sorted = Object.values(jobs).sort((a, b) => (b.ev?.match ?? -1) - (a.ev?.match ?? -1));
  $('#list').innerHTML = sorted.map(j => `
    <div class="job ${j.id === selected ? 'on' : ''}" data-id="${esc(j.id)}">
      <div class="score ${cls(j.ev?.match)}">${j.ev?.match ?? (j.ev?.error ? '!' : '…')}<i>match</i></div>
      <div><b>${esc(j.titre)}</b><small>${esc(j.entreprise)} · ${esc(j.lieu)} · ${esc(j.site)}</small></div>
    </div>`).join('') || '<p class="mute">Aucune offre trouvée.</p>';
  document.querySelectorAll('.job').forEach(e => e.onclick = () => { selected = e.dataset.id; render(); });
  if (selected) detail(jobs[selected]);
}

function detail(j) {
  const e = j.ev;
  let body = '<p class="mute">Évaluation en cours…</p>';
  if (e?.error) body = `<p class="lo">${esc(e.error)}</p>`;
  else if (e) body = `
    <div class="bars">
      <div class="${cls(e.match)}">${e.match}<small>Match profil / offre</small></div>
      <div class="${cls(e.cv_score)}">${e.cv_score}<small>CV pour cette offre</small></div>
    </div>
    <p>${esc(e.verdict)}</p>
    <h2>Forces</h2><ul>${(e.forces || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <h2>Manques</h2><ul>${(e.manques || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <h2>Modifications proposées</h2>
    ${(e.modifs || []).map(m => `<div class="card"><b>${esc(m.section)}</b>
      <div class="diff"><p class="old">${esc(m.avant)}</p><p class="new">${esc(m.apres)}</p></div>
      <small class="mute">${esc(m.pourquoi)}</small></div>`).join('')}`;
  const url = /^https?:\/\//.test(j.url) ? j.url : '#';
  $('#detail').innerHTML = `<h1>${esc(j.titre)}</h1>
    <p class="mute">${esc(j.entreprise)} · ${esc(j.lieu)} · <a href="${esc(url)}" target="_blank" rel="noopener">Voir l'offre</a></p>
    ${body}<details><summary>Description de l'offre</summary><pre>${esc(j.description)}</pre></details>`;
}

start();
