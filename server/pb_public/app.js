import { pb, $, $$, esc, call, state, bus, toast, hasProfile, profile, providerLabel } from './lib.js?v=__V__'
import * as search from './search.js?v=__V__'
import * as profileView from './profile.js?v=__V__'
import * as settings from './settings.js?v=__V__'

const routes = { search, profile: profileView, settings }

async function start() {
  const authed = pb.authStore.isValid && await pb.collection('users').authRefresh().then(() => true, () => false)
  $('#login').hidden = authed
  $('#app').hidden = !authed
  if (authed) return enter()
  try {
    const { oauth2 } = await pb.collection('users').listAuthMethods()
    $('#providers').innerHTML = oauth2.providers.map((p) => `<button class="btn secondary" data-p="${esc(p.name)}">Continuer avec ${esc(p.displayName)}</button>`).join('')
    if (!oauth2.providers.length) $('#loginMsg').textContent = "Aucun fournisseur de connexion n'est configuré."
    $$('#providers button').forEach((b) => (b.onclick = async () => {
      try { await pb.collection('users').authWithOAuth2({ provider: b.dataset.p }); start() }
      catch (e) { $('#loginMsg').textContent = 'Connexion impossible : ' + e.message }
    }))
  } catch { $('#loginMsg').textContent = 'Serveur injoignable.' }
}

async function enter() {
  try {
    const [{ providers }, key] = await Promise.all([call('providers'), call('status')])
    state.providers = providers; state.key = key
  } catch (e) { toast(e.message, 'err') }
  chrome()
  route()
}

function chrome() {
  const k = state.key, p = profile()
  $('#chips').innerHTML =
    (k.has_key ? `<a class="chip ok" href="#/settings">IA : ${esc(providerLabel(k.provider))}</a>` : `<a class="chip warn" href="#/settings">IA non configurée</a>`) +
    (p?.verifie ? `<a class="chip ok" href="#/profile">Profil validé</a>` : hasProfile() ? `<a class="chip warn" href="#/profile">Profil à vérifier</a>` : `<a class="chip warn" href="#/profile">Profil vide</a>`)
}
bus.addEventListener('chrome', chrome)

function route() {
  const name = location.hash.replace(/^#\//, '') || 'search'
  const view = routes[name] || search
  const cur = routes[name] ? name : 'search'
  $$('[data-nav]').forEach((a) => (a.dataset.nav === cur ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')))
  const root = $('#view')
  root.oninput = root.onchange = root.onclick = null
  view.render(root)
  document.title = 'JobRadar'
}

// Garde-fou : quitter le profil avec des modifications non enregistrées demande confirmation.
let lastHash = location.hash
window.addEventListener('hashchange', (e) => {
  if (lastHash.startsWith('#/profile') && !location.hash.startsWith('#/profile') && profileView.isDirty() && !confirm('Des modifications du profil ne sont pas enregistrées. Quitter quand même ?')) {
    location.hash = lastHash; return
  }
  lastHash = location.hash; route()
})

start()
