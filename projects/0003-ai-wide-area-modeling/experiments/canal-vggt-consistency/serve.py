"""Loopback-only static review server; no model execution or writes."""
import argparse
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

HERE = Path(__file__).resolve().parent
CFG = json.loads((HERE / 'manifest.json').read_text(encoding='utf-8'))
PROJECT = HERE.parents[1]
ROOTS = {'/assets/': PROJECT / 'assets/canal-vggt-consistency',
         '/out/': Path(CFG['out']),
         '/three/': Path('D:/codex/home/visualizations/2026/11/15/01a1de25-a21a-7db2-bd3c-5108c15683e8/sharp-canal-runtime/viewer-tools/node_modules/three')}
IMAGES = {view['id']: Path(view['path']) for view in CFG['views']}


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = unquote(urlparse(path).path)
        if path in ['/', '/review.html']:
            return str(HERE / 'review.html')
        if path.startswith('/images/'):
            return str(IMAGES.get(path[len('/images/'):], HERE / '__missing__'))
        for prefix, root in ROOTS.items():
            if path.startswith(prefix):
                candidate = (root / path[len(prefix):]).resolve()
                if candidate.is_relative_to(root.resolve()):
                    return str(candidate)
        return str(HERE / '__missing__')

    def log_message(self, format, *args):
        pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8775)
    args = parser.parse_args()
    print(f'http://127.0.0.1:{args.port}/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
