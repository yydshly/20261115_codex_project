"""Check the real exported pages, media files and HTTP range responses."""
from pathlib import Path
from html.parser import HTMLParser
from html import escape
from urllib.parse import urljoin, urlsplit, unquote
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from datetime import datetime, timezone, timedelta
import argparse
import hashlib
import json
import struct
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT.parents[1] / '_site'

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids=[]
        self.links=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if attrs.get('id'):
            self.ids.append(attrs['id'])
        for key in ('src','href','poster','data-lightbox'):
            if attrs.get(key):
                self.links.append(attrs[key])

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url',default='http://127.0.0.1:52942/20261115_codex_project/demos/'+ROOT.name+'/')
    args=parser.parse_args()
    base=args.base_url.rstrip('/')+'/'
    dest=SITE/'demos'/ROOT.name
    parsed={}
    for name in ('index.html','analysis.html','archive.html'):
        page=Links()
        text=(dest/name).read_text(encoding='utf-8')
        page.feed(text)
        assert len(page.ids)==len(set(page.ids)), 'Duplicate HTML ID: '+name
        assert '@@' not in text
        parsed[name]=page
    checked=set()
    for name,page in parsed.items():
        for href in page.links:
            split=urlsplit(href)
            if split.scheme or split.netloc:
                continue
            target=(dest/unquote(split.path)).resolve() if split.path else dest/name
            assert target.is_file(), 'Missing local link: '+name+' -> '+href
            if split.fragment and target.name in parsed:
                assert unquote(split.fragment) in parsed[target.name].ids, 'Missing anchor: '+href
            if target.suffix=='.mp4':
                continue
            url=urljoin(base+name,href)
            if url in checked:
                continue
            with urlopen(url,timeout=10) as response:
                assert response.status==200, url
                assert response.read(), url
            checked.add(url)
    media=json.loads((ROOT/'assets/media-manifest.json').read_text(encoding='utf-8'))
    range_checks=[]
    for item in media['videos']:
        relative='assets/'+item['file']
        disk=dest/relative
        assert hashlib.sha256(disk.read_bytes()).hexdigest()==item['sha256']
        size=disk.stat().st_size
        url=base+relative
        with urlopen(Request(url,headers={'Range':'bytes=0-1023'}),timeout=10) as response:
            assert response.status==206
            assert response.headers['Content-Range']==f'bytes 0-1023/{size}'
            assert response.headers.get_content_type()=='video/mp4'
            assert response.read()==disk.read_bytes()[:1024]
        with urlopen(Request(url,headers={'Range':'bytes=-32'}),timeout=10) as response:
            assert response.status==206 and response.read()==disk.read_bytes()[-32:]
        with urlopen(Request(url,method='HEAD',headers={'Range':'bytes=0-99'}),timeout=10) as response:
            assert response.status==206 and response.headers['Content-Length']=='100' and not response.read()
        try:
            urlopen(Request(url,headers={'Range':f'bytes={size}-'}),timeout=10)
            raise AssertionError('Expected HTTP 416')
        except HTTPError as error:
            assert error.code==416 and error.headers['Content-Range']==f'bytes */{size}'
        range_checks.append({'id':item['id'],'hash_match':True,'first_range':True,'suffix_range':True,'head_range':True,'invalid_range_416':True,'decode_ok':item['decode_ok']})
    research=json.loads((ROOT/'research.json').read_text(encoding='utf-8'))
    production=json.loads((ROOT/'production.json').read_text(encoding='utf-8'))
    analysis=json.loads((ROOT/'analysis.json').read_text(encoding='utf-8'))
    analysis_page=(dest/'analysis.html').read_text(encoding='utf-8')
    assert len(analysis['dialogue'])==9, 'Missing discussion records'
    for discussion in analysis['dialogue']:
        for field in ('quote','analysis','consequence'):
            assert escape(discussion[field],quote=True) in analysis_page, 'Missing discussion content: '+discussion['id']
    assert analysis['reference']['url'] in analysis_page
    for field in ('reference_reading','understanding','value','creative_translation','spring_layers','trial_comparison'):
        assert len(analysis[field])>0
        for entry in analysis[field]:
            for key,value in entry.items():
                if key!='id':
                    assert escape(value,quote=True) in analysis_page, 'Missing analysis content: '+field+'/'+key
    home=(dest/'index.html').read_text(encoding='utf-8')
    sections=['reference-analysis','understanding','principle','journey','creative-path','watch','review']
    positions=[home.index('id="'+name+'"') for name in sections]
    assert positions==sorted(positions), 'The reference and reasoning must precede the trial films'
    source_record=media['source_reference']
    assert hashlib.sha256((dest/'assets'/source_record['file']).read_bytes()).hexdigest()==source_record['sha256']
    assert (dest/'ANALYSIS.md').read_text(encoding='utf-8')==(ROOT/'ANALYSIS.md').read_text(encoding='utf-8')
    map_record=json.loads((ROOT/'assets/understanding-map-manifest.json').read_text(encoding='utf-8'))
    for entry in map_record['source_files']:
        assert hashlib.sha256((ROOT/entry['file']).read_bytes()).hexdigest()==entry['sha256'], 'Understanding map source changed'
    for entry in map_record['files']:
        assert hashlib.sha256((dest/'assets'/entry['file']).read_bytes()).hexdigest()==entry['sha256'], 'Understanding map export changed'
    png=(dest/'assets/understanding-map-v1.png').read_bytes()
    assert png[:8]==b'\x89PNG\r\n\x1a\n'
    assert struct.unpack('>II',png[16:24])==(map_record['width'],map_record['height'])
    svg=ET.fromstring((dest/'assets/understanding-map-v1.svg').read_text(encoding='utf-8'))
    normalize=lambda text: ''.join(text.split())
    rendered=normalize(''.join(node.text or '' for node in svg.iter() if node.tag.endswith('}text')))
    map_data=json.loads((ROOT/'understanding-map.json').read_text(encoding='utf-8'))
    for field in ('title','subtitle','core_quote','core','continuity','reference_note','principle','principle_text','spring_title','spring_intro','takeaway','source_url','boundaries'):
        assert normalize(map_data[field]) in rendered, 'Missing map content: '+field
    for field in ('roles','origin','values','steps','spring_layers','extensions'):
        for entry in map_data[field]:
            for value in entry.values():
                assert normalize(value) in rendered, 'Missing map content: '+field
    assert len(map_data['values'])==4 and len(map_data['steps'])==5 and len(map_data['spring_layers'])==4
    assert sum(x['credits'] for x in production['shots'])==975
    assert len({x['task_id'] for x in production['shots']})==6
    assert [sum(v['durations']) for v in research['versions']]==[60,30]
    registry=json.loads((ROOT.parents[1]/'projects.json').read_text(encoding='utf-8'))
    item=next(x for x in registry['projects'] if x['id']=='0020')
    assert item['demo_url'] is None
    with urlopen(base.split('/demos/')[0]+'/index.html',timeout=10) as response:
        assert ROOT.name in response.read().decode('utf-8'), 'Missing local navigation'
    record=json.loads((ROOT/'verification.json').read_text(encoding='utf-8'))
    record.update(status='automated_checks_passed_layout_review_pending',
                  checked_at=datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds'),
                  local_url=base+'index.html',local_resource_checks=len(checked),
                  video_checks=range_checks,index_registered=True,total_credits=975,
                  additional_generation_credits=0,published=False)
    record['content_revision']={'date':analysis['updated'],'scope':'原参考、九次关键讨论、理解与价值、写风到写春的推导置于试片之前',
                                'pages_checked':list(parsed),'dialogue_records':len(analysis['dialogue']),
                                'source_screenshot_hash_match':True,'reference_before_trial':True,
                                'complete_analysis_content_present':True,'browser_layout_recheck':'pending; browser control became unavailable during this turn'}
    record['understanding_map']={'dimensions':[map_record['width'],map_record['height']],
                                 'value_points':4,'creative_steps':5,'spring_layers':4,
                                 'export_hashes_match':True,'complete_copy_in_svg':True,
                                 'visual_review':map_record['visual_review'],'new_generation_credits':0}
    (ROOT/'verification.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'local_resources':len(checked),'videos':len(range_checks),'checks':'hashes, complete decode record, byte ranges, seek support, links, anchors, budget, local navigation','published':False},ensure_ascii=False))

if __name__=='__main__':
    main()
