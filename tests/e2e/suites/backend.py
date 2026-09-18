import json, os, base64, time, subprocess, urllib.request, urllib.error, sqlite3
B = "http://localhost:8090"
def call(method, path, body=None, token=None):
    req = urllib.request.Request(B + path, method=method, data=json.dumps(body).encode() if body is not None else None, headers={"Content-Type": "application/json", **({"Authorization": token} if token else {})})
    try:
        with urllib.request.urlopen(req, timeout=120) as r: return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read() or b"{}")
        except Exception: return e.code, {}
def ok(name, cond, extra=""): print(("OK   " if cond else "FAIL ") + name + (("  " + str(extra)) if extra and not cond else ""))
def calls_log(): return open(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "fake_keys.log")).read().split() if os.path.exists(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "fake_keys.log")) else []
def reset_log():
    for f in (os.path.join(os.environ.get("E2E_TMP", "/tmp"), "fake_keys.log"), os.path.join(os.environ.get("E2E_TMP", "/tmp"), "fake_calls.log")):
        if os.path.exists(f): os.remove(f)

_, a = call("POST", "/api/collections/_superusers/auth-with-password", {"identity": "admin@test.local", "password": "adminpass123"}); SU = a["token"]
_, u = call("POST", "/api/collections/users/records", {"email": f"fo{int(time.time())}@t.io", "password": "password123", "passwordConfirm": "password123", "name": "FO"}, SU); UID = u["id"]
_, t = call("POST", f"/api/collections/users/impersonate/{UID}", None, SU); TOK = t["token"]
call("PATCH", f"/api/collections/users/records/{UID}", {"profile": {"resume": "Dev React", "experiences": [{"poste": "Dev", "entreprise": "X", "categorie": "Emploi", "debut": "2024", "fin": "", "lieu": "", "description": "React"}]}}, TOK)
jobs = lambda tag, n=3: [{"site": "indeed", "url": f"https://x.fr/{tag}/{i}", "titre": f"Poste {tag}{i}", "entreprise": "E", "lieu": "Lyon", "description": "desc " * 30} for i in range(n)]
def status(): return call("GET", "/jr/status", None, TOK)[1]

print("== configuration de plusieurs fournisseurs")
ok("clé inconnue refusée", call("POST", "/jr/key", {"provider": "fake", "key": "nope"}, TOK)[0] == 400)
for prov, key in (("fake", "down"), ("fake2", "good"), ("fake3", "limit")): ok(f"ajout {prov}", call("POST", "/jr/key", {"provider": prov, "key": key}, TOK)[0] == 200)
st = status(); ok("statut : 3 fournisseurs dans l'ordre d'ajout", [p["provider"] for p in st["providers"]] == ["fake", "fake2", "fake3"] and st["provider"] == "fake")
ok("mise à jour d'une clé existante (pas de doublon)", call("POST", "/jr/key", {"provider": "fake2", "key": "good"}, TOK)[0] == 200 and len(status()["providers"]) == 3)

print("== bascule : le principal est en panne (503)")
reset_log(); s, r = call("POST", "/jr/evaluate/batch", {"jobs": jobs("a")}, TOK)
ok("évaluation réussie malgré la panne", s == 200 and all(x for x in r["results"]), (s, r))
ok("réponse indique le fournisseur de secours", r.get("via") == "fake2" and r.get("switched") is True, r)
st = status(); p0 = st["providers"][0]
ok("principal mis en pause avec la raison", (not p0["ok"]) and p0["last_code"] == "unavailable" and "injoignable" in p0["last_error"].lower(), p0)
print("   clés appelées:", calls_log())

print("== pause respectée (pas de nouvel essai sur le principal)")
reset_log(); s, r = call("POST", "/jr/evaluate/batch", {"jobs": jobs("b")}, TOK)
ok("2e appel : directement le secours", s == 200 and calls_log() == ["good"], calls_log())

print("== cache indépendant du fournisseur")
reset_log(); s, r = call("POST", "/jr/evaluate/batch", {"jobs": jobs("a")}, TOK)
ok("mêmes offres : 0 appel (mémoire)", s == 200 and r["cached"] == 3 and calls_log() == [], (r.get("cached"), calls_log()))
call("POST", "/jr/keys/order", {"order": ["fake2", "fake", "fake3"]}, TOK)
reset_log(); s, r = call("POST", "/jr/evaluate/batch", {"jobs": jobs("a")}, TOK)
ok("ordre changé : toujours 0 appel (même mémoire)", s == 200 and r["cached"] == 3 and calls_log() == [])
ok("nouvel ordre pris en compte", [p["provider"] for p in status()["providers"]] == ["fake2", "fake", "fake3"])

print("== limite de débit (429) puis tous en échec"); pass  # fenêtre de limitation de débit de /jr/key
call("POST", "/jr/key", {"provider": "fake2", "key": "limit"}, TOK)   # le principal passe en limite
call("POST", "/jr/key", {"provider": "fake", "key": "down"}, TOK)      # remet fake à zéro (plus de pause)
call("POST", "/jr/key", {"provider": "fake3", "key": "down"}, TOK)
reset_log(); s, r = call("POST", "/jr/evaluate/batch", {"jobs": jobs("c")}, TOK)
ok("tous indisponibles -> 503 avec message cumulé", s == 503 and "Aucun fournisseur" in r.get("error", ""), (s, r))
codes = {p["provider"]: p["last_code"] for p in status()["providers"]}
ok("codes distincts (limite de débit / indisponible)", codes.get("fake2") == "rate_limit" and codes.get("fake") == "unavailable", codes)
reset_log(); s, r = call("POST", "/jr/evaluate/batch", {"jobs": jobs("d")}, TOK)
ok("tous en pause : on retente quand même (pas de blocage définitif)", len(calls_log()) >= 1, calls_log())

print("== clé révoquée (401) : mise de côté 24 h"); pass
call("POST", "/jr/key", {"provider": "fake2", "key": "revoked"}, TOK); call("POST", "/jr/key", {"provider": "fake", "key": "good"}, TOK)
reset_log(); s, r = call("POST", "/jr/evaluate/batch", {"jobs": jobs("e")}, TOK)
ok("secours utilisé après clé révoquée", s == 200 and r.get("via") == "fake", (s, r))
p = {x["provider"]: x for x in status()["providers"]}
ok("clé révoquée marquée 'auth' pour 24 h", p["fake2"]["last_code"] == "auth" and p["fake2"]["cooldown_until"] > time.time() + 80000, p["fake2"])

print("== suppression"); pass
call("DELETE", "/jr/key?provider=fake3", None, TOK); call("DELETE", "/jr/key?provider=fake2", None, TOK)
st = status(); ok("suppression ciblée, positions recompactées", [p["provider"] for p in st["providers"]] == ["fake"])
ok("évaluation toujours possible", call("POST", "/jr/evaluate/batch", {"jobs": jobs("f", 2)}, TOK)[0] == 200)
call("DELETE", "/jr/cache", None, TOK); reset_log(); s, r = call("POST", "/jr/evaluate/batch", {"jobs": jobs("f", 2)}, TOK)
ok("vider la mémoire force la réévaluation", r["cached"] == 0 and len(calls_log()) == 1, (r.get("cached"), calls_log()))

print("== notifications push")
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
import http_ece
def b64(b): return base64.urlsafe_b64encode(b).decode().rstrip("=")
priv = ec.generate_private_key(ec.SECP256R1()); pub = priv.public_key().public_bytes(Encoding.X962, PublicFormat.UncompressedPoint); auth = os.urandom(16)
sub = {"endpoint": "http://127.0.0.1:9997/push/dev1", "keys": {"p256dh": b64(pub), "auth": b64(auth)}}
s, r = call("GET", "/jr/push/key", None, TOK); ok("clé VAPID publique générée", s == 200 and len(r.get("public", "")) > 60, (s, r))
ok("clé VAPID stable (mémorisée)", call("GET", "/jr/push/key", None, TOK)[1]["public"] == r["public"])
ok("adresse interne refusée (SSRF)", call("POST", "/jr/push/subscribe", {"subscription": {"endpoint": "http://169.254.169.254/latest", "keys": sub["keys"]}}, TOK)[0] == 400)
ok("adresse non-push refusée", call("POST", "/jr/push/subscribe", {"subscription": {"endpoint": "https://evil.example.com/x", "keys": sub["keys"]}}, TOK)[0] == 400)
ok("abonnement valide enregistré", call("POST", "/jr/push/subscribe", {"subscription": sub, "label": "Test"}, TOK)[0] == 200)
ok("doublon : pas de seconde ligne", call("POST", "/jr/push/subscribe", {"subscription": sub, "label": "Test"}, TOK)[0] == 200 and len(call("GET", "/jr/push/devices", None, TOK)[1]["devices"]) == 1)
if os.path.exists(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "push_hits.log")): os.remove(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "push_hits.log"))
s, r = call("POST", "/jr/push/test", None, TOK); ok("envoi de test : 1 appareil", s == 200 and r.get("push") == 1, (s, r))
hits = [json.loads(l) for l in open(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "push_hits.log"))] if os.path.exists(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "push_hits.log")) else []
ok("requête vers le service de push signée VAPID, contenu chiffré", len(hits) == 1 and hits[0]["auth"].lower().startswith("vapid") and hits[0]["enc"] == "aes128gcm", hits)
plain = json.loads(http_ece.decrypt(open(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "push_last.bin"), "rb").read(), private_key=priv, auth_secret=auth, version="aes128gcm"))
ok("le message déchiffré contient titre, texte et lien", plain["title"] == "JobRadar" and "notifications" in plain["body"] and plain["url"] == "/#/alerts", plain)
gone = {"endpoint": "http://127.0.0.1:9997/push/gone", "keys": sub["keys"]}
call("POST", "/jr/push/subscribe", {"subscription": gone}, TOK); call("POST", "/jr/push/test", None, TOK)
ok("abonnement expiré (410) supprimé automatiquement", len(call("GET", "/jr/push/devices", None, TOK)[1]["devices"]) == 1)
d = call("GET", "/jr/push/devices", None, TOK)[1]["devices"][0]; call("POST", "/jr/push/unsubscribe", {"id": d["id"]}, TOK)
ok("désabonnement d'un appareil", len(call("GET", "/jr/push/devices", None, TOK)[1]["devices"]) == 0)

print("== alerte -> notification")
call("POST", "/jr/push/subscribe", {"subscription": sub, "label": "Test"}, TOK)
call("POST", "/api/collections/alerts/records", {"user": UID, "name": "Dev Lyon", "query": "développeur", "location": "Lyon", "sites": ["hellowork"], "hours": 72, "min_score": 70, "active": True}, TOK)
_, al = call("GET", "/api/collections/alerts/records", None, TOK); AID = al["items"][0]["id"]
if os.path.exists(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "push_hits.log")): os.remove(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "push_hits.log"))
call("PATCH", f"/api/collections/alerts/records/{AID}", {"queued": True}, TOK)
for _ in range(30):
    time.sleep(5); _, a1 = call("GET", f"/api/collections/alerts/records/{AID}", None, TOK)
    if a1["last_status"] in ("ok", "error", "skipped") and not a1["queued"]: break
ok("passage d'alerte terminé", a1["last_status"] == "ok", a1.get("last_message"))
time.sleep(1); hits = [json.loads(l) for l in open(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "push_hits.log"))] if os.path.exists(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "push_hits.log")) else []
ok("une notification push a été envoyée pour le rapport", len(hits) == 1, hits)
if hits:
    plain = json.loads(http_ece.decrypt(open(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "push_last.bin"), "rb").read(), private_key=priv, auth_secret=auth, version="aes128gcm"))
    ok("contenu : nom de l'alerte et nombre d'offres", "Dev Lyon" in plain["title"] and "offre" in plain["body"] and "match" in plain["body"], plain)

print("== prétraitement sans IA et alerte sans IA")
s, r = call("POST", "/jr/search", {"query": "développeur", "sites": ["indeed"]}, TOK)
j0 = next((x for x in r["jobs"] if x["titre"] == "Développeur web React"), {}) if s == 200 else {}
ok("salaire, contrat et télétravail repérés sans IA", (j0.get("salaire") or {}).get("texte") == "45 – 55 k€ / an" and j0.get("contrat") == "CDI" and j0.get("teletravail") == "Hybride", j0)
ok("pertinence estimée fournie", isinstance(j0.get("pre"), int) and j0["pre"] > 0, j0.get("pre"))
call("POST", "/jr/key", {"provider": "fake", "key": "revoked"}, TOK); call("DELETE", "/jr/cache", None, TOK)
call("POST", "/api/collections/alerts/records", {"user": UID, "name": "Sans IA", "query": "développeur", "location": "Paris", "sites": ["indeed"], "hours": 72, "min_score": 70, "active": True}, TOK)
_, al = call("GET", "/api/collections/alerts/records", None, TOK); AID2 = next(x["id"] for x in al["items"] if x["name"] == "Sans IA")
call("PATCH", f"/api/collections/alerts/records/{AID2}", {"queued": True}, TOK)
for _ in range(30):
    time.sleep(5); _, a2 = call("GET", f"/api/collections/alerts/records/{AID2}", None, TOK)
    if a2["last_status"] in ("ok", "error", "skipped") and not a2["queued"]: break
_, runs = call("GET", f"/api/collections/alert_runs/records?filter=alert%3D'{AID2}'", None, TOK)
items = runs["items"][0]["jobs"] if runs["items"] else []
ok("alerte avec IA en panne : statut ok et offres transmises", a2["last_status"] == "ok" and len(items) == 12 and all(x["match"] is None and x["pre"] is not None for x in items), (a2.get("last_status"), a2.get("last_message"), len(items)))

print("== lot unique de 15")
for p in ("fake",):
    pass
call("POST", "/jr/key", {"provider": "fake", "key": "good"}, TOK); call("DELETE", "/jr/cache", None, TOK); reset_log()
s, r = call("POST", "/jr/evaluate/batch", {"jobs": jobs("g", 15)}, TOK)
ok("15 offres en un seul appel d'IA", s == 200 and len(r["results"]) == 15 and all(r["results"]) and len(calls_log()) == 1, (s, len(calls_log())))
reset_log(); s, r = call("POST", "/jr/evaluate/batch", {"jobs": jobs("h", 20)}, TOK)
