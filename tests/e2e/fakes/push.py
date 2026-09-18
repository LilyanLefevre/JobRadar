import os

import json, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
class H(BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0)); body = self.rfile.read(n)
        open(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "push_hits.log"), "ab").write(json.dumps({"path": self.path, "auth": self.headers.get("Authorization", "")[:20], "enc": self.headers.get("Content-Encoding"), "len": n}).encode() + b"\n")
        open(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "push_last.bin"), "wb").write(body)
        self.send_response(410 if self.path.endswith("/gone") else 201); self.end_headers()
    def log_message(self, *a): pass
HTTPServer(("127.0.0.1", 9997), H).serve_forever()
