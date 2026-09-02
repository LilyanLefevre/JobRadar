// node --test tests/md.test.mjs : le rendu des descriptions ne doit jamais produire de HTML actif.
import test from 'node:test'
import assert from 'node:assert/strict'
import { renderMarkdown } from '../server/pb_public/md.js'

test('met en forme le markdown des offres', () => {
  const h = renderMarkdown('**Description entreprise :**\n============\n\n**Votre rôle**\n\n- Développer\n- Tester\n\n1. Un\n2. Deux\n\nTexte avec \\- tiret et \\* étoile')
  assert.match(h, /<strong>Description entreprise :<\/strong>/)
  assert.match(h, /<ul><li>Développer<\/li><li>Tester<\/li><\/ul>/)
  assert.match(h, /<ol><li>Un<\/li><li>Deux<\/li><\/ol>/)
  assert.ok(!h.includes('====') && !h.includes('**'))
  assert.match(h, /tiret et &#42; étoile/)
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
