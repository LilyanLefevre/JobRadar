// Utilitaires partagés : client PocketBase, appels /jr/*, état, dialogue, toasts.
export const pb = new PocketBase(location.origin)
export const $ = (s, r = document) => r.querySelector(s)
export const $$ = (s, r = document) => [...r.querySelectorAll(s)]
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
export const bus = new EventTarget()

// État partagé entre les vues (conservé pendant la navigation).
export const state = {
  providers: [],
  batch: 15,
  key: { has_key: false, provider: '' },
  jobs: {},
  selected: null,
  form: { q: '', locs: [], rad: '25', n: '10', hours: '168', sites: ['indeed', 'hellowork', 'linkedin', 'glassdoor'], smin: '', sreq: false, ai: true },
}

export const profile = () => pb.authStore.record?.profile || null
export const hasProfile = (p = profile()) => !!(p && ((p.experiences || []).length || (p.formations || []).length || (p.competences || []).length || (p.resume || '').trim()))
export const providerLabel = (id) => state.providers.find((p) => p.id === id)?.label || id
export const canEvaluate = () => state.key.has_key && hasProfile()
export const SITE = { indeed: 'In', hellowork: 'HW', linkedin: 'Li', glassdoor: 'Gl' }
export const SITE_NAME = { indeed: 'Indeed', hellowork: 'HelloWork', linkedin: 'LinkedIn', glassdoor: 'Glassdoor' }
export const tier = (n) => (n == null ? 'none' : n >= 70 ? 'strong' : n >= 45 ? 'mid' : 'low')
// Ce qu'il manque pour activer les scores (sert au bandeau, à la fenêtre de suggestion et au bouton de la barre).
export const setupTodo = () => [
  ...(state.key.has_key ? [] : [{ what: 'Configurer votre IA', why: 'pour obtenir les scores et les conseils', to: '#/settings' }]),
  ...(hasProfile() ? [] : [{ what: 'Ajouter votre CV', why: 'pour comparer votre profil aux offres', to: '#/profile' }]),
]

export async function call(path, method = 'GET', body) {
  const r = await fetch('/jr/' + path, {
    method, body: body && JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token },
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(j.error || j.message || 'Erreur ' + r.status), { status: r.status })
  return j
}

export function toast(msg, kind = '') {
  const el = document.createElement('div')
  el.textContent = msg
  if (kind) el.className = kind
  $('#toast').append(el)
  setTimeout(() => el.remove(), kind === 'err' ? 7000 : 3500)
}

// Dialogue modal (élément <dialog> : focus piégé, Échap, fond inerte). Retourne le dialogue ; ferme avec [data-close].
export function openDialog(html) {
  const d = $('#dialog')
  d.innerHTML = html
  d.onclick = (e) => { if (e.target.closest('[data-close]')) d.close(e.target.closest('[data-close]').dataset.close) }
  if (!d.open) d.showModal()
  return d
}
export const closeDialog = () => $('#dialog').open && $('#dialog').close()
export const dialogResult = (d) => new Promise((res) => d.addEventListener('close', () => res(d.returnValue), { once: true }))

export const store = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch {} },
}

// Photo du compte (reprise du fournisseur OAuth par PocketBase) ; repli sur les initiales si absente ou illisible.
export const initials = (name) => String(name || '').split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || '?'
export function avatarUrl(px = 96) {
  const r = pb.authStore.record
  return r?.avatar ? pb.files.getURL(r, r.avatar, { thumb: `${px >= 100 ? 192 : 96}x${px >= 100 ? 192 : 96}` }) : ''
}
export const avatarHtml = (px, cls = '') => {
  const u = avatarUrl(px), r = pb.authStore.record || {}, ini = esc(initials(r.name || r.email))
  return `<span class="pic ${cls}" data-ini="${ini}">${u ? `<img src="${esc(u)}" alt="" width="${px}" height="${px}" loading="lazy" decoding="async">` : ini}</span>`
}
// Une image qui ne charge pas (ou une photo supprimée) laisse place aux initiales.
export function bindAvatars(root = document) {
  root.querySelectorAll('.pic img').forEach((img) => img.addEventListener('error', () => { img.parentElement.textContent = img.parentElement.dataset.ini }, { once: true }))
}

// Champ « lieux » : jusqu'à 3 pastilles (Entrée ou « ; » valide un lieu), un rayon en km autour de chacun.
export const RADII = [10, 25, 50, 100]
export const splitPlaces = (s) => String(s || '').split(';').map((x) => x.trim()).filter(Boolean).slice(0, 3)
export const placesField = (id) => `<div class="field"><label for="${id}">Lieux (3 maximum)</label><div class="tagin" id="${id}-box"><input id="${id}" autocomplete="off" placeholder="Lyon, France"></div></div>`
export const radiusField = (id, value) => `<label class="field"><span>Rayon autour du lieu</span><select id="${id}">${RADII.map((r) => `<option value="${r}" ${String(value || 25) === String(r) ? 'selected' : ''}>${r} km</option>`).join('')}</select></label>`
export function bindPlaces(root, id, initial) {
  const box = $(`#${id}-box`, root), input = $(`#${id}`, root)
  let list = [...initial].slice(0, 3)
  const draw = () => {
    $$('.tagc', box).forEach((c) => c.remove())
    list.forEach((p, i) => {
      const c = document.createElement('span'); c.className = 'tagc'
      c.append(p)
      const b = document.createElement('button'); b.type = 'button'; b.textContent = '×'; b.setAttribute('aria-label', `Retirer ${p}`)
      b.onclick = () => { list.splice(i, 1); draw(); input.focus() }
      c.append(b); box.insertBefore(c, input)
    })
    input.disabled = list.length >= 3; input.placeholder = list.length ? '' : 'Lyon, France'
  }
  const commit = () => { const v = input.value.replace(/;/g, ' ').trim(); input.value = ''; if (v && list.length < 3 && !list.includes(v)) { list.push(v); draw() } }
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) { e.preventDefault(); commit() }
    else if (e.key === ';') { e.preventDefault(); commit() }
    else if (e.key === 'Backspace' && !input.value && list.length) { list.pop(); draw() }
  })
  draw()
  return () => { commit(); return [...list] }
}
