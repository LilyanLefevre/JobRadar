import { $, $$, esc, pb, state, toast, openDialog, closeDialog, bus, setupTodo, SITE, SITE_NAME, tier } from './lib.js?v=__V__'
import { ic } from './icons.js?v=__V__'

const MAX = 3
const HOURS = [['24', '24 heures'], ['48', '2 jours'], ['72', '3 jours'], ['168', '7 jours']]
const when = (s) => (s ? new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(String(s).replace(' ', 'T'))) : '')
const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`
let timer = null

// Compte les rapports non lus (pastille de la navigation).
export async function refreshBadge() {
  try {
    const r = await pb.collection('alert_runs').getList(1, 1, { filter: 'seen = false && new_count > 0', requestKey: null })
    const b = $('#alertBadge')
    if (b) { b.hidden = !r.totalItems; b.textContent = r.totalItems > 9 ? '9+' : r.totalItems; b.setAttribute('aria-label', `${r.totalItems} rapport(s) non lu(s)`) }
  } catch { /* la pastille est un bonus */ }
}

export async function render(root) {
  clearTimeout(timer)
  root.innerHTML = `<div class="page-head tight"><h1>Alertes quotidiennes</h1></div><div class="skeleton"></div>`
  await draw(root)
}

async function draw(root) {
  let alerts = [], runs = []
  try {
    ;[alerts, runs] = await Promise.all([pb.collection('alerts').getFullList({ sort: 'created', requestKey: null }), pb.collection('alert_runs').getList(1, 20, { sort: '-ran_at', expand: 'alert', requestKey: null }).then((r) => r.items)])
  } catch (e) { root.innerHTML = `<div class="banner err">${ic('alert')}<div><b>Chargement impossible</b>${esc(e.message)}</div></div>`; return }
  const todo = setupTodo()
  const latest = {}; runs.forEach((r) => { if (!latest[r.alert]) latest[r.alert] = r })
  root.innerHTML = `
    <div class="page-head tight"><h1>Alertes quotidiennes</h1>
      <p class="muted">Chaque matin, JobRadar relance vos recherches et ne garde que les nouvelles offres au-dessus du score choisi.</p></div>
    ${todo.length ? `<div class="banner" role="status">${ic('sparkle')}<div><b>Les alertes marchent sans IA</b>Vous recevez toutes les nouvelles offres, classées par pertinence estimée. ${todo.map((t) => `<a href="${t.to}">${t.what}</a>`).join(' · ')} pour ajouter un score de match.</div></div><div class="mt"></div>` : ''}
    <section class="psec" aria-labelledby="al-t">
      <header><div><h2 id="al-t">Mes alertes</h2></div>
        <button class="btn" id="newAlert" ${alerts.length >= MAX ? 'disabled title="3 alertes maximum"' : ''}>${ic('plus')}Nouvelle alerte</button></header>
      ${alerts.length ? alerts.map((a) => alertRow(a, latest[a.id])).join('') : `<div class="empty">${ic('bell')}<h2>Aucune alerte</h2><p>Créez une alerte à partir d'une recherche : vous recevrez ici, chaque matin, les nouvelles offres qui correspondent à votre profil.</p></div>`}
    </section>
    <section class="psec" aria-labelledby="rp-t"><header><div><h2 id="rp-t">Rapports</h2></div></header>
      ${runs.length ? runs.map(runBlock).join('') : `<p class="muted">Les rapports apparaîtront ici après le premier passage.</p>`}
    </section>`

  $('#newAlert')?.addEventListener('click', () => openAlertDialog({}, () => draw(root)))
  $$('.alertrow', root).forEach((row) => {
    const a = alerts.find((x) => x.id === row.dataset.id)
    $('[data-toggle]', row).onchange = async (e) => { try { await pb.collection('alerts').update(a.id, { active: e.target.checked }); toast(e.target.checked ? 'Alerte activée.' : 'Alerte mise en pause.') } catch (er) { toast(er.message, 'err'); e.target.checked = !e.target.checked } }
    $('[data-run]', row).onclick = async () => { try { await pb.collection('alerts').update(a.id, { queued: true }); toast('Passage lancé : le rapport arrive dans quelques minutes.'); await draw(root) } catch (er) { toast(er.message, 'err') } }
    $('[data-edit]', row).onclick = () => openAlertDialog(a, () => draw(root))
    $('[data-del]', row).onclick = async () => { if (!confirm(`Supprimer l'alerte « ${a.name || a.query} » et ses rapports ?`)) return; await pb.collection('alerts').delete(a.id); bus.dispatchEvent(new Event('alerts')); await draw(root); refreshBadge() }
  })
  // Rapports consultés : on les marque comme lus.
  const unread = runs.filter((r) => !r.seen)
  if (unread.length) setTimeout(async () => { await Promise.all(unread.map((r) => pb.collection('alert_runs').update(r.id, { seen: true }).catch(() => {}))); refreshBadge() }, 2000)
  // Un passage en cours : on rafraîchit jusqu'à sa fin.
  if (alerts.some((a) => a.queued || a.last_status === 'running') && location.hash.startsWith('#/alerts')) timer = setTimeout(() => draw(root), 5000)
}

function alertRow(a, run) {
  const busy = a.queued || a.last_status === 'running'
  const status = busy ? `<span class="spin" aria-hidden="true"></span> Passage en cours…`
    : !a.last_run_at ? 'Premier passage demain matin.'
    : a.last_status === 'error' ? `<span class="lo">${ic('alert')} ${esc(a.last_message)}</span>`
    : a.last_status === 'skipped' ? `<span class="warnt">${ic('alert')} ${esc(a.last_message)}</span>`
    : `Dernier passage : ${when(a.last_run_at)}${run ? ` · ${run.new_count ? `${plural(run.new_count, 'offre')} retenue${run.new_count > 1 ? 's' : ''}` : 'rien de nouveau'}` : ''}`
  return `<article class="alertrow" data-id="${a.id}">
    <label class="switch"><input type="checkbox" role="switch" data-toggle ${a.active ? 'checked' : ''}><span class="track" aria-hidden="true"></span><span class="sr-only">Alerte active</span></label>
    <div class="grow"><b>${esc(a.name || a.query)}</b>
      <span class="sub">${esc(a.query)} · ${esc(a.location || 'France')} · score ≥ ${a.min_score} % · ${(a.sites || []).map((s) => esc(SITE_NAME[s] || s)).join(', ')}</span>
      <span class="sub status">${status}</span></div>
    <div class="row tools"><button class="btn secondary sm" data-run ${busy ? 'disabled' : ''}>${ic('clock')}Lancer maintenant</button>
      <button class="btn ghost icon" data-edit aria-label="Modifier l'alerte">${ic('pencil')}</button>
      <button class="btn ghost icon" data-del aria-label="Supprimer l'alerte">${ic('close')}</button></div></article>`
}

function runBlock(r) {
  const name = r.expand?.alert?.name || r.expand?.alert?.query || 'Alerte'
  const head = `<header><h3>${esc(name)}</h3><span class="muted small">${when(r.ran_at)}</span>${!r.seen && r.new_count ? '<span class="tag warn">Nouveau</span>' : ''}</header>`
  if (r.status === 'error') return `<section class="run">${head}<div class="banner err">${ic('alert')}<div>${esc(r.message)}</div></div></section>`
  if (r.status === 'skipped') return `<section class="run">${head}<div class="banner warn">${ic('alert')}<div>${esc(r.message)}</div></div></section>`
  if (!r.new_count) return `<section class="run quiet">${head}<p class="muted small">${esc(r.message)} Rien à signaler.</p></section>`
  return `<section class="run">${head}<p class="muted small">${esc(r.message)} ${plural(r.new_count, 'offre')} retenue${r.new_count > 1 ? 's' : ''}.</p>
    <div class="list">${(r.jobs || []).map((j) => `<a class="rowitem" href="${/^https?:\/\//.test(j.url) ? esc(j.url) : '#'}" target="_blank" rel="noopener">
      <span class="roundel" aria-hidden="true">${esc(SITE[j.site] || '?')}</span>
      <span><b>${esc(j.titre)}</b><span class="sub">${esc(j.entreprise)} · ${esc(j.lieu)}</span>${j.salaire || j.contrat || j.teletravail ? `<span class="sub">${[j.salaire?.texte && `<b class="pay">${esc(j.salaire.texte)}</b>`, j.contrat && esc(j.contrat), j.teletravail && esc(j.teletravail)].filter(Boolean).join(' · ')}</span>` : ''}<span class="sub wrap">${esc(j.verdict || '')}</span><span class="sr-only"> Source : ${esc(SITE_NAME[j.site] || j.site)}. Ouvre l'offre dans un nouvel onglet.</span></span>
      ${j.match != null ? `<span class="match t-${tier(j.match)}" role="img" aria-label="Match ${j.match} pour cent">${j.match}<small>%</small></span>` : j.pre != null ? `<span class="match t-none" role="img" aria-label="Pertinence estimée ${j.pre} pour cent" title="Pertinence estimée sans IA">~${j.pre}<small>%</small></span>` : ''}</a>`).join('')}</div></section>`
}

// Création / modification d'une alerte (aussi appelée depuis la page de recherche avec la recherche en cours).
export function openAlertDialog(a, onSaved) {
  const sites = a.sites?.length ? a.sites : ['indeed', 'hellowork', 'linkedin', 'glassdoor']
  const d = openDialog(`<h2>${a.id ? 'Modifier l\'alerte' : 'Nouvelle alerte'}</h2>
    <form id="alertForm" class="stack mt">
      <label class="field"><span>Nom (facultatif)</span><input name="name" maxlength="80" value="${esc(a.name || '')}"></label>
      <div class="grid2"><label class="field"><span>Poste</span><input name="query" required maxlength="200" value="${esc(a.query || '')}" placeholder="Développeur web"></label>
        <label class="field"><span>Lieu</span><input name="location" maxlength="100" value="${esc(a.location || '')}" placeholder="Lyon, France"></label></div>
      <fieldset class="sites"><legend class="sr-only">Sites</legend>${Object.entries(SITE_NAME).map(([v, l]) => `<label class="site-chip"><input type="checkbox" name="site" value="${v}" ${sites.includes(v) ? 'checked' : ''}><span class="roundel" aria-hidden="true">${SITE[v]}</span>${l}</label>`).join('')}</fieldset>
      <div class="grid2"><label class="field"><span>Offres publiées depuis</span><select name="hours">${HOURS.map(([v, l]) => `<option value="${v}" ${String(a.hours || 72) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>Score minimum (avec IA) : <b id="minv">${a.min_score ?? 70}</b> %</span><input type="range" name="min_score" min="40" max="95" step="5" value="${a.min_score ?? 70}"></label></div>
      <p class="xs muted">Passage chaque matin. Les nouvelles offres sont évaluées avec votre IA (quelques centimes au plus, souvent gratuit).</p>
      <div class="actions"><button type="button" class="btn secondary" data-close="x">Annuler</button><button class="btn" type="submit">${ic('check')}Enregistrer</button></div></form>`)
  const f = $('#alertForm', d)
  f.min_score.oninput = () => ($('#minv', d).textContent = f.min_score.value)
  f.onsubmit = async (e) => {
    e.preventDefault()
    const body = { name: f.name.value.trim(), query: f.query.value.trim(), location: f.location.value.trim(), sites: $$('[name=site]:checked', f).map((i) => i.value), hours: +f.hours.value, min_score: +f.min_score.value }
    if (!body.query) return toast('Indiquez un poste.', 'err')
    if (!body.sites.length) return toast('Choisissez au moins un site.', 'err')
    try {
      if (a.id) await pb.collection('alerts').update(a.id, body)
      else await pb.collection('alerts').create({ ...body, user: pb.authStore.record.id, active: true })
      closeDialog(); bus.dispatchEvent(new Event('alerts')); toast(a.id ? 'Alerte modifiée.' : 'Alerte créée : premier passage demain matin, ou lancez-le maintenant depuis Alertes.'); onSaved?.()
    } catch (err) { toast(err.message || 'Enregistrement impossible.', 'err') }
  }
  return d
}
