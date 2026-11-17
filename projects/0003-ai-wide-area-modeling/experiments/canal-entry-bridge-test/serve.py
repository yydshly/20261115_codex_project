"""Loopback-only read-only viewer for the new two-image entry experiment."""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parents[1] / 'assets/canal-entry-bridge-test'


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = unquote(urlparse(path).path)
        if path in ['/', '/review.html']:
            return str(HERE / 'review.html')
        if path == '/prompts.json':
            return str(HERE / 'prompts.json')
        if path.startswith('/assets/'):
            item = (ASSETS / path[len('/assets/'):]).resolve()
            if item.is_relative_to(ASSETS.resolve()):
                return str(item)
        return str(HERE / '__missing__')

    def log_message(self, format, *args):
        pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8776)
    args = parser.parse_args()
    print(f'http://127.0.0.1:{args.port}/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
