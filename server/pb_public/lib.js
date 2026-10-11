// Utilitaires partagés : client PocketBase, appels /jr/*, état, dialogue, toasts.
export const pb = new PocketBase(location.origin)
export const $ = (s, r = document) => r.querySelector(s)
export const $$ = (s, r = document) => [...r.querySelectorAll(s)]
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
export const bus = new EventTarget()

// État partagé entre les vues (conservé pendant la navigation).
export const state = {
  providers: [],
  key: { has_key: false, provider: '' },
  jobs: {},
  selected: null,
  form: { q: '', loc: '', n: '10', hours: '168', sites: ['indeed', 'linkedin'] },
}

export const profile = () => pb.authStore.record?.profile || null
export const hasProfile = (p = profile()) => !!(p && ((p.experiences || []).length || (p.formations || []).length || (p.competences || []).length || (p.resume || '').trim()))
export const providerLabel = (id) => state.providers.find((p) => p.id === id)?.label || id
export const canEvaluate = () => state.key.has_key && hasProfile()

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
