"""Loopback-only viewer serving three explicit roots; no public deployment."""
import argparse,functools
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import unquote,urlparse
import mimetypes
p=argparse.ArgumentParser();p.add_argument('--modules',required=True);p.add_argument('--results',required=True);p.add_argument('--port',type=int,default=8769)
p.add_argument('--viewer');p.add_argument('--source-results');a=p.parse_args()
roots={'/modules/':Path(a.modules).resolve(),'/result/':Path(a.results).resolve()}
if a.source_results:roots['/source/']=Path(a.source_results).resolve()
viewer=Path(a.viewer).resolve() if a.viewer else Path(__file__).with_name('viewer.html')
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        url=unquote(urlparse(self.path).path);path=None
        if url in ('/','/viewer.html'):path=viewer
        else:
            for prefix,root in roots.items():
                if url.startswith(prefix):
                    candidate=(root/url[len(prefix):]).resolve()
                    if candidate.is_relative_to(root):path=candidate
                    break
        if path is None or not path.is_file():self.send_error(404);return
        self.send_response(200);mime=mimetypes.guess_type(str(path))[0] or 'application/octet-stream'
        if path.suffix=='.js':mime='text/javascript'
        self.send_header('Content-Type',mime);self.send_header('Content-Length',str(path.stat().st_size))
        self.send_header('Cross-Origin-Opener-Policy','same-origin');self.send_header('Cross-Origin-Embedder-Policy','require-corp');self.end_headers()
        try:
            with path.open('rb') as f:
                for data in iter(lambda:f.read(1024*1024),b''):self.wfile.write(data)
        except (BrokenPipeError,ConnectionResetError):pass
    def log_message(self,fmt,*args):
        if args and str(args[1])!='200':print(fmt%args,flush=True)
print(f'Viewer http://127.0.0.1:{a.port}',flush=True)
ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()
