"""Serve the generated review build using the requested local address."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

parser = argparse.ArgumentParser()
parser.add_argument("--host", default="127.0.0.1")
parser.add_argument("--port", type=int, default=3000)
parser.add_argument("--strictPort", action="store_true")
args = parser.parse_args()
handler = partial(SimpleHTTPRequestHandler, directory=".preview")
with ThreadingHTTPServer((args.host, args.port), handler) as server:
    server.serve_forever()
