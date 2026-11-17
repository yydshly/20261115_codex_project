"""One read-only loopback server for research, original media and live viewers."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from urllib.parse import unquote, urlsplit, parse_qs, quote
import argparse
import json
import mimetypes
import re
from artifacts import PROJECT, ROOT, MODULES, RUNTIME_ROOTS, SCENES, inventory

PREFIX='/demos/0003-ai-wide-area-modeling/'
FILE_PATHS,CATALOG=inventory()
SCENE_MAP={scene['id']:scene for scene in SCENES}
with (PROJECT/'experiments/canal-vggt-consistency/manifest.json').open(encoding='utf-8') as stream:
    DIAGNOSTIC_IMAGES={view['id']:Path(view['path']) for view in json.load(stream)['views']}
DIAGNOSTIC_IMAGES['off']=PROJECT/'assets/canal-imagegen-interior/interior-off.png'


def contained(root,relative):
    path=(root/relative).resolve()
    return path if path.is_relative_to(root.resolve()) and path.is_file() else None


def viewer_html(scene_id,base):
    scene=SCENE_MAP[scene_id]
    html=(PROJECT/'experiments'/scene['viewer']).read_text(encoding='utf-8')
    html=re.sub(r'(?<=["\x27`])/(modules|result|source|assets|out|images|three)/',
                lambda match:base+match.group(1)+'/',html)
    if 'name="viewport"' not in html:
        html=html.replace('<meta charset="utf-8">','<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',1)
    notice='<div class="integrated-notice">只读查看 · '+scene['note']+' 拖动／滚轮只改变观察；网页中的临时状态不写回原文件。</div>'
    style='<style>.integrated-notice{padding:12px 18px;background:#3a3025;color:#f1d5a4;font:13px/1.8 system-ui}body{overflow-x:hidden}header button,#tools button{max-width:100%}#tools{flex-wrap:wrap}#canvas{max-width:calc(100% - 40px)}canvas{touch-action:none;width:100%!important;height:auto!important;max-width:100%}</style>'
    marker='<script type="module">'
    html=html.replace(marker,style+notice+marker,1)
    extra=''
    if scene_id=='hybrid':
        extra="""
function inspectCamera(){controls.enabled=true;controls.target.copy(camera.position).addScaledVector(new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion),state.view==='overview'?16:3);controls.update();}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',inspectCamera));inspectCamera();
"""
    ready="\nparent.postMessage({type:'canal-viewer-ready',scene:"+json.dumps(scene_id)+"},location.origin);\nconst reportIntegratedHeight=()=>parent.postMessage({type:'canal-viewer-height',height:Math.ceil(document.body.getBoundingClientRect().height)},location.origin);new ResizeObserver(reportIntegratedHeight).observe(document.body);reportIntegratedHeight();\n"
    head,separator,tail=html.rpartition('</script>')
    html=head+extra+ready+separator+tail
    return html.encode('utf-8')


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self,path):
        prefix='/20261115_codex_project'
        if path==prefix or path.startswith(prefix+'/'):path=path[len(prefix):] or '/'
        return super().translate_path(path)

    def end_headers(self):
        self.send_header('Cache-Control','no-cache')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Cross-Origin-Opener-Policy','same-origin')
        self.send_header('Cross-Origin-Embedder-Policy','require-corp')
        self.send_header('Cross-Origin-Resource-Policy','same-origin')
        super().end_headers()

    def send_bytes(self,data,mime):
        self.send_response(200);self.send_header('Content-Type',mime)
        self.send_header('Content-Length',str(len(data)));self.end_headers()
        return BytesIO(data)

    def send_file(self,path,download=False,as_text=False):
        if not path or not path.is_file():
            self.send_error(404,'This recorded artifact is not available');return None
        size=path.stat().st_size;start,end=0,max(size-1,0);value=self.headers.get('Range')
        if value:
            match=re.fullmatch(r'bytes=(\d*)-(\d*)',value.strip())
            try:
                if not match or not size or not any(match.groups()):raise ValueError()
                left,right=match.groups()
                if left:start=int(left);end=min(int(right),size-1) if right else size-1
                else:
                    length=int(right)
                    if length<=0:raise ValueError()
                    start=max(0,size-length);end=size-1
                if start>=size or end<start:raise ValueError()
            except ValueError:
                self.send_response(416);self.send_header('Content-Range',f'bytes */{size}')
                self.send_header('Content-Length','0');self.end_headers();return None
        length=(end-start+1) if size else 0
        self.send_response(206 if value else 200)
        mime={'glb':'model/gltf-binary','js':'text/javascript','mp4':'video/mp4','json':'application/json'}.get(path.suffix[1:],mimetypes.guess_type(path.name)[0] or 'application/octet-stream')
        self.send_header('Content-Type','text/plain; charset=utf-8' if as_text else mime)
        self.send_header('Content-Length',str(length));self.send_header('Accept-Ranges','bytes')
        if value:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        if download or path.suffix=='.blend':self.send_header('Content-Disposition',"attachment; filename*=UTF-8''"+quote(path.name))
        self.end_headers();stream=path.open('rb');stream.seek(start);self.remaining=length
        return stream

    def send_head(self):
        self.remaining=None;parsed=urlsplit(self.path);path=unquote(parsed.path)
        canonical=path.removeprefix('/20261115_codex_project')
        if canonical.startswith(PREFIX):
            relative=canonical[len(PREFIX):]
            if relative=='local-api/catalog':return self.send_bytes(json.dumps(CATALOG,ensure_ascii=False).encode(),'application/json; charset=utf-8')
            if relative.startswith('local-api/files/'):
                query=parse_qs(parsed.query)
                return self.send_file(FILE_PATHS.get(relative[len('local-api/files/'):]),'download' in query,query.get('as')==['text'])
            if relative.startswith('engine/'):return self.send_file(contained(MODULES,relative[len('engine/'):]))
            if relative.startswith('live/'):
                parts=relative.split('/',2);scene_id=parts[1]
                if scene_id not in SCENE_MAP:self.send_error(404);return None
                route=parts[2] if len(parts)>2 else '';base=parsed.path.split('/live/')[0]+'/live/'+scene_id+'/'
                if not route or route=='index.html':return self.send_bytes(viewer_html(scene_id,base),'text/html; charset=utf-8')
                mount,_,leaf=route.partition('/');group=SCENE_MAP[scene_id]['group']
                roots={'modules':MODULES,'result':RUNTIME_ROOTS[group],'source':RUNTIME_ROOTS['canal-single-sharp'],
                       'assets':PROJECT/'assets'/group,'out':RUNTIME_ROOTS[group],'three':MODULES/'three'}
                if mount=='images':return self.send_file(DIAGNOSTIC_IMAGES.get(leaf))
                if mount in roots:return self.send_file(contained(roots[mount],leaf))
                self.send_error(404);return None
        return super().send_head()

    def copyfile(self,source,output):
        try:
            if self.remaining is None:return super().copyfile(source,output)
            remaining=self.remaining
            while remaining:
                chunk=source.read(min(1024*1024,remaining))
                if not chunk:break
                output.write(chunk);remaining-=len(chunk)
        except (BrokenPipeError,ConnectionResetError,ConnectionAbortedError):pass

    def log_message(self,format,*args):pass


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=52933);args=parser.parse_args()
    site=ROOT/'_site'
    if not (site/'demos/0003-ai-wide-area-modeling/index.html').is_file():raise SystemExit('Run python scripts/build_site.py --local-preview-only first.')
    server=ThreadingHTTPServer(('127.0.0.1',args.port),partial(Handler,directory=str(site)))
    print(f'http://127.0.0.1:{args.port}{PREFIX}effects.html',flush=True);server.serve_forever()


if __name__=='__main__':main()
