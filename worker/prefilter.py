"""Pré-traitement des offres sans IA : salaire, contrat, télétravail et pertinence estimée."""
import re
import unicodedata

NUM = r"(\d{1,3}(?:[   .]\d{3})+|\d+(?:[.,]\d+)?)"
EUR = r"(?:€|euros?\b|eur\b)"
AMOUNT = re.compile(NUM + r"\s*(k|K)?\s*(" + EUR + r")?", re.I)
RANGE_SEP = r"\s*(?:à|a|-|–|—|/|et|jusqu'à)\s*"
RANGE = re.compile(NUM + r"\s*(k)?\s*(?:" + EUR + r")?" + RANGE_SEP + NUM + r"\s*(k)?\s*(" + EUR + r"|k€)", re.I)
SINGLE = re.compile(NUM + r"\s*(k)?\s*(" + EUR + r"|k€)", re.I)
CTX = re.compile(r"salaire|r[ée]mun[ée]ration|brut|net|package|fixe|tjm|taux journalier|annuel|mensuel|/\s*(?:an|mois|h|jour)|par\s+(?:an|mois|heure|jour)|de l'heure", re.I)
PERIODS = [("an", r"par an|/\s*an\b|annuel|annuelle|/ ?année|k€|\bkeur|brut annuel"), ("mois", r"par mois|/\s*mois|mensuel|brut mensuel"),
           ("heure", r"/\s*h\b|par heure|de l'heure|horaire"), ("jour", r"par jour|/\s*jour|\btjm\b|journalier")]
LIMITS = {"an": (12000, 400000), "mois": (900, 30000), "heure": (8, 200), "jour": (100, 2000)}


def _num(t, k):
    t = t.replace(" ", "").replace(" ", "")
    t = re.sub(r"(?<=\d)[ .](?=\d{3}\b)", "", t).replace(",", ".")
    v = float(t)
    return v * 1000 if k else v


def _period(ctx, lo):
    for name, pat in PERIODS:
        if re.search(pat, ctx, re.I):
            return name
    return "an" if lo >= 10000 else "mois" if lo >= 900 else ""


def _fmt(v):
    return f"{round(v):,}".replace(",", " ")


def _out(lo, hi, per):
    lo, hi = sorted((lo, hi))
    a, b = LIMITS.get(per, (0, 1e9))
    if not per or not (a <= lo and hi <= b):
        return None
    if per == "an" and lo >= 1000 and hi >= 1000 and lo % 1000 == 0 and hi % 1000 == 0:
        txt = f"{lo / 1000:g}" + (f" – {hi / 1000:g}" if hi != lo else "") + " k€ / an"
    else:
        txt = _fmt(lo) + (f" – {_fmt(hi)}" if hi != lo else "") + f" € / {per}"
    return {"min": lo, "max": hi, "periode": per, "texte": txt}


def salary(row, text):
    """Salaire de la fiche si le site le fournit, sinon repéré dans le texte."""
    lo, hi = row.get("min_amount"), row.get("max_amount")
    try:
        lo, hi = float(lo), float(hi or lo)
        per = {"yearly": "an", "monthly": "mois", "hourly": "heure", "daily": "jour"}.get(str(row.get("interval")).lower(), "")
        if (s := _out(lo, hi, per or _period("", lo))):
            return s
    except (TypeError, ValueError):
        pass
    for m in RANGE.finditer(text):
        ctx = text[max(0, m.start() - 60): m.end() + 40]
        if not CTX.search(ctx) and not (m.group(4) or m.group(5).lower() == "k€"):
            continue
        k = bool(m.group(2) or m.group(4)) or m.group(5).lower() == "k€"
        lo, hi = _num(m.group(1), k), _num(m.group(3), k)
        if (s := _out(lo, hi, _period(ctx, min(lo, hi)))):
            return s
    for m in SINGLE.finditer(text):
        ctx = text[max(0, m.start() - 60): m.end() + 40]
        if not CTX.search(ctx):
            continue
        v = _num(m.group(1), bool(m.group(2)) or m.group(3).lower() == "k€")
        if (s := _out(v, v, _period(ctx, v))):
            return s
    return None


CONTRATS = [("CDI", r"\bcdi\b|contrat à durée indéterminée"), ("CDD", r"\bcdd\b|durée déterminée"), ("Alternance", r"alternance|apprentissage|contrat pro"),
            ("Stage", r"\bstage\b|stagiaire|internship"), ("Freelance", r"freelance|indépendant|portage"), ("Intérim", r"int[ée]rim")]


def contrat(row, text):
    for label, pat in CONTRATS:
        if re.search(pat, text, re.I):
            return label
    return ""


def remote(row, text):
    if re.search(r"full remote|100 ?% ?(?:t[ée]l[ée]travail|remote)|t[ée]l[ée]travail complet|remote", text, re.I) or row.get("is_remote") is True:
        return "Télétravail complet"
    if re.search(r"hybride|t[ée]l[ée]travail|jours? de remote|jours? en t[ée]l[ée]travail", text, re.I):
        return "Hybride"
    return ""


def fold(s):
    return unicodedata.normalize("NFD", str(s).lower()).encode("ascii", "ignore").decode()


STOP = {"les", "des", "pour", "avec", "dans", "une", "chez", "sur", "the", "and"}


def _tokens(s):
    return [t for t in re.findall(r"[a-z0-9+#.]+", fold(s)) if len(t) > 2 and t not in STOP]


def relevance(titre, description, query, keywords):
    """Pertinence estimée (0-100) : mots de la recherche dans le titre et le texte, compétences du profil dans le texte."""
    q = _tokens(query)
    t, d = fold(titre), fold(description)
    if not q:
        return None
    score = 55 * sum(1 for w in q if w in t) / len(q) + 15 * sum(1 for w in q if w in d) / len(q)
    kws = [k for k in {fold(k).strip() for k in keywords} if len(k) > 1][:60]
    if kws:
        hits = sum(1 for k in kws if re.search(r"(?<![a-z0-9])" + re.escape(k) + r"(?![a-z0-9])", t + " " + d))
        score += 30 * min(hits, 6) / 6
    return round(score)


def enrich(row, query, keywords):
    text = f"{row.get('title', '')}\n{row.get('description', '')}"
    return {"salaire": salary(row, text), "contrat": contrat(row, text), "teletravail": remote(row, text),
            "pre": relevance(row.get("title", ""), row.get("description", ""), query, keywords)}


ANNUEL = {"an": 1, "mois": 12, "jour": 218, "heure": 1607}


def keep_salary(job, minimum, required):
    """Critère de salaire (annuel brut) : une offre sans salaire indiqué reste, sauf si « indiqué uniquement »."""
    s = job.get("salaire")
    if not s:
        return not required
    return not minimum or s["max"] * ANNUEL[s["periode"]] >= minimum
