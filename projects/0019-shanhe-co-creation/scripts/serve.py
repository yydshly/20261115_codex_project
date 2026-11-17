"""Serve the local library under the repository URL prefix."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
import argparse

PROJECT = Path(__file__).resolve().parents[1]
SITE = PROJECT.parents[1] / "_site"
PREFIX = "/20261115_codex_project"

class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        clean = urlsplit(path).path
        if clean == PREFIX:
            clean = "/"
        elif clean.startswith(PREFIX + "/"):
            clean = clean[len(PREFIX):]
        return super().translate_path(clean)

    def log_message(self, format, *args):
        if len(args) > 1 and str(args[1]).startswith(("4", "5")):
            super().log_message(format, *args)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=52941)
    args = parser.parse_args()
    if not (SITE / "demos" / PROJECT.name / "index.html").is_file():
        raise SystemExit("Run build.py --site-preview first")
    handler = partial(Handler, directory=str(SITE))
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        print(f"Local: http://127.0.0.1:{server.server_port}{PREFIX}/demos/{PROJECT.name}/index.html", flush=True)
        server.serve_forever()

if __name__ == "__main__":
    main()
