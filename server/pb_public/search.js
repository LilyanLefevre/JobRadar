import { $, $$, esc, call, pb, state, toast, openDialog, closeDialog, dialogResult, canEvaluate, hasProfile, profile, store } from './lib.js'

const SITES = [['indeed', 'Indeed'], ['linkedin', 'LinkedIn'], ['glassdoor', 'Glassdoor']]
const cls = (n) => (n >= 70 ? 'hi' : n >= 45 ? 'md' : 'lo')
let running = false

const missing = () => [
  ...(state.key.has_key ? [] : [{ what: "Configurer votre IA", why: 'pour obtenir les scores et les conseils', to: '#/settings' }]),
  ...(hasProfile() ? [] : [{ what: 'Ajouter votre CV', why: 'pour comparer votre profil aux offres', to: '#/profile' }]),
]

export function render(root) {
  const r = profile()?.recherche || {}
  const f = state.form
  if (!f.q) f.q = r.metiers?.[0] || profile()?.identite?.titre || ''
  if (!f.loc) f.loc = r.lieux?.[0] || profile()?.identite?.lieu || ''
  const todo = missing()
  root.innerHTML = `
    <div class="page-head"><h1>Recherche d'offres</h1>
      <p class="muted">Cherchez d'abord, l'IA évalue ensuite chaque offre par rapport à votre profil.</p></div>
    ${todo.length ? `<div class="banner warn" role="status"><div><b>Scores désactivés</b>${todo.map((t) => `<a href="${t.to}">${t.what}</a>`).join(' · ')} ${todo.length ? 'pour activer les évaluations.' : ''} La recherche fonctionne déjà sans.</div></div><br>` : ''}
    <form class="card searchbar" id="form">
      <label class="field"><span>Poste</span><input id="q" value="${esc(f.q)}" placeholder="développeur web" required></label>
      <label class="field"><span>Lieu</span><input id="loc" value="${esc(f.loc)}" placeholder="Lyon, France"></label>
      <label class="field"><span>Résultats par site</span><input id="n" type="number" min="1" max="20" value="${esc(f.n)}"></label>
      <label class="field"><span>Publiées depuis</span><select id="hours">${[['24', '24 h'], ['72', '3 jours'], ['168', '7 jours'], ['720', '30 jours']].map(([v, l]) => `<option value="${v}" ${f.hours === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <button class="btn" id="go" type="submit">Lancer la recherche</button>
      <fieldset class="sites checks nofs"><legend class="sr-only">Sites</legend>
        ${SITES.map(([v, l]) => `<label class="check"><input type="checkbox" class="site" value="${v}" ${f.sites.includes(v) ? 'checked' : ''}>${l}</label>`).join('')}</fieldset>
    </form>
    <p class="small muted" id="status" role="status" aria-live="polite"></p>
    <div class="results"><div class="list" id="list"></div><div class="detail" id="detail"></div></div>`
  $('#form').onsubmit = (e) => { e.preventDefault(); launch() }
  paint()
}

function readForm() {
  Object.assign(state.form, { q: $('#q').value.trim(), loc: $('#loc').value.trim(), n: $('#n').value, hours: $('#hours').value, sites: $$('.site:checked').map((e) => e.value) })
}

async function launch() {
  readForm()
  if (!state.form.q) return toast('Indiquez un poste.', 'err')
  if (!state.form.sites.length) return toast('Choisissez au moins un site.', 'err')
  const todo = missing()
  if (todo.length && store.get('jr_nudge') !== 'off') {
    const d = openDialog(`
      <h2>Activer les scores ?</h2>
      <p class="muted">Sans configuration, vous obtenez la liste des offres mais aucune évaluation. Il vous manque :</p>
      <ul class="todo">${todo.map((t) => `<li><span><b>${t.what}</b> ${t.why}</span></li>`).join('')}</ul>
      <label class="check mt"><input type="checkbox" id="nonudge"> Ne plus me le rappeler</label>
      <div class="actions"><button class="btn secondary" data-close="go">Chercher sans scores</button><button class="btn" data-close="config">Configurer maintenant</button></div>`)
    const res = await dialogResult(d)
    if ($('#nonudge')?.checked) store.set('jr_nudge', 'off')
    if (res === 'config') { location.hash = todo[0].to; return }
    if (res !== 'go') return
  }
  await runSearch()
}

async function runSearch() {
  if (running) return
  running = true
  $('#go').disabled = true
  $('#list').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>'
  $('#detail').innerHTML = ''
  $('#status').innerHTML = '<span class="spin" aria-hidden="true"></span> Recherche en cours (environ 30 secondes)…'
  try {
    const f = state.form
    const res = await call('search', 'POST', { query: f.q, location: f.loc, n: f.n, hours: f.hours, sites: f.sites })
    state.jobs = {}; state.selected = null
    res.jobs.forEach((j) => (state.jobs[j.id] = j))
    paint()
    $('#status').textContent = `${res.jobs.length} offre(s) trouvée(s).`
    if (canEvaluate() && res.jobs.length) await evaluateAll(res.jobs)
  } catch (e) {
    $('#status').textContent = ''; $('#list').innerHTML = `<div class="banner err" role="alert"><div><b>Recherche impossible</b>${esc(e.message)}</div></div>`
  }
  running = false
  const go = $('#go'); if (go) go.disabled = false
}

async function evaluateAll(list) {
  const queue = list.filter((j) => !j.ev)
  let done = 0, stop = false
  const worker = async () => {
    while (queue.length && !stop) {
      const j = queue.shift()
      try { j.ev = await call('evaluate', 'POST', j) }
      catch (e) { j.ev = { error: e.message }; if ([400, 401, 429].includes(e.status)) { stop = true; toast(e.message, 'err') } }
      const s = $('#status'); if (s) s.textContent = `Évaluation ${++done}/${list.length}…`
      paint()
    }
  }
  await Promise.all([worker(), worker(), worker()])
  const s = $('#status'); if (s) s.textContent = stop ? 'Évaluations interrompues.' : 'Évaluations terminées.'
}

async function evaluateOne(j) {
  j.ev = null; j.evaluating = true; paint()
  try { j.ev = await call('evaluate', 'POST', j) } catch (e) { j.ev = { error: e.message } }
  j.evaluating = false; paint()
}

function paint() {
  const list = $('#list'); if (!list) return
  const jobs = Object.values(state.jobs).sort((a, b) => (b.ev?.match ?? -1) - (a.ev?.match ?? -1))
  if (!jobs.length) {
    list.innerHTML = running ? '' : `<div class="card empty"><h2>Aucune recherche pour l'instant</h2><p>Renseignez un poste et lancez la recherche.</p></div>`
    $('#detail').innerHTML = ''; return
  }
  const todo = jobs.filter((j) => !j.ev && !j.evaluating).length
  list.innerHTML = (canEvaluate() && todo ? `<button class="btn secondary sm" id="evalAll">Évaluer les ${todo} offre(s) restante(s)</button>` : '') +
    jobs.map((j) => `<button class="job" data-id="${esc(j.id)}" aria-current="${j.id === state.selected}">
      <div class="score ${j.ev?.match != null ? cls(j.ev.match) : 'na'}">${j.ev?.match ?? (j.evaluating ? '…' : j.ev?.error ? '!' : '–')}<small>match</small></div>
      <div><b>${esc(j.titre)}</b><span class="small muted">${esc(j.entreprise)} · ${esc(j.lieu)} · ${esc(j.site)}</span></div></button>`).join('')
  $$('.job', list).forEach((b) => (b.onclick = () => { state.selected = b.dataset.id; paint(); if (innerWidth < 1000) $('#detail').scrollIntoView({ behavior: 'smooth' }) }))
  $('#evalAll')?.addEventListener('click', () => evaluateAll(jobs))
  detail(state.jobs[state.selected])
}

function detail(j) {
  const el = $('#detail'); if (!el) return
  if (!j) { el.innerHTML = `<div class="card empty"><p>Sélectionnez une offre pour voir le détail.</p></div>`; return }
  const e = j.ev
  let body
  if (j.evaluating) body = '<p class="muted"><span class="spin" aria-hidden="true"></span> Évaluation en cours…</p>'
  else if (e?.error) body = `<div class="banner err" role="alert"><div><b>Évaluation impossible</b>${esc(e.error)}</div></div>${canEvaluate() ? '<br><button class="btn secondary" id="evalOne">Réessayer</button>' : ''}`
  else if (e) body = `
    <div class="bars"><div class="${cls(e.match)}">${e.match}<small>Match profil / offre</small></div><div class="${cls(e.cv_score)}">${e.cv_score}<small>Votre CV pour cette offre</small></div></div>
    <p>${esc(e.verdict)}</p>
    <h3 class="section">Forces</h3><ul class="plain">${(e.forces || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <h3 class="section">Points à renforcer</h3><ul class="plain">${(e.manques || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <h3 class="section">Modifications proposées pour votre CV</h3>
    ${(e.modifs || []).map((m) => `<div class="card tight item"><b>${esc(m.section)}</b><div class="diff"><p class="old">${esc(m.avant)}</p><p class="new">${esc(m.apres)}</p></div><span class="small muted">${esc(m.pourquoi)}</span></div>`).join('')}`
  else if (canEvaluate()) body = '<div class="banner info"><div><b>Pas encore évaluée</b>Comparez cette offre à votre profil.</div></div><br><button class="btn" id="evalOne">Évaluer cette offre</button>'
  else body = `<div class="banner warn"><div><b>Évaluation indisponible</b>${missing().map((t) => `<a href="${t.to}">${t.what}</a>`).join(' · ')} pour comparer cette offre à votre profil.</div></div>`
  const url = /^https?:\/\//.test(j.url) ? j.url : '#'
  el.innerHTML = `<div class="card">
    <h2>${esc(j.titre)}</h2>
    <p class="muted small">${esc(j.entreprise)} · ${esc(j.lieu)} · ${esc(j.site)} · <a href="${esc(url)}" target="_blank" rel="noopener">Voir l'offre</a></p>
    <div class="section">${body}</div>
    <details class="section"><summary>Description de l'offre</summary><pre>${esc(j.description)}</pre></details></div>`
  $('#evalOne')?.addEventListener('click', () => evaluateOne(j))
}
