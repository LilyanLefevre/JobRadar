"""JobRadar: recherche d'offres (JobSpy) + évaluation du CV par Claude (CLI `claude -p`)."""
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

from flask import Flask, jsonify, request
from jobspy import scrape_jobs

app = Flask(__name__, static_folder="static", static_url_path="")
CV_FILE = Path(os.environ.get("DATA_DIR", Path(__file__).parent)) / "cv.md"
MODEL = os.environ.get("JOBRADAR_MODEL", "sonnet")

PROMPT = """Tu es un recruteur et coach carrière français. Compare le CV et l'offre ci-dessous.
Réponds UNIQUEMENT par un objet JSON valide (sans markdown, sans texte autour) :
{{"match": <0-100 adéquation profil/offre>,
 "cv_score": <0-100 qualité du CV pour CETTE offre (mots-clés, pertinence, lisibilité)>,
 "verdict": "<une phrase>",
 "forces": ["..."], "manques": ["..."],
 "modifs": [{{"section": "...", "avant": "...", "apres": "...", "pourquoi": "..."}}]}}
Max 4 forces, 4 manques, 5 modifs concrètes et réalistes (n'invente aucune expérience).

=== CV ===
{cv}

=== OFFRE ===
{titre} chez {entreprise} ({lieu})
{description}
"""


@app.get("/")
def index():
    return app.send_static_file("index.html")


@app.get("/api/cv")
def get_cv():
    return jsonify(cv=CV_FILE.read_text() if CV_FILE.exists() else "")


@app.put("/api/cv")
def put_cv():
    CV_FILE.write_text(request.json["cv"])
    return jsonify(ok=True)


@app.post("/api/search")
def search():
    p = request.json
    df = scrape_jobs(
        site_name=p.get("sites") or ["indeed", "linkedin"],
        search_term=p["query"],
        location=p.get("location") or "France",
        results_wanted=int(p.get("n", 15)),
        hours_old=int(p.get("hours", 168)) or None,
        country_indeed="France",
        linkedin_fetch_description=True,
    )
    df = df.fillna("").drop_duplicates(subset=["job_url"])
    jobs = [
        {
            "id": r.job_url,
            "titre": r.title,
            "entreprise": r.company,
            "lieu": r.location,
            "site": r.site,
            "url": r.job_url,
            "date": str(r.date_posted),
            "description": r.description,
        }
        for r in df.itertuples()
    ]
    return jsonify(jobs=jobs)


@app.post("/api/evaluate")
def evaluate():
    j = request.json
    cv = CV_FILE.read_text() if CV_FILE.exists() else ""
    if not cv.strip():
        return jsonify(error="CV vide"), 400
    prompt = PROMPT.format(cv=cv, titre=j["titre"], entreprise=j["entreprise"],
                           lieu=j["lieu"], description=j["description"][:6000])
    try:
        out = subprocess.run(
            ["claude", "-p", "--model", MODEL, "--no-session-persistence"],
            input=prompt, capture_output=True, text=True, timeout=180,
            cwd=tempfile.gettempdir(),  # évite de charger le contexte d'un projet
        ).stdout
        data = json.loads(re.search(r"\{.*\}", out, re.S).group(0))
    except Exception as e:  # claude indisponible, timeout, JSON invalide
        return jsonify(error=f"évaluation échouée: {e}"), 502
    return jsonify(data)


if __name__ == "__main__":
    app.run(port=5055, threaded=True)
