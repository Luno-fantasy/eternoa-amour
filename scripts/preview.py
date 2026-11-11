"""Serve the generated review build using the requested local address."""
import argparse
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

class PreviewHandler(SimpleHTTPRequestHandler):
    def send_error(self, code, message=None, explain=None):
        if code != HTTPStatus.NOT_FOUND:
            return super().send_error(code, message, explain)
        try:
            content = (Path(self.directory) / "404.html").read_bytes()
        except OSError:
            return super().send_error(code, message, explain)
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(content)


parser = argparse.ArgumentParser()
parser.add_argument("--host", default="127.0.0.1")
parser.add_argument("--port", type=int, default=3000)
parser.add_argument("--strictPort", action="store_true")
args = parser.parse_args()
handler = partial(PreviewHandler, directory=".preview")
with ThreadingHTTPServer((args.host, args.port), handler) as server:
    server.serve_forever()
