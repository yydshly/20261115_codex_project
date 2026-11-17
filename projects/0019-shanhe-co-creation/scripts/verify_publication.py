"""Verify only this project's authorized public Pages export and existing entries."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
from urllib.request import Request, urlopen
import argparse
import hashlib
import json
import re
from check import Page

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://yydshly.github.io/20261115_codex_project/'
BASE = SITE + 'demos/0019-shanhe-co-creation/'
PAGES = ('index','exploration','world','story','systems','future','sources')


def fetch(url):
    assert url.startswith(SITE), 'Verification is limited to the authorized site'
    request = Request(url, headers={'User-Agent':'ShanheResearchValidation/1.0','Cache-Control':'no-cache'})
    with urlopen(request, timeout=45) as response:
        assert response.status == 200
        assert response.url.startswith(SITE)
        return response.read()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--commit', required=True)
    parser.add_argument('--output', type=Path, default=ROOT/'online-verification.json')
    args = parser.parse_args()
    assert re.fullmatch('[0-9a-f]{40}',args.commit)
    assert args.output.resolve().is_relative_to(ROOT.parents[1].resolve()), 'Output must stay in the workspace'
    page_urls = [BASE+name+'.html' for name in PAGES]
    with ThreadPoolExecutor(max_workers=6) as pool:
        bodies = dict(zip(page_urls,pool.map(fetch,page_urls)))
    parsed, needed = {}, {SITE}
    for url, body in bodies.items():
        page = Page()
        page.feed(body.decode('utf-8'))
        parsed[url] = page
        for raw in page.links:
            target = urlsplit(urljoin(url,raw))
            canonical = target._replace(query='',fragment='').geturl()
            if canonical.startswith(BASE): needed.add(canonical)
    needed -= bodies.keys()
    with ThreadPoolExecutor(max_workers=6) as pool:
        bodies.update(zip(sorted(needed),pool.map(fetch,sorted(needed))))
    for url,page in parsed.items():
        assert page.headings == 1
        for raw in page.links:
            target = urlsplit(urljoin(url,raw))
            canonical = target._replace(query='',fragment='').geturl()
            if target.fragment and canonical in parsed:
                assert unquote(target.fragment) in parsed[canonical].ids
    manifest = json.loads((ROOT/'assets/manifest.json').read_text(encoding='utf-8'))
    images = manifest['files'] + manifest['supplements']
    for item in images:
        assert hashlib.sha256(bodies[BASE+'assets/'+item['file']]).hexdigest() == item['sha256']
    registry = json.loads((ROOT.parents[1]/'projects.json').read_text(encoding='utf-8'))
    own = next(x for x in registry['projects'] if x['id']=='0019')
    navigation = bodies[SITE].decode('utf-8')
    assert escape(own['summary']) in navigation
    assert './demos/0019-shanhe-co-creation/assets/shanhe-understanding-overview-v1.png' in navigation
    for text in own['highlights']: assert escape(text) in navigation
    home = bodies[BASE+'index.html'].decode('utf-8')
    assert 'id="understanding"' in home and '对我们的创作意义' in home
    assert 'https://x.com/thorgram/status/2121601256557051920' in home
    story = json.loads((ROOT/'story.json').read_text(encoding='utf-8'))
    story_page = bodies[BASE+'story.html'].decode('utf-8')
    for section in story['sections']:
        for paragraph in section['paragraphs']:
            assert '<p>'+escape(paragraph,quote=True)+'</p>' in story_page
    existing = [SITE+'demos/'+path for path in (
        '0001-animation-skills-atlas/summary.html','0003-ai-wide-area-modeling/index.html',
        '0005-wind-return-garden/index.html','0009-ai-source-field-guide/index.html',
        '0011-everyday-wonders/map.html','0021-avatar-video-workflow/index.html')]
    with ThreadPoolExecutor(max_workers=6) as pool:
        preserved = list(pool.map(fetch,existing))
    assert all(preserved)
    record = {
        'date':'2026-11-17','checked_at':datetime.now(timezone(timedelta(hours=8))).isoformat(),
        'commit':args.commit,'url':BASE+'index.html','status':'passed',
        'project_pages':7,'resources_http_200':len(bodies)+len(existing),
        'image_hashes_verified':len(images),'guide_sha256':manifest['supplements'][0]['sha256'],
        'complete_story_paragraphs':sum(len(x['paragraphs']) for x in story['sections']),
        'existing_public_entries_preserved':len(existing),'navigation_summary_and_guide_match':True,
        'resources':sorted(bodies)+existing,'game_validation':False
    }
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({key:record[key] for key in ('status','project_pages','resources_http_200','image_hashes_verified','existing_public_entries_preserved')}))
    return record


if __name__ == '__main__':
    main()
