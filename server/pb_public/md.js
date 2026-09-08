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

const isHeading = (t, prevBlank, next) => {
  if (!prevBlank || t.length > 70 || /[.,;!?]$/.test(t) || /^([-*•]|\d+[.)])\s/.test(t)) return false
  if (next && /^(={3,}|-{3,})$/.test(next.trim())) return true // titre souligné (====) 
  if (/^\*\*[^*]+\*\*\s*:?$/.test(t)) return true // ligne entièrement en gras
  const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, '')
  if (letters.length >= 4 && t === t.toUpperCase()) return true // MAJUSCULES
  if (/:$/.test(t) && t.length <= 50) return true // « Profil recherché : »
  return t.length <= 40 && !!next && next.trim().length > t.length + 10 && !/^([-*•]|\d+[.)])\s/.test(next.trim()) // titre court suivi d'un paragraphe
}

export function renderMarkdown(src) {
  const out = []
  const pushHeading = (html) => { if (out.at(-1)?.startsWith('<h4>')) out.pop(); out.push(html) } // un titre sans contenu est retiré
  let list = null, para = [], prevBlank = true, skipRule = false
  const flushPara = () => { if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = [] }
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null } }
  const lines = String(src ?? '').slice(0, 30000).replace(/\r/g, '').split('\n')
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    let m
    if (!t) { flushPara(); closeList(); prevBlank = true; continue }
    const wasBlank = prevBlank; prevBlank = false
    if (/^={3,}$/.test(t)) continue // soulignement de titre « ==== »
    if (/^([-*_])\1{2,}$/.test(t)) { if (skipRule) { skipRule = false; continue } flushPara(); closeList(); out.push('<hr>'); continue }
    if ((m = t.match(/^#{1,6}\s+(.*)$/))) { flushPara(); closeList(); pushHeading(`<h4>${inline(m[1])}</h4>`); continue }
    const nextLine = lines.slice(i + 1).find((l) => l.trim())
    if (isHeading(t, wasBlank, nextLine)) { skipRule = !!nextLine && /^-{3,}$/.test(nextLine.trim()); flushPara(); closeList(); pushHeading(`<h4>${inline(t.replace(/^\*\*(.+?)\*\*\s*:?$/, (_, x) => x.trim())).replace(/\s*:$/, '')}</h4>`); continue }
    if ((m = t.match(/^[-*•]\s+(.*)$/))) { flushPara(); if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul' } out.push(`<li>${inline(m[1])}</li>`); continue }
    if ((m = t.match(/^\d+[.)]\s+(.*)$/))) { flushPara(); if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol' } out.push(`<li>${inline(m[1])}</li>`); continue }
    // Puces collées dans un paragraphe (« …vite.- Tu prépares…- Tu maîtrises ») : on les sépare en liste.
    const runs = t.replace(/^>\s*/, '').split(/(?<=[.!?:])\s*-\s+(?=[A-ZÀ-Ý])/)
    if (runs.length >= 3) { flushPara(); closeList(); out.push(`<p>${inline(runs[0])}</p><ul>${runs.slice(1).map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`); continue }
    closeList(); para.push(t.replace(/^>\s*/, '')) // // « > » de citation markdown : on garde le texte
  }
  flushPara(); closeList()
  if (out.at(-1)?.startsWith('<h4>')) out.pop()
  return out.join('')
}
