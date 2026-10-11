import { $, esc, call, pb, state, toast, bus, providerLabel } from './lib.js?v=__V__'
import { ic } from './icons.js?v=__V__'

async function refreshStatus() {
  state.key = await call('status')
  bus.dispatchEvent(new Event('chrome'))
}

export async function render(root) {
  await refreshStatus().catch(() => {})
  const k = state.key
  const sel = k.provider || state.providers.find((p) => p.free)?.id || state.providers[0]?.id
  root.innerHTML = `
    <div class="page-head"><h1>Paramètres</h1><p>Votre IA et votre compte.</p></div>
    <div class="settings">
      <section class="stack" aria-labelledby="ia-t">
        <div><h2 id="ia-t">IA pour les évaluations et l'import du CV</h2>
          <p class="muted mt">Choisissez un fournisseur et collez votre clé API. Plusieurs ont une offre gratuite.</p></div>
        <div class="banner ${k.has_key ? 'ok' : 'warn'}" role="status">${ic(k.has_key ? 'check' : 'alert')}${k.has_key
          ? `<div><b>IA configurée</b>${esc(providerLabel(k.provider))}. Vous pouvez remplacer la clé ci-dessous.</div>`
          : `<div><b>IA non configurée</b>Vous pouvez chercher des offres, mais sans scores ni analyse de votre CV.</div>`}</div>
        <label class="field"><span>Fournisseur</span>
          <select id="prov">${state.providers.map((p) => `<option value="${esc(p.id)}" ${p.id === sel ? 'selected' : ''}>${esc(p.label)}${p.free ? ' · gratuit' : ''}</option>`).join('')}</select></label>
        <p class="small muted" id="provNote"></p>
        <label class="field"><span>Clé API</span><input id="key" type="password" autocomplete="off" placeholder="${k.has_key ? '•••••••• (laisser vide pour conserver)' : 'Collez votre clé ici'}"></label>
        <p class="xs muted">La clé est vérifiée auprès du fournisseur, puis stockée chiffrée. Elle sert uniquement à vos analyses. Votre CV est envoyé au fournisseur choisi pour être analysé.</p>
        <div class="row"><button class="btn" id="saveKey">${ic('check')}Vérifier et enregistrer</button>
          ${k.has_key ? '<button class="btn secondary" id="delKey">Supprimer la clé</button>' : ''}</div>
      </section>
      <aside class="stack" aria-labelledby="acc-t">
        <h2 id="acc-t">Compte</h2>
        <p class="muted">Connecté en tant que <b>${esc(pb.authStore.record?.name || pb.authStore.record?.email || '')}</b>.</p>
        <div class="row"><button class="btn secondary" id="logout">${ic('logout')}Se déconnecter</button>
          <button class="btn danger" id="delAccount">Supprimer mon compte et mes données</button></div>
      </aside>
    </div>`
  const note = () => {
    const p = state.providers.find((x) => x.id === $('#prov').value)
    $('#provNote').innerHTML = p ? `${esc(p.note)} <a href="${esc(p.key_url)}" target="_blank" rel="noopener">Obtenir une clé</a>` : ''
  }
  $('#prov').onchange = note; note()
  $('#saveKey').onclick = async (e) => {
    const key = $('#key').value.trim()
    if (!key) return toast(k.has_key ? 'Aucun changement.' : 'Collez votre clé API.', k.has_key ? '' : 'err')
    e.currentTarget.disabled = true
    try { await call('key', 'POST', { provider: $('#prov').value, key }); toast('IA configurée.'); await render(root) }
    catch (err) { toast(err.message, 'err'); $('#saveKey').disabled = false }
  }
  $('#delKey')?.addEventListener('click', async () => { await call('key', 'DELETE'); toast('Clé supprimée.'); render(root) })
  $('#logout').onclick = () => { pb.authStore.clear(); location.hash = ''; location.reload() }
  $('#delAccount').onclick = async () => {
    if (!confirm('Supprimer définitivement votre compte, votre profil et votre clé API ?')) return
    await pb.collection('users').delete(pb.authStore.record.id)
    pb.authStore.clear(); location.hash = ''; location.reload()
  }
}
