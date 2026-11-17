"""Inspect public HTML for real work/example images, then save attributed overrides.

Does not edit catalog.json or previews.json. All candidate links originate in the
article's public official pages. This file is a bounded local research helper.
"""
from __future__ import annotations
import concurrent.futures
import hashlib
import html
from html.parser import HTMLParser
import io
import json
from pathlib import Path
import sys
from urllib.parse import urljoin, urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent))
from collect_previews import get, normalize_image, NOTICE, now

ROOT=Path(__file__).resolve().parents[1]
PROXY='http://127.0.0.1:12348'
IDS=[55,57,59,63,66,71,72,74,79,80,81,82,83,84,85,86,88,89,90,91,92,93,94,95,96,97,98]

class Inspector(HTMLParser):
    def __init__(self,base):
        super().__init__(convert_charrefs=True)
        self.base=base;self.images=[];self.links=[];self.anchor=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='a' and a.get('href'):
            self.anchor=urljoin(self.base,a['href'])
            self.links.append({'href':self.anchor,'title':a.get('aria-label') or a.get('title','')})
        if tag in ('img','video','source'):
            u=a.get('poster') or a.get('data-src') or a.get('data-lazy-src') or a.get('src')
            if a.get('srcset') and not u:
                u=a['srcset'].split(',')[0].strip().split()[0]
            if u and not u.startswith('data:'):
                self.images.append({'url':urljoin(self.base,html.unescape(u)),'alt':a.get('alt',''),'tag':tag,'target':self.anchor,'width':a.get('width'),'height':a.get('height')})
    def handle_endtag(self,tag):
        if tag=='a':self.anchor=None

def inspect(site):
    out={'id':site['id'],'name':site['name'],'page_url':site['url']}
    try:
        raw,mime,status,actual=get(site['url'],PROXY,limit=6_000_000,timeout=25)
        parser=Inspector(actual);parser.feed(raw.decode('utf-8',errors='replace'))
        out.update(status=status,resolved_url=actual,images=parser.images,links=parser.links)
    except Exception as e:out['error']=str(e)
    return out

def research():
    catalog=json.loads((ROOT/'web/data/catalog.json').read_text(encoding='utf-8'))
    sites=[s for s in catalog['sites'] if s['id'] in IDS]
    out={}
    with concurrent.futures.ThreadPoolExecutor(max_workers=9) as pool:
        for rec in pool.map(inspect,sites):
            out[str(rec['id'])]=rec
            print(f"{rec['id']} {rec['name']}: {len(rec.get('images',[]))} images, {rec.get('error','')}",flush=True)
    (ROOT/'assets/example-research.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def download():
    path=ROOT/'assets/example-overrides.json'
    records=json.loads(path.read_text(encoding='utf-8'))
    def one(pair):
        key,row=pair
        if row.get('status') in ('ok','rejected'):return key,row
        try:
            raw,mime,status,resolved=get(row['image_url'],PROXY,limit=9_000_000,timeout=35)
            processed,size=normalize_image(raw)
            dest=ROOT/f'assets/previews/example-{int(key):03d}.jpg'
            dest.write_bytes(processed)
            row.update(id=int(key),status='ok',src=f'../assets/previews/{dest.name}',image_source=row['image_url'],image_resolved_url=resolved,image_mime=mime,image_http_status=status,width=size[0],height=size[1],sha256=hashlib.sha256(processed).hexdigest(),fetched_at=now(),license_note=NOTICE)
            print(f'{key}: OK {size}',flush=True)
        except Exception as e:
            row.update(status='unavailable',error=str(e));print(f'{key}: {e}',flush=True)
        return key,row
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for key,row in pool.map(one,list(records.items())):
            records[key]=row
            path.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':
    research() if '--research' in sys.argv else download()
