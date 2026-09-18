import os
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
PROFILE = {"identite":{"nom":"Alice Martin","titre":"Développeuse web","lieu":"Lyon"},"resume":"Développeuse full-stack, 2 ans d'expérience.",
 "experiences":[{"categorie":"Emploi","poste":"Développeuse React","entreprise":"Acme","lieu":"Lyon","debut":"01/2024","fin":"","description":"Interfaces React\nTests Jest"},
                {"categorie":"Stage","poste":"Stagiaire Node","entreprise":"Beta","lieu":"Paris","debut":"06/2023","fin":"09/2023","description":"API REST"}],
 "formations":[{"diplome":"Master Informatique","etablissement":"Université Lyon 1","annee":"2023"}],
 "competences":[{"categorie":"Langages","items":["JavaScript","Python"]}],"langues":[{"langue":"Français","niveau":"Bilingue / natif"}],
 "recherche":{"metiers":["Développeuse web"],"contrats":["CDI"],"lieux":["Lyon"],"teletravail":"hybride","niveau":"Junior"}}
EVAL = {"match":84,"cv_score":72,"verdict":"Profil solide pour ce poste : la stack React/Node correspond, il manque surtout TypeScript et une démarche de tests.",
 "forces":["Deux ans d'expérience en React et Node, en phase avec l'offre","Réalisations concrètes sur des interfaces et des API REST","Localisation et niveau (junior) compatibles"],
 "manques":["TypeScript n'apparaît pas dans le CV alors qu'il est demandé","Aucune mention de tests automatisés (Jest, Cypress)","Pas de résultats chiffrés sur les projets"],
 "modifs":[{"section":"Résumé","avant":"Développeuse full-stack, 2 ans d'expérience.","apres":"Développeuse full-stack React / Node.js (2 ans), orientée interfaces fiables et testées, à l'aise avec TypeScript.","pourquoi":"Reprend les mots-clés de l'offre dès la première ligne."},
 {"section":"Expérience Acme","avant":"Interfaces React","apres":"Conception d'interfaces React (TypeScript) utilisées par 4 000 clients, couverture de tests Jest à 80 %.","pourquoi":"Quantifie l'impact et nomme les tests attendus."}]}
VERDICTS = ["Très bon alignement : stack, niveau et lieu correspondent.","Bonne piste, quelques compétences à mettre en avant.","Correspondance moyenne : le poste demande plus d'expérience.","Éloigné de votre profil : technologies différentes.","Peu pertinent : domaine et niveau ne correspondent pas."]
class H(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        b = json.dumps(obj).encode(); self.send_response(code); self.send_header("Content-Type","application/json"); self.send_header("Content-Length",str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self): self._send(200 if self.headers.get("Authorization") in ("Bearer good", "Bearer down", "Bearer limit", "Bearer revoked") else 401, {"data":[]})
    def do_POST(self):
        body = self.rfile.read(int(self.headers["Content-Length"])).decode()
        key = (self.headers.get("Authorization") or "").replace("Bearer ", "")
        open(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "fake_keys.log"),"a").write(key + "\n")
        if key == "down": return self._send(503, {"error":"overloaded"})
        if key == "limit": return self._send(429, {"error":"rate limited"})
        if key == "revoked": return self._send(401, {"error":"bad key"})
        open(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "fake_calls.log"),"a").write(("batch:%d\n" % body.count("### Offre ")) if "### Offre" in body else "single\n")
        if "### Offre" in body:
            n = body.count("### Offre ")
            out = {"evaluations": [{"ref": i, "match": 90 - 7 * i, "cv_score": 70, "verdict": VERDICTS[min(i, 4)], "forces": ["Stack React / Node.js demandée", "Niveau junior compatible", "Même zone géographique", "Expérience en API REST"], "manques": ["TypeScript à mettre en avant", "Tests automatisés non cités"]} for i in range(n)]}
            if "OMIT_LAST" in body and n > 1: out["evaluations"] = out["evaluations"][:-1]
        else:
            out = PROFILE if "structures un CV" in body else EVAL
        self._send(200, {"choices":[{"message":{"content":json.dumps(out)}}]})
    def log_message(self,*a): pass
HTTPServer(("127.0.0.1",9999),H).serve_forever()
