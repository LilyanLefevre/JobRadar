import { $, $$, esc, call, pb, state, toast, bus, providerLabel } from './lib.js?v=__V__'
import { ic } from './icons.js?v=__V__'
import * as push from './push.js?v=__V__'
import * as pwa from './install.js?v=__V__'

const hhmm = (epoch) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(epoch * 1000))

async function refreshStatus() {
  state.key = await call('status')
  bus.dispatchEvent(new Event('chrome'))
}

export async function render(root) {
  await refreshStatus().catch(() => {})
  const list = state.key.providers || []
  const sel = state.providers.find((p) => !list.some((x) => x.provider === p.id) && p.free)?.id || state.providers.find((p) => !list.some((x) => x.provider === p.id))?.id || state.providers[0]?.id
  let devices = [], sub = null
  try { devices = (await call('push/devices')).devices } catch { /* liste facultative */ }
  try { sub = await push.currentSubscription() } catch { /* pas de service worker */ }

  const state_ = (p, i) => {
    const bits = []
    if (i === 0) bits.push('<span class="tag">Principal</span>')
    if (p.last_code === 'auth') bits.push('<span class="tag warn">Clé refusée</span>')
    else if (!p.ok) bits.push(`<span class="tag warn">En pause jusqu'à ${hhmm(p.cooldown_until)}</span>`)
    else bits.push('<span class="tag ok">Disponible</span>')
    return bits.join(' ')
  }
  root.innerHTML = `
    <div class="page-head"><h1>Paramètres</h1><p>Vos fournisseurs d'IA, vos notifications et votre compte.</p></div>
    <div class="settings">
      <div class="stack-lg">
        <section class="stack" aria-labelledby="ia-t">
          <div><h2 id="ia-t">IA pour les évaluations et l'import du CV</h2>
            <p class="muted mt">Ajoutez un ou plusieurs fournisseurs. JobRadar utilise le premier et passe automatiquement au suivant s'il est indisponible (limite de débit, panne, crédit épuisé). Plusieurs ont une offre gratuite.</p></div>
          <div class="banner ${list.length ? 'ok' : 'warn'}" role="status">${ic(list.length ? 'check' : 'alert')}${list.length
            ? `<div><b>${list.length > 1 ? `${list.length} fournisseurs configurés` : 'IA configurée'}</b>${list.length > 1 ? 'Bascule automatique activée.' : 'Ajoutez-en un second pour avoir une solution de secours.'}</div>`
            : `<div><b>IA non configurée</b>Vous pouvez chercher des offres, mais sans scores ni analyse de votre CV.</div>`}</div>
          ${list.length ? `<div class="provlist" id="provlist">${list.map((p, i) => `
            <article class="provrow" data-p="${esc(p.provider)}"><span class="rank" aria-hidden="true">${i + 1}</span>
              <div class="grow"><b>${esc(providerLabel(p.provider))}</b> ${state_(p, i)}${p.last_error && (!p.ok || p.last_code === 'auth') ? `<span class="sub">${esc(p.last_error)}</span>` : ''}</div>
              <div class="row tools"><button class="btn ghost icon" data-mv="-1" aria-label="Monter ${esc(providerLabel(p.provider))}" ${i === 0 ? 'disabled' : ''}>${ic('up')}</button>
                <button class="btn ghost icon" data-mv="1" aria-label="Descendre ${esc(providerLabel(p.provider))}" ${i === list.length - 1 ? 'disabled' : ''}>${ic('down')}</button>
                <button class="btn ghost icon" data-rm aria-label="Retirer ${esc(providerLabel(p.provider))}">${ic('close')}</button></div></article>`).join('')}</div>` : ''}
          <h3 class="mt">Ajouter un fournisseur</h3>
          <label class="field"><span>Fournisseur</span>
            <select id="prov">${state.providers.map((p) => `<option value="${esc(p.id)}" ${p.id === sel ? 'selected' : ''}>${esc(p.label)}${p.free ? ' · gratuit' : ''}${list.some((x) => x.provider === p.id) ? ' · déjà ajouté (remplace la clé)' : ''}</option>`).join('')}</select></label>
          <p class="small muted" id="provNote"></p>
          <label class="field"><span>Clé API</span><input id="key" type="password" autocomplete="off" placeholder="Collez votre clé ici"></label>
          <p class="xs muted">La clé est vérifiée auprès du fournisseur, puis stockée chiffrée. Votre CV est envoyé au fournisseur utilisé pour être analysé.</p>
          <div class="row"><button class="btn" id="saveKey">${ic('check')}Vérifier et ajouter</button>
            ${list.length ? '<button class="btn ghost" id="clearCache">Vider la mémoire des évaluations</button>' : ''}</div>
        </section>

        <section class="stack" aria-labelledby="nt-t">
          <div><h2 id="nt-t">Notifications</h2>
            <p class="muted mt">Recevez une notification quand une alerte trouve de nouvelles offres. Sur téléphone, installez d'abord l'application (menu du navigateur : « Ajouter à l'écran d'accueil »).</p></div>
          ${!push.supported() ? `<div class="banner warn">${ic('alert')}<div><b>Non disponible ici</b>Ce navigateur ne gère pas les notifications push.${push.needsInstall() ? '' : ''}</div></div>`
            : push.needsInstall() ? `<div class="banner warn">${ic('alert')}<div><b>Installez l'application</b>Sur iPhone, ouvrez le menu Partager, choisissez « Sur l'écran d'accueil », puis ouvrez JobRadar depuis l'icône pour activer les notifications.</div></div>`
            : `<div class="row"><button class="btn ${sub ? 'secondary' : ''}" id="pushToggle">${ic('bell')}${sub ? 'Désactiver sur cet appareil' : 'Activer sur cet appareil'}</button>
                ${devices.length ? '<button class="btn secondary" id="pushTest">Envoyer une notification de test</button>' : ''}</div>`}
          ${pwa.canPrompt() ? `<div class="row"><button class="btn secondary" id="installApp">${ic('download')}Installer l'application</button></div>` : ''}
          ${devices.length ? `<div><h3>Appareils abonnés</h3><ul class="plain devs">${devices.map((d) => `<li><span class="grow">${esc(d.label || 'Appareil')}${sub && d.endpoint === sub.endpoint ? ' <span class="tag ok">cet appareil</span>' : ''}</span><button class="btn ghost sm" data-dev="${esc(d.id)}" aria-label="Retirer ${esc(d.label || 'cet appareil')}">${ic('close')}Retirer</button></li>`).join('')}</ul></div>` : '<p class="small muted">Aucun appareil abonné pour le moment.</p>'}
          <p class="xs muted">Bientôt : notifications par e-mail.</p>
        </section>
      </div>

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
    if (!key) return toast('Collez votre clé API.', 'err')
    e.currentTarget.disabled = true
    try { await call('key', 'POST', { provider: $('#prov').value, key }); toast('Fournisseur ajouté.'); await render(root) }
    catch (err) { toast(err.message, 'err'); $('#saveKey').disabled = false }
  }
  $$('#provlist [data-p]').forEach((row) => {
    const id = row.dataset.p
    $$('[data-mv]', row).forEach((b) => (b.onclick = async () => {
      const order = list.map((x) => x.provider), i = order.indexOf(id), j = i + +b.dataset.mv
      ;[order[i], order[j]] = [order[j], order[i]]
      await call('keys/order', 'POST', { order }); render(root)
    }))
    $('[data-rm]', row).onclick = async () => { if (!confirm(`Retirer ${providerLabel(id)} ?`)) return; await call(`key?provider=${encodeURIComponent(id)}`, 'DELETE'); toast('Fournisseur retiré.'); render(root) }
  })
  $('#clearCache')?.addEventListener('click', async () => { await call('cache', 'DELETE'); toast('Mémoire des évaluations vidée.') })
  $('#pushToggle')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true
    try { sub ? await push.disable() : await push.enable(); toast(sub ? 'Notifications désactivées.' : 'Notifications activées sur cet appareil.'); render(root) }
    catch (err) { toast(err.message, 'err'); e.target.disabled = false }
  })
  $('#installApp')?.addEventListener('click', async () => { await pwa.install(); render(root) })
  $('#pushTest')?.addEventListener('click', async () => {
    try { const r = await call('push/test', 'POST', {}); toast(r.push ? 'Notification envoyée.' : "Aucune notification n'a pu être envoyée.", r.push ? '' : 'err') } catch (err) { toast(err.message, 'err') }
  })
  $$('[data-dev]').forEach((b) => (b.onclick = async () => { await call('push/unsubscribe', 'POST', { id: b.dataset.dev }); toast('Appareil retiré.'); render(root) }))
  $('#logout').onclick = () => { pb.authStore.clear(); location.hash = ''; location.reload() }
  $('#delAccount').onclick = async () => {
    if (!confirm('Supprimer définitivement votre compte, votre profil et vos clés API ?')) return
    await pb.collection('users').delete(pb.authStore.record.id)
    pb.authStore.clear(); location.hash = ''; location.reload()
  }
}
