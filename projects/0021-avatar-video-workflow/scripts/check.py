"""Check local pages, internal links, downloadable source and media range behavior."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin,urlsplit,unquote
from urllib.request import Request,urlopen
from urllib.error import HTTPError
import argparse,hashlib,io,json,zipfile

ROOT=Path(__file__).resolve().parents[1]
PAGES=('index','effects','methods','value','template','sources')
class Document(HTMLParser):
    def __init__(self,html):
        super().__init__();self.links=[];self.ids=[];self.h1=0;self.feed(html)
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='h1':self.h1+=1
        if 'id' in attrs:self.ids.append(attrs['id'])
        for key in ('href','src','poster'):
            if attrs.get(key):self.links.append(attrs[key])

def request(url,method='GET',headers=None):
    with urlopen(Request(url,method=method,headers=headers or {}),timeout=15) as response:
        return response.status,dict(response.headers),response.read()

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--base',default='http://127.0.0.1:52961/20261115_codex_project/demos/0021-avatar-video-workflow/');args=parser.parse_args()
    base=args.base.rstrip('/')+'/';docs={};links=set();checked=[]
    for page in PAGES:
        status,headers,data=request(base+page+'.html');assert status==200
        text=data.decode('utf-8');doc=Document(text)
        assert doc.h1==1,(page,'heading count')
        assert len(doc.ids)==len(set(doc.ids)),(page,'duplicate ids')
        assert 'charset="utf-8"' in text
        docs[page+'.html']=doc
        for link in doc.links:
            full=urljoin(base+page+'.html',link)
            if full.startswith(base):links.add(full)
    for link in sorted(links):
        parts=urlsplit(link);path=unquote(parts.path[len(urlsplit(base).path):])
        if path.startswith('media/'):continue
        status,_,_=request(link,'HEAD');assert status==200,link
        if parts.fragment and path in docs:assert parts.fragment in docs[path].ids,(link,'missing anchor')
        checked.append(link[len(base):])
    videos=json.loads((ROOT/'media.json').read_text(encoding='utf-8'))['videos']
    mapping=json.loads((ROOT/'.local/media-map.json').read_text(encoding='utf-8'))
    media=[]
    for entry in videos:
        url=base+'media/'+entry['alias'];source=Path(mapping[entry['alias']]);content=source.read_bytes()
        assert hashlib.sha256(content).hexdigest()==entry['sha256']
        status,headers,_=request(url,'HEAD');assert status==200 and int(headers['Content-Length'])==len(content)
        status,headers,part=request(url,headers={'Range':'bytes=0-31'})
        assert status==206 and part==content[:32] and headers['Content-Range']==f'bytes 0-31/{len(content)}'
        status,headers,part=request(url,headers={'Range':'bytes=-16'});assert status==206 and part==content[-16:]
        try:request(url,headers={'Range':f'bytes={len(content)}-'})
        except HTTPError as error:assert error.code==416
        else:raise AssertionError('Unsatisfiable range accepted')
        media.append({'alias':entry['alias'],'sha256_verified':True,'head':200,'range':206,'suffix':206,'invalid_range':416})
    try:request(base+'media/not-allowed.mp4')
    except HTTPError as error:assert error.code==404
    else:raise AssertionError('Unknown media alias accepted')
    _,_,data=request(base+'downloads/avatar-motion-template-v1.zip')
    with zipfile.ZipFile(io.BytesIO(data)) as bundle:
        names=bundle.namelist()
        assert any(x.endswith('/SKILL.md') for x in names)
        assert not any('local-runtime.json' in x or x.endswith(('.mp4','.onnx','.pyc')) or '..' in Path(x).parts for x in names)
        assert bundle.testzip() is None
    research=json.loads((ROOT/'research.json').read_text(encoding='utf-8'))
    record={'date':'2026-11-17','mode':'local-only','published':False,'http_pages':6,'internal_assets_and_links':len(checked),
        'page_structure':'one H1 and unique IDs on all pages','internal_fragments':'passed','media':media,
        'template_archive':{'files':len(names),'crc':'passed','machine_profile_and_models_excluded':True},
        'content':{key:len(research[key]) for key in ('questions','effects','providers','workflow','values','evidence','sources')},
        'browser_checks':'Recorded after actual browser QA; see browser-verification.json',
        'limits':['Local website does not run the video pipeline in the browser.','No public deployment.','No new upstream model invocation or cross-person test.']}
    (ROOT/'verification.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(record,ensure_ascii=False))

if __name__=='__main__':main()
