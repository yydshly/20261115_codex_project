"""Serve the local research library and whitelisted existing media with byte ranges."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlsplit,unquote
import argparse,json,mimetypes,re

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT.parents[1]/'_site'
PREFIX='/20261115_codex_project'
PROJECT_PATH=PREFIX+'/demos/'+ROOT.name+'/'

class Handler(SimpleHTTPRequestHandler):
    media_map={}
    def translate_path(self,path):
        clean=urlsplit(path).path
        if clean==PREFIX:clean='/'
        elif clean.startswith(PREFIX+'/'):clean=clean[len(PREFIX):]
        return super().translate_path(clean)

    def serve_media(self,head=False):
        path=unquote(urlsplit(self.path).path)
        prefix=PROJECT_PATH+'media/'
        if not path.startswith(prefix):return False
        alias=path[len(prefix):]
        source=self.media_map.get(alias)
        if not source:
            self.send_error(404,'Unknown media alias');return True
        source=Path(source)
        if not source.is_file():
            self.send_error(503,'Local media unavailable; run prepare_media.py');return True
        total=source.stat().st_size;start=0;end=total-1;status=200
        requested=self.headers.get('Range')
        if requested:
            match=re.fullmatch(r'bytes=(\d*)-(\d*)',requested.strip())
            if not match or not any(match.groups()):return self.range_error(total)
            left,right=match.groups()
            if left:start=int(left);end=min(total-1,int(right)) if right else total-1
            else:
                count=int(right)
                if count<=0:return self.range_error(total)
                start=max(0,total-count)
            if start>=total or end<start:return self.range_error(total)
            status=206
        self.send_response(status)
        self.send_header('Content-Type',mimetypes.guess_type(source.name)[0] or 'application/octet-stream')
        self.send_header('Accept-Ranges','bytes');self.send_header('Content-Length',str(end-start+1))
        self.send_header('Cache-Control','private, max-age=3600')
        if status==206:self.send_header('Content-Range',f'bytes {start}-{end}/{total}')
        self.end_headers()
        if not head:
            try:
                with source.open('rb') as f:
                    f.seek(start);remaining=end-start+1
                    while remaining:
                        data=f.read(min(65536,remaining))
                        if not data:break
                        self.wfile.write(data);remaining-=len(data)
            except (BrokenPipeError,ConnectionResetError):pass
        return True

    def range_error(self,total):
        self.send_response(416);self.send_header('Content-Range',f'bytes */{total}');self.send_header('Content-Length','0');self.end_headers();return True
    def do_GET(self):
        if self.path=='/':
            self.send_response(302);self.send_header('Location',PROJECT_PATH+'index.html');self.end_headers();return
        if not self.serve_media():super().do_GET()
    def do_HEAD(self):
        if not self.serve_media(True):super().do_HEAD()
    def log_message(self,format,*args):
        if len(args)>1 and str(args[1]).startswith(('4','5')):super().log_message(format,*args)

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--port',type=int,default=52961);args=p.parse_args()
    if not (SITE/'demos'/ROOT.name/'index.html').is_file():raise SystemExit('Run build.py --site-preview first')
    media=ROOT/'.local'/'media-map.json'
    if media.is_file():Handler.media_map=json.loads(media.read_text(encoding='utf-8'))
    with ThreadingHTTPServer(('127.0.0.1',args.port),partial(Handler,directory=str(SITE))) as server:
        print(f'Local: http://127.0.0.1:{server.server_port}{PROJECT_PATH}index.html',flush=True)
        server.serve_forever()

if __name__=='__main__':main()
