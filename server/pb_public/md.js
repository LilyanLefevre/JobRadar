// Rendu markdown minimal et SÛR pour les descriptions d'offres : tout est échappé avant d'être mis en forme,
// seuls les liens http(s) sont acceptés. Gère titres, gras, italique, listes, séparateurs, liens et paragraphes.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const inline = (raw) => esc(raw)
  .replace(/\\([*_])/g, (_, c) => (c === '*' ? '&#42;' : '&#95;')) // \* et \_ restent littéraux
  .replace(/\\([\\`{}[\]()#+\-.!|>~])/g, '$1') // autres échappements markdown : on retire l'antislash
  .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/__(.+?)__/g, '<strong>$1</strong>')
  .replace(/(^|[^*\w])\*(?!\s)([^*]+?)(?<!\s)\*(?!\*)/g, '$1<em>$2</em>')

export function renderMarkdown(src) {
  const out = []
  let list = null, para = []
  const flushPara = () => { if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = [] }
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null } }
  for (const line of String(src ?? '').slice(0, 30000).replace(/\r/g, '').split('\n')) {
    const t = line.trim()
    let m
    if (!t) { flushPara(); closeList(); continue }
    if (/^={3,}$/.test(t)) continue // soulignement de titre « ==== »
    if (/^([-*_])\1{2,}$/.test(t)) { flushPara(); closeList(); out.push('<hr>'); continue }
    if ((m = t.match(/^#{1,6}\s+(.*)$/))) { flushPara(); closeList(); out.push(`<h4>${inline(m[1])}</h4>`); continue }
    if ((m = t.match(/^[-*•]\s+(.*)$/))) { flushPara(); if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul' } out.push(`<li>${inline(m[1])}</li>`); continue }
    if ((m = t.match(/^\d+[.)]\s+(.*)$/))) { flushPara(); if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol' } out.push(`<li>${inline(m[1])}</li>`); continue }
    closeList(); para.push(t)
  }
  flushPara(); closeList()
  return out.join('')
}
