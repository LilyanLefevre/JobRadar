import { $, $$, esc, call, pb, state, toast, openDialog, closeDialog, bus, hasProfile, profile, avatarHtml, bindAvatars } from './lib.js?v=__V__'
import { ic } from './icons.js?v=__V__'

const CATEGORIES = ['Emploi', 'Stage', 'Alternance', 'Freelance', 'Projet', 'Bénévolat']
const CONTRATS = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance', 'Intérim']
const NIVEAUX = ['', 'Junior', 'Confirmé', 'Senior']
const TELETRAVAIL = [['', 'Indifférent'], ['oui', 'Télétravail complet'], ['hybride', 'Hybride'], ['non', 'Sur site']]
const LANGUE_NIVEAUX = ['', 'Débutant', 'Intermédiaire', 'Courant', 'Bilingue / natif']

const blank = () => ({ identite: { nom: pb.authStore.record?.name || '', titre: '', lieu: '' }, resume: '', experiences: [], formations: [], competences: [], langues: [],
  recherche: { metiers: [], contrats: [], lieux: [], teletravail: '', niveau: '' }, verifie: false })
const factories = {
  experiences: () => ({ categorie: 'Emploi', poste: '', entreprise: '', lieu: '', debut: '', fin: '', description: '' }),
  formations: () => ({ diplome: '', etablissement: '', annee: '' }),
  competences: () => ({ categorie: '', items: [] }),
  langues: () => ({ langue: '', niveau: '' }),
}
const norm = (p) => { const b = blank(); const o = { ...b, ...structuredClone(p || {}) }; o.identite = { ...b.identite, ...o.identite }; o.recherche = { ...b.recherche, ...o.recherche }
  for (const k of Object.keys(factories)) if (!Array.isArray(o[k])) o[k] = []; return o }

let draft = null, dirty = false, reimport = false
export const isDirty = () => dirty
window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = '' } })

const setPath = (path, value) => {
  const parts = path.split('.'); let o = draft
  parts.slice(0, -1).forEach((k) => (o = o[k]))
  o[parts.at(-1)] = value
}
const list = (s) => s.split(',').map((x) => x.trim()).filter(Boolean)

export function render(root) {
  if (!draft && hasProfile()) draft = norm(profile())
  if (!draft || reimport) return renderImport(root)
  renderEditor(root)
}

// ---------- Import ----------
function renderImport(root) {
  const ia = state.key.has_key
  root.innerHTML = `
    <div class="page-head"><h1>Mon profil</h1>
      <p>Importez votre CV : il est analysé puis structuré. Vous vérifiez et corrigez ensuite chaque information.</p></div>
    ${ia ? '' : `<div class="banner warn" role="status">${ic('alert')}<div><b>IA non configurée</b>L'import automatique demande une IA pour structurer le CV. <a href="#/settings">Configurer maintenant</a>, ou remplissez le profil à la main.</div></div><div class="mt"></div>`}
    ${reimport ? `<div class="banner">${ic('file')}<div><b>Réimport</b>Le nouveau CV remplacera les informations actuelles une fois validé. <a href="#/profile" id="cancelImport">Annuler</a></div></div><div class="mt"></div>` : ''}
    <div class="import">
      <label class="drop ${ia ? '' : 'off'}" id="drop"><input class="sr-only" type="file" id="pdf" accept="application/pdf" ${ia ? '' : 'disabled'}>
        ${ic('upload')}<strong>Importer votre CV en PDF</strong>
        <span>Déposez le fichier ici ou cliquez pour le choisir. 5 Mo maximum ; le PDF n'est pas conservé.</span></label>
      <div class="alt"><button class="linkbtn" id="paste" ${ia ? '' : 'disabled'}>${ic('paste')}Coller le texte du CV</button>
        <button class="linkbtn" id="manual">${ic('pencil')}Remplir à la main</button></div>
    </div>`
  $('#cancelImport')?.addEventListener('click', (e) => { e.preventDefault(); reimport = false; render(root) })
  const drop = $('#drop')
  ;['dragover', 'dragenter'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over') }))
  ;['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('over')))
  drop.addEventListener('drop', (e) => { e.preventDefault(); if (ia && e.dataTransfer.files[0]) importPdf(root, e.dataTransfer.files[0]) })
  $('#pdf').onchange = (e) => e.target.files[0] && importPdf(root, e.target.files[0])
  $('#paste').onclick = () => pasteDialog(root)
  $('#manual').onclick = () => { draft = blank(); dirty = true; reimport = false; render(root) }
}

const toBase64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file) })

async function importPdf(root, file) {
  if (file.type !== 'application/pdf') return toast('Ce fichier n\'est pas un PDF.', 'err')
  if (file.size > 5 * 1024 * 1024) return toast('PDF trop volumineux (5 Mo maximum).', 'err')
  runImport(root, { kind: 'pdf', data: await toBase64(file) })
}

function pasteDialog(root) {
  const d = openDialog(`<h2>Coller le texte du CV</h2>
    <label class="field"><span>Contenu du CV</span><textarea id="pasted" rows="12" placeholder="Collez ici le texte de votre CV"></textarea></label>
    <div class="actions"><button class="btn secondary" data-close="x">Annuler</button><button class="btn" id="go">Analyser</button></div>`)
  $('#go').onclick = () => { const text = $('#pasted').value; if (text.trim().length < 80) return toast('Texte trop court.', 'err'); closeDialog(); runImport(root, { kind: 'text', text }) }
}

async function runImport(root, body) {
  openDialog(`<h2>Analyse du CV</h2><p class="muted"><span class="spin" aria-hidden="true"></span> Extraction et structuration en cours, jusqu'à une minute…</p>`)
  $('#dialog').oncancel = (e) => e.preventDefault()
  try {
    const { profile: p } = await call('cv/import', 'POST', body)
    draft = norm({ ...p, verifie: false }); dirty = true; reimport = false
    closeDialog(); render(root); window.scrollTo(0, 0)
    toast('CV analysé : vérifiez les informations ci-dessous.')
  } catch (e) {
    closeDialog(); toast(e.message, 'err')
  }
}

// ---------- Éditeur ----------
const input = (label, path, v, opt = {}) => `<label class="field ${opt.cls || ''}"><span>${label}</span>${opt.area
  ? `<textarea data-path="${path}" rows="${opt.rows || 4}" ${opt.ph ? `placeholder="${esc(opt.ph)}"` : ''}>${esc(v)}</textarea>`
  : `<input data-path="${path}" value="${esc(v)}" ${opt.ph ? `placeholder="${esc(opt.ph)}"` : ''} ${opt.list ? `data-list="1"` : ''}>`}</label>`
const select = (label, path, v, options) => `<label class="field"><span>${label}</span><select data-path="${path}">${options.map((o) => { const [val, text] = Array.isArray(o) ? o : [o, o || '—']; return `<option value="${esc(val)}" ${val === v ? 'selected' : ''}>${esc(text)}</option>` }).join('')}</select></label>`
const tools = (k, i, n) => `<div class="tools"><button class="btn ghost icon" data-act="mv:${k}:${i}:-1" aria-label="Monter" ${i === 0 ? 'disabled' : ''}>${ic('up')}</button><button class="btn ghost icon" data-act="mv:${k}:${i}:1" aria-label="Descendre" ${i === n - 1 ? 'disabled' : ''}>${ic('down')}</button><button class="btn ghost icon" data-act="rm:${k}:${i}" aria-label="Supprimer">${ic('close')}</button></div>`
const sectionHead = (id, title, hint, k) => `<header><div><h2>${title}</h2>${hint ? `<p>${hint}</p>` : ''}</div>${k ? `<button class="btn secondary sm" data-act="add:${k}">${ic('plus')}Ajouter</button>` : ''}</header>`
const SECTIONS = [['p-identite', 'Identité'], ['p-experiences', 'Expériences'], ['p-formations', 'Formations'], ['p-competences', 'Compétences'], ['p-langues', 'Langues'], ['p-recherche', 'Recherche']]

function renderEditor(root) {
  const p = draft, r = p.recherche
  root.innerHTML = `
    <div class="page-head"><h1>Mon profil</h1><p>Ces informations servent à évaluer les offres et à proposer des modifications de votre CV.</p></div>
    ${p.verifie && !dirty ? '' : `<div class="banner" role="status">${ic('alert')}<div><b>${p.verifie ? 'Modifications non enregistrées' : 'À vérifier'}</b>${p.verifie ? 'Enregistrez pour les prendre en compte.' : "Les informations ont été extraites automatiquement et peuvent contenir des erreurs. Contrôlez-les, corrigez les catégories (type d'expérience, compétences…), puis validez."}</div></div><div class="mt"></div>`}
    <div class="profile">
      <nav class="toc" aria-label="Sections du profil">${SECTIONS.map(([id, t]) => `<a href="#/profile" data-scroll="${id}">${t}</a>`).join('')}</nav>
      <div>
        <section class="psec" id="p-identite" aria-labelledby="h-identite">${sectionHead('p-identite', '<span id="h-identite">Identité</span>', '', '')}
          <div class="idblock">${pb.authStore.record?.avatar ? avatarHtml(192, 'xl') : ''}<div class="grid3">${input('Nom', 'identite.nom', p.identite.nom)}${input('Titre / poste actuel', 'identite.titre', p.identite.titre, { ph: 'Développeur web' })}${input('Localisation', 'identite.lieu', p.identite.lieu, { ph: 'Lyon' })}</div></div>
          <div class="mt">${input('Résumé', 'resume', p.resume, { area: true, rows: 4 })}</div></section>

        <section class="psec" id="p-experiences">${sectionHead('p-experiences', 'Expériences', 'Classez chaque élément : emploi, stage, alternance, freelance, projet ou bénévolat.', 'experiences')}
          ${p.experiences.length ? '' : `<div class="empty"><p>Aucune expérience. Ajoutez-en une.</p></div>`}
          ${p.experiences.map((x, i) => `<article class="entry" aria-label="Expérience ${i + 1}">
            <header><div class="grow"><b>${esc(x.poste || 'Nouvelle expérience')}</b><span class="muted"> ${esc(x.entreprise)}</span></div>${tools('experiences', i, p.experiences.length)}</header>
            <div class="grid3">${select('Catégorie', `experiences.${i}.categorie`, x.categorie, CATEGORIES)}${input('Poste / intitulé', `experiences.${i}.poste`, x.poste)}${input('Entreprise / structure', `experiences.${i}.entreprise`, x.entreprise)}</div>
            <div class="grid3 mt">${input('Lieu', `experiences.${i}.lieu`, x.lieu)}${input('Début', `experiences.${i}.debut`, x.debut, { ph: 'MM/AAAA' })}${input('Fin (vide = en cours)', `experiences.${i}.fin`, x.fin, { ph: 'MM/AAAA' })}</div>
            <div class="mt">${input('Missions et réalisations (une par ligne)', `experiences.${i}.description`, x.description, { area: true, rows: 5 })}</div></article>`).join('')}</section>

        <section class="psec" id="p-formations">${sectionHead('p-formations', 'Formations', 'Diplômes et certifications.', 'formations')}
          ${p.formations.map((x, i) => `<article class="entry" aria-label="Formation ${i + 1}"><div class="row"><div class="grow grid3">${input('Diplôme / certification', `formations.${i}.diplome`, x.diplome)}${input('Établissement', `formations.${i}.etablissement`, x.etablissement)}${input('Année', `formations.${i}.annee`, x.annee)}</div>${tools('formations', i, p.formations.length)}</div></article>`).join('')}</section>

        <section class="psec" id="p-competences">${sectionHead('p-competences', 'Compétences', 'Regroupées par catégorie. Séparez les éléments par des virgules.', 'competences')}
          ${p.competences.map((x, i) => `<article class="entry" aria-label="Catégorie de compétences ${i + 1}"><div class="row"><div class="grow grid2">${input('Catégorie', `competences.${i}.categorie`, x.categorie, { ph: 'Langages' })}${input('Compétences', `competences.${i}.items`, (x.items || []).join(', '), { list: true, ph: 'JavaScript, Python' })}</div>${tools('competences', i, p.competences.length)}</div></article>`).join('')}</section>

        <section class="psec" id="p-langues">${sectionHead('p-langues', 'Langues', '', 'langues')}
          ${p.langues.map((x, i) => `<article class="entry" aria-label="Langue ${i + 1}"><div class="row"><div class="grow grid2">${input('Langue', `langues.${i}.langue`, x.langue)}${select('Niveau', `langues.${i}.niveau`, x.niveau, LANGUE_NIVEAUX)}</div>${tools('langues', i, p.langues.length)}</div></article>`).join('')}</section>

        <section class="psec" id="p-recherche">${sectionHead('p-recherche', "Recherche d'emploi", "Préremplit la recherche et aide l'IA à juger l'adéquation.", '')}
          <div class="grid2">${input('Postes visés (séparés par des virgules)', 'recherche.metiers', r.metiers.join(', '), { list: true })}${input('Lieux souhaités', 'recherche.lieux', r.lieux.join(', '), { list: true })}</div>
          <div class="mt"><span class="label">Types de contrat</span><div class="checks mt">${CONTRATS.map((c) => `<label class="check"><input type="checkbox" data-check="recherche.contrats" value="${c}" ${r.contrats.includes(c) ? 'checked' : ''}>${c}</label>`).join('')}</div></div>
          <div class="grid2 mt">${select('Télétravail', 'recherche.teletravail', r.teletravail, TELETRAVAIL)}${select('Niveau', 'recherche.niveau', r.niveau, NIVEAUX)}</div></section>

        <div class="savebar"><button class="btn" id="save">${ic('check')}${p.verifie ? 'Enregistrer' : 'Valider mon profil'}</button>
          <button class="btn secondary" id="reimport">${ic('upload')}Réimporter un CV</button><span class="dirty" id="dirty" ${dirty ? '' : 'hidden'} role="status">${ic('alert')}Modifications non enregistrées</span></div>
      </div>
    </div>`

  bindAvatars(root)
  const markDirty = () => { dirty = true; $('#dirty').hidden = false }
  root.oninput = root.onchange = (e) => {
    const t = e.target
    if (t.dataset.path) { setPath(t.dataset.path, t.dataset.list ? list(t.value) : t.value); markDirty() }
    else if (t.dataset.check) { const arr = t.dataset.check.split('.').reduce((o, k) => o[k], draft); const i = arr.indexOf(t.value); t.checked ? i < 0 && arr.push(t.value) : i >= 0 && arr.splice(i, 1); markDirty() }
  }
  root.onclick = (e) => {
    const sc = e.target.closest('[data-scroll]')
    if (sc) { e.preventDefault(); document.getElementById(sc.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' }); return }
    const b = e.target.closest('[data-act]'); if (!b) return
    const [act, k, i, d] = b.dataset.act.split(':'); const a = draft[k]
    if (act === 'add') a.push(factories[k]())
    if (act === 'rm') a.splice(+i, 1)
    if (act === 'mv') { const j = +i + +d; if (j >= 0 && j < a.length) [a[+i], a[j]] = [a[j], a[+i]] }
    dirty = true; const y = scrollY; renderEditor(root); scrollTo(0, y)
  }
  $('#save').onclick = async (e) => {
    e.currentTarget.disabled = true
    try {
      await pb.collection('users').update(pb.authStore.record.id, { profile: { ...draft, verifie: true } })
      draft.verifie = true; dirty = false; toast('Profil enregistré.'); bus.dispatchEvent(new Event('chrome')); renderEditor(root)
    } catch (err) { toast('Enregistrement impossible : ' + err.message, 'err'); $('#save').disabled = false }
  }
  $('#reimport').onclick = () => { if (dirty && !confirm('Des modifications ne sont pas enregistrées. Continuer ?')) return; reimport = true; dirty = false; render(root) }
}
