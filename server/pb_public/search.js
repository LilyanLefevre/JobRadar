import { $, $$, esc, placesField, radiusField, bindPlaces, splitPlaces, call, pb, state, providerLabel, toast, openDialog, closeDialog, dialogResult, canEvaluate, hasProfile, profile, store, setupTodo, SITE, SITE_NAME, tier } from './lib.js?v=__V__'
import { renderMarkdown } from './md.js?v=__V__'
import { ic } from './icons.js?v=__V__'
import { openAlertDialog } from './alerts.js?v=__V__'

let getPlaces = () => [], running = false, animate = false, formOpen = true, savedScroll = 0, popBound = false
const mobile = () => matchMedia('(max-width: 1000px)').matches

// Historique (6 recherches) et dernière recherche : synchronisés sur le compte ; les offres de la dernière recherche restent sur l'appareil.
const uid = () => pb.authStore.record?.id || ''
const KEEP = ['q', 'locs', 'rad', 'n', 'hours', 'sites', 'smin', 'sreq']
const pick = (f) => Object.fromEntries(KEEP.map((k) => [k, f[k]]))
const load = (k) => { try { return JSON.parse(store.get(`jr_${k}_${uid()}`)) } catch { return null } }
const histLabel = (h) => `${h.q}${h.locs?.length ? ' · ' + h.locs.join(', ') : ''}`
function saveLast() {
  const jobs = Object.values(state.jobs).slice(0, 60).map((j) => ({ ...j, description: (j.description || '').slice(0, 3000), evaluating: false }))
  store.set(`jr_last_${uid()}`, JSON.stringify({ form: pick(state.form), jobs, at: Date.now() }))
}
const hist = () => pb.authStore.record?.searches?.hist || load('hist') || []
function syncSearches(list, at) {
  store.set(`jr_hist_${uid()}`, JSON.stringify(list))
  pb.collection('users').update(uid(), { searches: { hist: list, last: pick(state.form), at } }, { requestKey: null }).catch(() => {}) // la synchro est un bonus : hors ligne, l'appareil garde sa copie
}
function pushHistory() {
  const key = (h) => histLabel(h).toLowerCase()
  syncSearches([pick(state.form), ...hist().filter((h) => key(h) !== key(state.form))].slice(0, 6), Date.now())
}
const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 2 ? "à l'instant" : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j` }
let restored = false, rootEl = null

export function render(root) {
  rootEl = root
  if (!restored) { // première ouverture de la page : on reprend la dernière recherche
    restored = true
    const last = load('last'), sv = pb.authStore.record?.searches
    if (!state.form.q) {
      if (sv?.last && sv.at > (last?.at || 0)) Object.assign(state.form, sv.last) // une recherche plus récente vient d'un autre appareil : critères seulement
      else if (last?.form) { Object.assign(state.form, last.form); state.lastAt = last.at; (last.jobs || []).forEach((j) => (state.jobs[j.id] = j)); formOpen = false }
    }
  }
  const r = profile()?.recherche || {}
  const f = state.form
  if (!f.q) f.q = r.metiers?.[0] || profile()?.identite?.titre || ''
  if (!f.locs.length) f.locs = (r.lieux?.length ? r.lieux : [profile()?.identite?.lieu].filter(Boolean)).slice(0, 3)
  const todo = setupTodo()
  root.innerHTML = `
    <div class="page-head tight"><h1>Recherche d'offres</h1></div>
    ${todo.length ? `<div class="banner warn" role="status">${ic('alert')}<div><b>Scores désactivés</b>${todo.map((t) => `<a href="${t.to}">${t.what}</a>`).join(' · ')} pour activer les évaluations. La recherche fonctionne déjà sans.</div></div><div class="mt"></div>` : ''}
    <div class="searchsum" id="searchsum" hidden><span id="sumtxt"></span><button type="button" class="btn secondary sm" id="editSearch">${ic('pencil')}Modifier</button></div>
    ${hist().length ? `<div class="recent" role="group" aria-label="Recherches récentes"><span class="muted small">Récentes</span>${hist().map((h, i) => `<button type="button" class="btn secondary sm" data-hist="${i}">${esc(histLabel(h))}</button>`).join('')}<button type="button" class="btn ghost sm" id="clearHist">Effacer</button></div>` : ''}
    <form class="searchbar" id="form">
      <label class="field"><span>Poste</span><input id="q" value="${esc(f.q)}" placeholder="Développeur web" required></label>
      ${placesField('loc')}
      <label class="field"><span>Publiées depuis</span><select id="hours">${[['24', '24 heures'], ['72', '3 jours'], ['168', '7 jours'], ['720', '30 jours']].map(([v, l]) => `<option value="${v}" ${f.hours === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Offres par site</span><input id="n" type="number" min="1" max="20" value="${esc(f.n)}"></label>
      <button class="btn" id="go" type="submit">${ic('search')}Rechercher</button>
      <fieldset class="sites"><legend class="sr-only">Sites</legend>
        ${Object.entries(SITE_NAME).map(([v, l]) => `<label class="site-chip"><input type="checkbox" class="site" value="${v}" ${f.sites.includes(v) ? 'checked' : ''}><span class="roundel" aria-hidden="true">${SITE[v]}</span>${l}</label>`).join('')}</fieldset>
      <div class="opts">
        ${radiusField('rad', f.rad)}
        <label class="field sal"><span>Salaire annuel brut minimum (€)</span><input id="smin" type="number" min="0" max="1000000" step="1000" inputmode="numeric" value="${esc(f.smin)}" placeholder="Aucun"></label>
        <label class="check"><input type="checkbox" id="sreq" ${f.sreq ? 'checked' : ''}>Salaire indiqué uniquement</label>
        ${canEvaluate() ? `<label class="check"><input type="checkbox" id="ai" ${f.ai ? 'checked' : ''}>Évaluer avec l'IA</label>` : ''}</div>
    </form>
    <p class="status" id="status" role="status" aria-live="polite"></p>
    <div class="results"><div class="list" id="list"></div><div class="detail" id="detail"></div></div>`
  $$('[data-hist]', root).forEach((b) => (b.onclick = () => { Object.assign(state.form, hist()[+b.dataset.hist]); render(root); launch() }))
  $('#clearHist')?.addEventListener('click', () => { syncSearches([], Date.now()); render(root) })
  if (state.lastAt && Object.keys(state.jobs).length) $('#status').textContent = `Dernière recherche ${ago(state.lastAt)} : ${plural(Object.keys(state.jobs).length, 'offre')}. Relancez-la pour actualiser.`
  getPlaces = bindPlaces($('#form'), 'loc', f.locs)
  $('#form').onsubmit = (e) => { e.preventDefault(); launch() }
  $('#editSearch').onclick = () => { formOpen = true; syncMobile(); window.scrollTo(0, 0); $('#q').focus() }
  if (!popBound) { popBound = true; addEventListener('popstate', () => { if (state.selected && mobile()) closeDetail(false) }); matchMedia('(max-width: 1000px)').addEventListener('change', syncMobile) }
  paint()
  syncMobile()
}

// Sur téléphone : le formulaire se replie en résumé une fois les résultats là, et une offre ouverte occupe tout l'écran.
function syncMobile() {
  const form = $('#form'); if (!form) return
  const collapse = mobile() && Object.keys(state.jobs).length > 0 && !formOpen
  form.classList.toggle('collapsed', collapse)
  $('#searchsum').hidden = !collapse
  $('#sumtxt').innerHTML = `<b>${esc(state.form.q)}</b> · ${esc(state.form.locs.join(' · ') || 'France')}${state.form.locs.length ? ` (${state.form.rad} km)` : ''} · ${plural(state.form.sites.length, 'site')}`
  const open = mobile() && !!state.selected
  $('.results')?.classList.toggle('detail-open', open)
  $('#view').classList.toggle('mobile-detail', open)
}

function openDetail(id) {
  state.selected = id
  if (mobile()) { savedScroll = scrollY; history.pushState({ jr: 'detail' }, '') }
  paint(); syncMobile()
  if (mobile()) window.scrollTo(0, 0)
}
function closeDetail(viaButton = true) {
  if (viaButton && history.state?.jr === 'detail') { history.back(); return } // popstate refermera le détail
  state.selected = null; paint(); syncMobile()
  window.scrollTo(0, savedScroll)
}

function readForm() {
  Object.assign(state.form, { q: $('#q').value.trim(), locs: getPlaces(), rad: $('#rad').value, n: $('#n').value, hours: $('#hours').value, sites: $$('.site:checked').map((e) => e.value), smin: $('#smin').value, sreq: $('#sreq').checked, ai: $('#ai') ? $('#ai').checked : state.form.ai })
}

async function launch() {
  readForm()
  if (!state.form.q) return toast('Indiquez un poste.', 'err')
  if (!state.form.sites.length) return toast('Choisissez au moins un site.', 'err')
  const todo = setupTodo()
  if (todo.length && store.get('jr_nudge') !== 'off') {
    const d = openDialog(`
      <h2>Activer les scores ?</h2>
      <p class="muted">Sans configuration, vous obtenez la liste des offres mais aucune évaluation. Il vous manque :</p>
      <ul class="todo">${todo.map((t) => `<li>${ic('alert')}<span><b>${t.what}</b> ${t.why}</span></li>`).join('')}</ul>
      <label class="check mt"><input type="checkbox" id="nonudge">Ne plus me le rappeler</label>
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
    const res = await call('search', 'POST', { query: f.q, location: f.locs.join(';'), radius: +f.rad, n: f.n, hours: f.hours, sites: f.sites, salary_min: +f.smin || 0, salary_required: f.sreq })
    state.jobs = {}; state.selected = null; state.lastAt = 0; animate = true; formOpen = false
    res.jobs.forEach((j) => (state.jobs[j.id] = j))
    paint(); syncMobile()
    $('#status').textContent = `${plural(res.jobs.length, 'offre')} ${res.jobs.length > 1 ? 'trouvées' : 'trouvée'}.`
    pushHistory(); saveLast()
    if (canEvaluate() && f.ai && res.jobs.length) { await evaluateAll(res.jobs); saveLast() }
  } catch (e) {
    $('#status').textContent = ''; $('#list').innerHTML = `<div class="banner err" role="alert">${ic('alert')}<div><b>Recherche impossible</b>${esc(e.message)}</div></div>`
  }
  running = false
  const go = $('#go'); if (go) go.disabled = false
}

// Mémoire d'abord (une offre déjà évaluée pour ce profil n'est pas repayée), puis un appel d'IA par lot d'offres inconnues.
// Taille de lot unique, donnée par le serveur (EVAL_BATCH) : la bascule d'un fournisseur à l'autre marche avec le même lot.
const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`
const slim = (j) => ({ site: j.site, url: j.url, titre: j.titre, entreprise: j.entreprise, lieu: j.lieu, description: (j.description || '').slice(0, 1500) })
const batchSize = () => state.batch || 15

async function evaluateAll(list) {
  const todo = list.filter((j) => !j.ev && !j.evaluating)
  if (!todo.length) return
  todo.forEach((j) => (j.evaluating = true))
  paint()
  let known = 0
  try {
    const { results } = await call('evaluate/lookup', 'POST', { jobs: todo.map(slim) })
    todo.forEach((j, i) => { if (results[i]) { j.ev = results[i]; j.evaluating = false; j.cached = true; known++ } })
  } catch { /* la mémoire est un bonus : on évalue tout */ }
  const unknown = todo.filter((j) => !j.ev)
  const size = batchSize(), chunks = []
  for (let i = 0; i < unknown.length; i += size) chunks.push(unknown.slice(i, i + size))
  const s = $('#status')
  if (s) s.textContent = known ? `${plural(known, 'offre')} déjà évaluée${known > 1 ? 's' : ''} (mémoire), ${unknown.length} à évaluer…` : ''
  paint()
  let done = 0, stop = false, switchedTo = '', aiDown = ''
  const worker = async () => {
    while (chunks.length && !stop) {
      const chunk = chunks.shift()
      try {
        const res = await call('evaluate/batch', 'POST', { jobs: chunk.map(slim) })
        if (res.switched) switchedTo = res.via
        chunk.forEach((j, i) => { j.ev = res.results?.[i] || { error: "Cette offre n'a pas été évaluée, réessayez." } })
      } catch (e) {
        chunk.forEach((j) => (j.ev = { error: e.message }))
        if ([400, 401, 429, 503].includes(e.status)) { stop = true; aiDown = e.message }
      }
      chunk.forEach((j) => (j.evaluating = false)); done += chunk.length
      const st = $('#status'); if (st) st.textContent = `Évaluation ${done}/${unknown.length}…`
      paint()
    }
  }
  await Promise.all([worker(), worker()])
  chunks.flat().forEach((j) => (j.evaluating = false))
  const st = $('#status'); if (st) st.textContent = stop ? `Évaluations interrompues : ${aiDown} Les offres restent classées par pertinence estimée.` : known ? `Évaluations terminées (${known} en mémoire, ${unknown.length} nouvelles).` : 'Évaluations terminées.'
  if (switchedTo && st) st.textContent += ` Fournisseur de secours utilisé : ${providerLabel(switchedTo)}.`
  paint()
}

async function evaluateOne(j) {
  j.ev = null; j.evaluating = true; paint()
  try { j.ev = await call('evaluate', 'POST', j) } catch (e) { j.ev = { error: e.message } }
  j.evaluating = false; paint(); saveLast()
}

// Salaire, contrat et télétravail repérés par le serveur dans la fiche, sans IA.
const extras = (j) => { const t = [j.salaire?.texte && `<b class="pay">${esc(j.salaire.texte)}</b>`, j.contrat && esc(j.contrat), j.teletravail && esc(j.teletravail)].filter(Boolean); return t.length ? `<span class="sub">${t.join(' · ')}</span>` : '' }

// Le match se lit comme une distance sur un panneau de direction : plein = proche, contour = moyen, pointillé = loin.
function matchPanel(j, big = false) {
  const m = j.ev?.match, cls = big ? 'match big' : 'match'
  if (j.evaluating) return `<span class="${cls} t-none" role="img" aria-label="Évaluation en cours">…</span>`
  if (m == null) return j.pre != null ? `<span class="${cls} t-none" role="img" aria-label="Pertinence estimée ${j.pre} pour cent" title="Pertinence estimée sans IA">~${j.pre}<small>%</small></span>` : `<span class="${cls} t-none" role="img" aria-label="Non évaluée">–</span>`
  return `<span class="${cls} t-${tier(m)}" role="img" aria-label="Match ${m} pour cent">${m}<small>%</small></span>`
}

function paint() {
  const list = $('#list'); if (!list) return
  const jobs = Object.values(state.jobs).sort((a, b) => (b.ev?.match ?? b.pre ?? -1) - (a.ev?.match ?? a.pre ?? -1))
  $('.results').classList.toggle('solo', !jobs.length)
  if (!jobs.length) {
    list.innerHTML = running ? '' : `<div class="empty">${ic('radar')}<h2>Aucune recherche pour l'instant</h2><p>Indiquez un poste et un lieu, puis lancez la recherche : les offres apparaissent ici, classées par proximité avec votre profil.</p></div>`
    $('#detail').innerHTML = ''; return
  }
  const todo = jobs.filter((j) => !j.ev && !j.evaluating).length
  list.innerHTML = `<div class="listbar"><span class="muted small">${plural(jobs.length, 'offre')}</span><button class="btn ghost sm" id="mkAlert">${ic('bell')}Créer une alerte</button>${canEvaluate() && todo ? `<button class="btn secondary sm" id="evalAll">${ic('sparkle')}Évaluer les ${todo} restantes</button>` : ''}</div>` +
    jobs.map((j) => `<button class="rowitem" data-id="${esc(j.id)}" aria-current="${j.id === state.selected}">
      <span class="roundel" title="${esc(SITE_NAME[j.site] || j.site)}" aria-hidden="true">${esc(SITE[j.site] || '?')}</span>
      <span><b>${esc(j.titre)}</b><span class="sub">${esc(j.entreprise)} · ${esc(j.lieu)}</span>${extras(j)}<span class="sr-only"> Source : ${esc(SITE_NAME[j.site] || j.site)}</span></span>
      ${matchPanel(j)}</button>`).join('')
  const rows = $$('.rowitem', list)
  if (animate) { animate = false; rows.forEach((b, i) => { b.style.setProperty('--i', Math.min(i, 10)); b.classList.add('enter') }) }
  rows.forEach((b) => (b.onclick = () => openDetail(b.dataset.id)))
  $('#evalAll')?.addEventListener('click', () => evaluateAll(jobs))
  $('#mkAlert')?.addEventListener('click', () => openAlertDialog({ query: state.form.q, location: state.form.locs.join('; '), radius: +state.form.rad, sites: state.form.sites, hours: 72, min_score: 70, salary_min: +state.form.smin || 0, salary_required: state.form.sreq }))
  detail(state.jobs[state.selected])
}

function detail(j) {
  const el = $('#detail'); if (!el) return
  if (!j) { el.innerHTML = `<div class="sheet empty hint">${ic('search')}<p>Sélectionnez une offre pour lire sa description et son analyse.</p></div>`; return }
  const e = j.ev
  const todo = setupTodo()
  let body = ''
  if (j.evaluating) body = `<p class="muted mt"><span class="spin" aria-hidden="true"></span> Évaluation en cours…</p>`
  else if (e?.error) body = `<div class="banner warn mt" role="status">${ic('alert')}<div><b>Évaluation indisponible</b>${esc(e.error)}</div></div>${canEvaluate() ? `<div class="mt"><button class="btn secondary" id="evalOne">Réessayer</button></div>` : ''}`
  else if (e) body = `
    <div class="dists">
      <div class="dist">${matchPanel(j, true)}Match profil / offre</div>
      <div class="dist"><span class="match big second t-${tier(e.cv_score)}" role="img" aria-label="CV pour cette offre ${e.cv_score} pour cent">${e.cv_score}<small>%</small></span>Votre CV pour cette offre</div></div>
    <p class="verdict">${esc(e.verdict)}</p>
    <div class="cols2"><div><h3>Forces</h3><ul class="plain">${(e.forces || []).map((x) => `<li>${ic('check')}<span>${esc(x)}</span></li>`).join('')}</ul></div>
      <div><h3>Points à renforcer</h3><ul class="plain lack">${(e.manques || []).map((x) => `<li>${ic('alert')}<span>${esc(x)}</span></li>`).join('')}</ul></div></div>
    <div class="block"><h3>Modifications proposées pour votre CV</h3>
      ${e.modifs ? (e.modifs || []).map((m) => `<div class="modif"><b>${esc(m.section)}</b><div class="diff"><p class="old">${esc(m.avant)}</p><p class="new">${esc(m.apres)}</p></div><span class="small muted">${esc(m.pourquoi)}</span></div>`).join('')
        : `<p class="muted mt">Obtenez des propositions « avant / après » précises pour cette offre.</p><div class="mt"><button class="btn" id="evalOne">${ic('sparkle')}Proposer des modifications de mon CV</button></div>`}</div>`
  else if (canEvaluate()) body = `<div class="banner mt">${ic('sparkle')}<div><b>Pas encore évaluée</b>Comparez cette offre à votre profil.</div></div><div class="mt"><button class="btn" id="evalOne">Évaluer cette offre</button></div>`
  else body = `<div class="banner warn mt" role="status">${ic('alert')}<div><b>Évaluation indisponible</b>${todo.map((t) => `<a href="${t.to}">${t.what}</a>`).join(' · ')} pour comparer cette offre à votre profil.</div></div>`
  const url = /^https?:\/\//.test(j.url) ? j.url : '#'
  el.innerHTML = `<article class="sheet">
    <div class="detailbar"><button class="btn ghost sm" id="back">${ic('left')}Résultats</button><a class="btn sm" href="${esc(url)}" target="_blank" rel="noopener">Voir l'offre${ic('external')}</a></div>
    <h2>${esc(j.titre)}</h2>
    <div class="meta"><span>${esc(j.entreprise)}</span><span>${ic('pin')}${esc(j.lieu)}</span><span>${esc(SITE_NAME[j.site] || j.site)}</span>${j.salaire ? `<span class="pay">${esc(j.salaire.texte)}</span>` : ''}${j.contrat ? `<span>${esc(j.contrat)}</span>` : ''}${j.teletravail ? `<span>${esc(j.teletravail)}</span>` : ''}<a href="${esc(url)}" target="_blank" rel="noopener">Voir l'offre${ic('external')}</a></div>
    ${body}
    <div class="block"><h3>Description de l'offre</h3><div class="md mt">${j.description ? renderMarkdown(j.description) : '<p class="muted">Aucune description fournie par le site.</p>'}</div></div></article>`
  $('#evalOne')?.addEventListener('click', () => evaluateOne(j))
  $('#back')?.addEventListener('click', () => closeDetail())
}
