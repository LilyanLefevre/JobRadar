// node --test tests/md.test.mjs : le rendu des descriptions ne doit jamais produire de HTML actif.
import test from 'node:test'
import assert from 'node:assert/strict'
import { renderMarkdown } from '../server/pb_public/md.js'

test('met en forme le markdown des offres', () => {
  const h = renderMarkdown('**Description entreprise :**\n============\n\nPrésentation de l\'entreprise.\n\n**Votre rôle**\n\n- Développer\n- Tester\n\n1. Un\n2. Deux\n\nTexte avec \\- tiret et \\* étoile')
  assert.match(h, /<h4>Description entreprise<\/h4>/)
  assert.match(h, /<ul><li>Développer<\/li><li>Tester<\/li><\/ul>/)
  assert.match(h, /<ol><li>Un<\/li><li>Deux<\/li><\/ol>/)
  assert.ok(!h.includes('====') && !h.includes('**'))
  assert.match(h, /tiret et &#42; étoile/)
})
test('promeut les lignes qui sont des titres', () => {
  const h = renderMarkdown('Détail du poste\n\nNous recherchons un développeur confirmé pour rejoindre nos équipes.\n\nTRAVAILLER CHEZ ALTECA\n\nTexte sur l\'entreprise et ses valeurs, assez long.\n\nÀ propos\nNous construisons des produits utilisés par des milliers de clients.\n\nProfil recherché :\n- Rigueur')
  assert.match(h, /<h4>TRAVAILLER CHEZ ALTECA<\/h4>/); assert.match(h, /<h4>Profil recherché<\/h4>/)
  assert.match(h, /<h4>Détail du poste<\/h4>/)
})
test('titre souligné par ==== ou ----', () => {
  const h = renderMarkdown('Détail du poste\n=========\n\nTexte du poste, assez long pour être un paragraphe.\n\nÀ propos\n--------\nAutre texte.')
  assert.match(h, /<h4>Détail du poste<\/h4>/); assert.match(h, /<h4>À propos<\/h4>/); assert.ok(!h.includes('<hr>') && !h.includes('===') )
})
test('ne promeut pas une phrase ordinaire', () => {
  const h = renderMarkdown('Intro\n\nNous cherchons une personne motivée et curieuse.\n\nElle rejoindra une équipe de dix personnes sur place.')
  assert.ok(!/<h4>Nous cherchons/.test(h)); assert.match(h, /<p>Nous cherchons une personne motivée et curieuse\.<\/p>/)
})
test('retire le > de citation', () => { assert.match(renderMarkdown('>Tu auras accès à une communauté technique d\'experts.'), /<p>Tu auras accès/) })
test('retire les titres sans contenu', () => {
  const h = renderMarkdown('Détail du poste\n=======\n\nÀ propos\n\nNous construisons des produits utilisés par des milliers de clients.\n\nTRAVAILLER CHEZ ALTECA')
  assert.ok(!h.includes('Détail du poste') && !h.includes('TRAVAILLER')); assert.match(h, /<h4>À propos<\/h4><p>Nous construisons/)
})
test('sépare les puces collées dans un paragraphe', () => {
  const h = renderMarkdown("Si tu aimes apprendre vite.- Tu prépares un Bachelor.- Tu maîtrises HTML et CSS.- Tu sais tester ton code.")
  assert.match(h, /<p>Si tu aimes apprendre vite\.<\/p><ul><li>Tu prépares un Bachelor\.<\/li><li>Tu maîtrises HTML et CSS\.<\/li><li>Tu sais tester ton code\.<\/li><\/ul>/)
  assert.ok(!/<ul>/.test(renderMarkdown('Un tiret simple - au milieu d\'une phrase reste du texte.')))
})
test('échappe le HTML', () => {
  const h = renderMarkdown('<img src=x onerror=alert(1)> <script>alert(1)</script> "quote"')
  assert.ok(!/<img|<script/i.test(h)); assert.match(h, /&lt;img/)
})
test('refuse les liens non http(s)', () => {
  assert.ok(!/href="javascript/i.test(renderMarkdown('[x](javascript:alert(1))')))
  assert.match(renderMarkdown('[ok](https://exemple.fr/a?b=1&c=2)'), /<a href="https:\/\/exemple\.fr\/a\?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">ok<\/a>/)
  assert.ok(!/onerror|"\s*on\w+=/i.test(renderMarkdown('[x](https://a.fr/" onmouseover="alert(1))')))
})
test('entrée vide ou énorme', () => { assert.equal(renderMarkdown(''), ''); assert.ok(renderMarkdown('a'.repeat(200000)).length < 31000) })
