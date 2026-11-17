"""Audit the static public artifact without local media maps or machine profiles."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import hashlib,json,zipfile

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
class Doc(HTMLParser):
    def __init__(self,text):super().__init__();self.ids=[];self.links=[];self.videos=[];self.feed(text)
    def handle_starttag(self,tag,attrs):
        data=dict(attrs)
        if data.get('id'):self.ids.append(data['id'])
        for key in ('src','href','poster','data-lightbox'):
            if data.get(key):self.links.append(data[key])
        if tag=='source':self.videos.append(data.get('src'))

def main():
    docs={};links=set();media=set()
    for page in ('index','effects','methods','value','template','sources'):
        text=(DIST/(page+'.html')).read_text(encoding='utf-8');doc=Doc(text);docs[page+'.html']=doc
        assert len(doc.ids)==len(set(doc.ids))
        assert '本机视频尚未连接' not in text and '本地研究 · 未公开发布' not in text
        links.update(doc.links);media.update(doc.videos)
    assert media=={f'media/{x}.mp4' for x in ('matting','scene','complete','template')}
    checked=[]
    for href in sorted(links):
        parts=urlsplit(href)
        if parts.scheme or parts.netloc:continue
        if not parts.path:continue
        assert not parts.path.startswith('/'),href
        path=(DIST/unquote(parts.path)).resolve();assert path.is_relative_to(DIST.resolve()),href
        assert path.is_file(),href
        if parts.fragment and parts.path in docs:assert parts.fragment in docs[parts.path].ids,href
        checked.append(href)
    png=DIST/'assets/avatar-research-overview-v1.png'
    expected=next(x['sha256'] for x in json.loads((ROOT/'assets/overview-manifest.json').read_text(encoding='utf-8'))['files'] if x['file']==png.name)
    assert hashlib.sha256(png.read_bytes()).hexdigest()==expected
    overview=json.loads((ROOT/'assets/overview-manifest.json').read_text(encoding='utf-8'))
    for item in overview['source_files']:
        assert hashlib.sha256((ROOT/item['file']).read_bytes()).hexdigest()==item['sha256'],item['file']
    template=json.loads((ROOT/'template-manifest.json').read_text(encoding='utf-8'))
    with zipfile.ZipFile(DIST/'downloads/avatar-motion-template-v1.zip') as bundle:
        assert not any(x.endswith(('.mp4','.onnx','.pyc')) or 'local-runtime.json' in x for x in bundle.namelist())
        assert bundle.testzip() is None
        for item in template['files']:
            member='avatar-motion-template/'+item['path']
            assert hashlib.sha256(bundle.read(member)).hexdigest()==item['sha256'],member
    report={'date':'2026-11-17','mode':'publication artifact','six_pages':'passed','checked_relative_links':len(checked),
        'media_sources':sorted(media),'original_full_video_and_comparison_not_embedded':True,
        'guide_sha256':expected,'guide_is_exact_generated_png':True,'source_text_hashes':'passed',
        'template_crc_and_privacy':'passed','template_file_hashes':'passed',
        'localhost_media_server_required':False,'live_deployment':'recorded separately in live-verification.json'}
    (ROOT/'publication-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report))
if __name__=='__main__':main()
