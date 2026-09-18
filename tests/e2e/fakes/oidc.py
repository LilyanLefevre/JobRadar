import json, urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
class H(BaseHTTPRequestHandler):
    def do_GET(self):
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
        if u.path == "/authorize":
            self.send_response(302); self.send_header("Location", f"{q['redirect_uri'][0]}?code=abc&state={q['state'][0]}"); self.end_headers()
        elif u.path == "/userinfo":
            b = json.dumps({"sub":"42","email":"new@t.io","name":"Nouveau","email_verified":True}).encode()
            self.send_response(200); self.send_header("Content-Type","application/json"); self.end_headers(); self.wfile.write(b)
        else: self.send_response(404); self.end_headers()
    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length",0)))
        b = json.dumps({"access_token":"tok","token_type":"Bearer","expires_in":3600}).encode()
        self.send_response(200); self.send_header("Content-Type","application/json"); self.end_headers(); self.wfile.write(b)
    def log_message(self,*a): pass
HTTPServer(("127.0.0.1",9100),H).serve_forever()
