"""Serve the local research library with byte-range video playback support."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
import argparse
import re

PROJECT = Path(__file__).resolve().parents[1]
SITE = PROJECT.parents[1] / '_site'
PREFIX = '/20261115_codex_project'

class Handler(SimpleHTTPRequestHandler):
    def translate_path(self,path):
        clean = urlsplit(path).path
        if clean == PREFIX:
            clean = '/'
        elif clean.startswith(PREFIX+'/'):
            clean = clean[len(PREFIX):]
        resolved = Path(super().translate_path(clean)).resolve()
        if not resolved.is_relative_to(SITE.resolve()):
            return str(SITE / '__outside_not_allowed__')
        return str(resolved)

    def send_head(self):
        self._remaining = None
        clean = urlsplit(self.path).path
        if clean == '/':
            self.send_response(302)
            self.send_header('Location',PREFIX+'/demos/'+PROJECT.name+'/index.html')
            self.send_header('Content-Length','0')
            self.end_headers()
            return None
        if clean != PREFIX and not clean.startswith(PREFIX+'/'):
            self.send_error(404)
            return None
        path = Path(self.translate_path(self.path))
        if path.is_dir() and not any((path / name).is_file() for name in ('index.html','index.htm')):
            self.send_error(403, 'Directory listing disabled')
            return None
        header = self.headers.get('Range')
        if not header or not path.is_file():
            return super().send_head()
        size = path.stat().st_size
        match = re.fullmatch(r'bytes=(\d*)-(\d*)',header.strip())
        valid = match and (match[1] or match[2]) and size > 0
        if valid:
            if not match[1]:
                count = int(match[2])
                valid = count > 0
                start,end = max(0,size-count),size-1
            else:
                start = int(match[1])
                end = min(int(match[2]),size-1) if match[2] else size-1
            valid = valid and 0 <= start <= end < size
        if not valid:
            self.send_response(416)
            self.send_header('Content-Range',f'bytes */{size}')
            self.send_header('Content-Length','0')
            self.end_headers()
            return None
        stream = path.open('rb')
        stream.seek(start)
        self._remaining = end-start+1
        self.send_response(206)
        self.send_header('Content-Type',self.guess_type(str(path)))
        self.send_header('Content-Length',str(self._remaining))
        self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        self.send_header('Last-Modified',self.date_time_string(path.stat().st_mtime))
        self.end_headers()
        return stream

    def end_headers(self):
        self.send_header('Accept-Ranges','bytes')
        self.send_header('X-Content-Type-Options','nosniff')
        if not urlsplit(self.path).path.lower().endswith('.mp4'):
            self.send_header('Cache-Control','no-cache')
        super().end_headers()

    def copyfile(self,source,outputfile):
        try:
            if self._remaining is None:
                return super().copyfile(source,outputfile)
            while self._remaining:
                data = source.read(min(65536,self._remaining))
                if not data:
                    break
                outputfile.write(data)
                self._remaining -= len(data)
        except (BrokenPipeError,ConnectionResetError):
            return

    def log_message(self,format,*args):
        if len(args)>1 and str(args[1]).startswith(('4','5')):
            super().log_message(format,*args)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port',type=int,default=52942)
    args = parser.parse_args()
    if not (SITE/'demos'/PROJECT.name/'index.html').is_file():
        raise SystemExit('Run scripts/build.py --site-preview first')
    with ThreadingHTTPServer(('127.0.0.1',args.port),partial(Handler,directory=str(SITE))) as server:
        print(f'Local: http://127.0.0.1:{server.server_port}{PREFIX}/demos/{PROJECT.name}/index.html',flush=True)
        server.serve_forever()

if __name__ == '__main__':
    main()
