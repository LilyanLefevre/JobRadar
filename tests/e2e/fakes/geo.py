import json, urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
COMMUNES = [("Lyon", "Rhône", "69"), ("Lyon-en-Ville", "Ain", "01"), ("Paris", "Paris", "75"), ("Nantes", "Loire-Atlantique", "44")]
class H(BaseHTTPRequestHandler):
    def do_GET(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get("nom", [""])[0].lower()
        out = [{"nom": n, "departement": {"nom": d, "code": c}} for n, d, c in COMMUNES if n.lower().startswith(q)]
        b = json.dumps(out).encode(); self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(b)
    def log_message(self, *a): pass
HTTPServer(("127.0.0.1", 9998), H).serve_forever()
