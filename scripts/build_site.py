"""Build explicitly selected web projects into a single GitHub Pages artifact."""
from pathlib import Path, PurePosixPath
from html import escape
from zipfile import ZipFile
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SLUG = '0001-animation-skills-atlas'
PROJECT = ROOT / 'projects' / SLUG
PUBLIC = PROJECT / 'web/public'
SOURCE_GUIDE = '0009-ai-source-field-guide'
EVERYDAY_WONDERS = '0011-everyday-wonders'
CANAL_RESEARCH = '0003-ai-wide-area-modeling'
AVATAR_WORKFLOW = '0021-avatar-video-workflow'
WIND_GARDEN = '0005-wind-return-garden'
STATIC_PROJECTS = {WIND_GARDEN: 'index.html', SOURCE_GUIDE: 'index.html', EVERYDAY_WONDERS: 'map.html', AVATAR_WORKFLOW: 'index.html', CANAL_RESEARCH: 'index.html'}


def build_static_projects(output):
    """Include only the static projects explicitly authorized for publication."""
    for slug, entry in STATIC_PROJECTS.items():
        project = ROOT / 'projects' / slug
        command = [sys.executable, str(project / 'scripts/build.py')]
        if slug == CANAL_RESEARCH:
            command.append('--publication')
            if os.environ.get('CANAL_RESEARCH_MEDIA_ARCHIVE'):
                command += ['--media-archive', os.environ['CANAL_RESEARCH_MEDIA_ARCHIVE']]
        if slug == EVERYDAY_WONDERS:
            command.append('--dist')
        if slug == AVATAR_WORKFLOW:
            command.append('--public')
        subprocess.run(command, check=True)
        if slug == AVATAR_WORKFLOW:
            subprocess.run([sys.executable, str(project / 'scripts/check_publication.py')], check=True)
        if slug == WIND_GARDEN:
            subprocess.run([sys.executable, str(project / 'scripts/check_publication.py')], check=True)
        source = project / 'dist'
        if not (source / entry).is_file():
            raise ValueError('Static project entry is missing: ' + slug)
        target = output / 'demos' / slug
        target.mkdir(parents=True, exist_ok=True)
        shutil.copytree(source, target, dirs_exist_ok=True)

def hydrate(archive_path=None):
    record = json.loads((PROJECT / 'publication-media.json').read_text(encoding='utf-8'))
    archive = Path(archive_path) if archive_path else ROOT / '.local/publication-media/animation-atlas-media-20261115.zip'
    if not archive.exists():
        archive.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(record['url'], timeout=90) as response:
            data = response.read(60_000_001)
        if len(data) > 60_000_000:
            raise ValueError('Published media exceeds 60 MB budget')
        archive.write_bytes(data)
    if hashlib.sha256(archive.read_bytes()).hexdigest() != record['sha256']:
        raise ValueError('Published media checksum mismatch')
    expected = {item['path']: item['sha256'] for item in record['files']}
    with ZipFile(archive) as bundle:
        if set(bundle.namelist()) != set(expected):
            raise ValueError('Published archive file list differs from manifest')
        for name in bundle.namelist():
            relative = PurePosixPath(name)
            target = PUBLIC / name
            if relative.is_absolute() or '..' in relative.parts or '\\' in name or not target.resolve().is_relative_to(PUBLIC.resolve()):
                raise ValueError('Unsafe archive member')
            data = bundle.read(name)
            if hashlib.sha256(data).hexdigest() != expected[name]:
                raise ValueError('Published file checksum mismatch: ' + name)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
    (PUBLIC / 'summary').mkdir(parents=True, exist_ok=True)
    shutil.copy2(PROJECT / 'assets/technology-understanding.png', PUBLIC / 'summary/technology-understanding.png')
    return len(expected)

def navigation():
    registry = json.loads((ROOT / 'projects.json').read_text(encoding='utf-8'))
    cards = []
    for project in sorted(registry['projects'], key=lambda p: p['order']):
        slug = project['id'] + '-' + project['slug']
        if slug == SLUG:
            href = f'./demos/{SLUG}/summary.html'
            picture = f'./demos/{SLUG}/summary/technology-understanding.png'
        elif slug in STATIC_PROJECTS:
            href = f'./demos/{slug}/{STATIC_PROJECTS[slug]}'
            preview_path = (project.get('preview') or {}).get('path', '')
            prefix = f'projects/{slug}/'
            picture = f'./demos/{slug}/assets/relation-map.png' if slug == SOURCE_GUIDE else None
            if preview_path.startswith(prefix):
                picture = f'./demos/{slug}/' + preview_path[len(prefix):]
        else:
            href = project.get('demo_url')
            picture = None
        if not href:
            continue
        preview = project.get('preview') or {}
        alt = preview.get('alt', project['name'] + '引导图')
        caption = preview.get('caption', '')
        full_picture = preview.get('full_path', '')
        prefix = f'projects/{slug}/'
        guide_href = f'./demos/{slug}/' + full_picture[len(prefix):] if full_picture.startswith(prefix) else href
        guide = (f'<figure><a href="{escape(guide_href)}"><img src="{escape(picture)}" alt="{escape(alt)}" loading="lazy"></a><figcaption>{escape(caption)}</figcaption></figure>' if picture else '')
        cards.append(f'<article><span>{escape(project["id"])} / 研究与实践</span><h2><a href="{escape(href)}">{escape(project["name"])}</a></h2><p>{escape(project["summary"])}</p>' + ''.join(f'<p>{escape(item)}</p>' for item in project.get('highlights', [])) + f'<a class="action" href="{escape(href)}">进入完整网页 ↗</a><a href="https://github.com/yydshly/20261115_codex_project/tree/main/projects/{escape(slug)}">研究与源码 ↗</a>' + guide + '</article>')
    return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GitHub 项目研究索引</title><style>body{margin:0;background:#101b23;color:#e5eadd;font:16px/1.9 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1100px;margin:auto;padding:45px 25px}a{color:#c8e49b}h1{font-size:38px;line-height:1.5}h2{font-size:28px}article{padding:30px;margin:35px 0;background:#192a31;border:1px solid #3f5749;border-radius:9px}article>span{font-size:12px;color:#91ac92}p{color:#a5b9a6}figure{margin:24px 0 0}figcaption{font-size:12px;color:#91ac92;margin-top:10px}img{width:100%;height:auto;display:block;margin-top:28px}.action{display:inline-block;padding:9px 15px;border:1px solid #7c9760;border-radius:4px;margin:15px 22px 10px 0}footer{font-size:12px;color:#819a86}</style></head><body><main><p>RESEARCH / EXAMPLES / DECISIONS</p><h1>GitHub 项目研究索引</h1><p>按编号整理内容、实践结果和选择依据。先读摘要，再进入效果、案例和可核查的研究记录。</p>' + ''.join(cards) + '<footer>原始项目、素材与研究结论分别署名。<a href="https://github.com/yydshly/20261115_codex_project">查看 GitHub 仓库 ↗</a></footer></main></body></html>'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--media-archive')
    args = parser.parse_args()
    count = hydrate(args.media_archive or os.environ.get('ANIMATION_MEDIA_ARCHIVE'))
    subprocess.run([shutil.which('npm') or 'npm', 'run', 'build'], cwd=PROJECT / 'web', check=True)
    output = ROOT / '_site'
    target = output / 'demos' / SLUG
    target.mkdir(parents=True, exist_ok=True)
    shutil.copytree(PROJECT / 'web/dist', target, dirs_exist_ok=True)
    build_static_projects(output)
    (output / 'index.html').write_text(navigation(), encoding='utf-8')
    (output / '.nojekyll').write_text('', encoding='utf-8')
    print(json.dumps({'output': str(output), 'media_files': count, 'project': SLUG}))

if __name__ == '__main__':
    main()
