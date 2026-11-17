"""Build both preserved scenes and the research portal for the repository subpath."""
from pathlib import Path
import argparse
import gzip
import hashlib
import json
import mimetypes
import shutil
import subprocess
import sys
from media import restore

PROJECT = Path(__file__).resolve().parents[1]
WEB = PROJECT / 'web'
OUT = PROJECT / 'dist'


def run(*args, cwd=PROJECT):
    subprocess.run(args, cwd=cwd, check=True)


def copy(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)


def compress(root):
    mappings = {}
    unique = {}
    for path in sorted((root / 'assets').rglob('*')):
        if not path.is_file() or path.suffix not in {'.bin', '.glb', '.hdr'}:
            continue
        original = path.read_bytes()
        data = gzip.compress(original, compresslevel=9, mtime=0)
        if len(data) >= len(original) * .95:
            continue
        packed = path.with_suffix(path.suffix + '.gz')
        digest = hashlib.sha256(original).hexdigest()
        if digest in unique:
            packed = unique[digest]
        else:
            packed.write_bytes(data)
            unique[digest] = packed
        assert gzip.decompress(data) == original
        mappings[path.relative_to(root).as_posix()] = {'path': packed.relative_to(root).as_posix(), 'type': mimetypes.guess_type(path.name)[0] or 'application/octet-stream', 'bytes': len(original), 'sha256': hashlib.sha256(original).hexdigest()}
        # Only remove the freshly generated plain copy inside this build output.
        assert path.resolve().is_relative_to(OUT.resolve())
        path.unlink()
    (root / 'compressed-assets.json').write_text(json.dumps(mappings, indent=2) + '\n', encoding='utf-8')
    copy(PROJECT / 'scripts/publication-entry.js', root / 'publication-entry.js')
    index = root / 'index.html'
    text = index.read_text(encoding='utf-8')
    assert 'src="./main.js"' in text
    index.write_text(text.replace('src="./main.js"', 'src="./publication-entry.js"'), encoding='utf-8')
    return len(mappings)


def main():
    global OUT
    parser = argparse.ArgumentParser()
    parser.add_argument('--media-archive')
    parser.add_argument('--output', type=Path, help='Optional isolated build output')
    args = parser.parse_args()
    if args.output:
        OUT = args.output.resolve()
    count = restore(args.media_archive)
    run(sys.executable, str(WEB / 'overview/build-source-catalog.py'))
    run('node', 'build.mjs', cwd=WEB)
    run('node', 'build.mjs', cwd=WEB / 'model-version')
    OUT.mkdir(exist_ok=True)
    shutil.copytree(WEB / 'dist', OUT, dirs_exist_ok=True)
    shutil.copytree(WEB / 'model-version/dist', OUT / 'model-version', dirs_exist_ok=True)
    # Old bare-crown LODs are retained in the verified Release. The running scene
    # uses leafy-tree-*.gltf; avoid publishing a second, unused geometry family.
    retired = OUT / 'model-version/assets/models/trees/jacaranda'
    runtime = (WEB / 'model-version/model-assets.js').read_text(encoding='utf-8')
    for path in retired.glob('tree-*'):
        assert path.resolve().is_relative_to(OUT.resolve())
        assert ('jacaranda/' + path.name) not in runtime
        if path.is_file():
            path.unlink()
    target = OUT / 'overview'
    for name in ('index.html', 'style.css', 'overview.js', 'source-catalog.js', 'reference-summary.js'):
        copy(WEB / 'overview' / name, target / name)
    shutil.copytree(WEB / 'overview/assets', target / 'assets', dirs_exist_ok=True)
    # A freshly deployed portal must not reuse an older cached loading script.
    page = target / 'index.html'
    html = page.read_text(encoding='utf-8')
    for name in ('style.css', 'overview.js', 'source-catalog.js', 'reference-summary.js'):
        version = hashlib.sha256((target / name).read_bytes()).hexdigest()[:12]
        html = html.replace('./' + name + '"', './' + name + '?v=' + version + '"')
    page.write_text(html, encoding='utf-8')
    for name in ('package-lock.json', 'model-version/tools/README.md'):
        copy(WEB / name, OUT / name)
    guide = 'assets/research-overview-20261117/valley-garden-research-overview.png'
    copy(PROJECT / guide, OUT / guide)
    compressed = compress(OUT) + compress(OUT / 'model-version')
    run(sys.executable, str(PROJECT / 'scripts/check_publication.py'), '--site', str(OUT))
    size = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
    print(json.dumps({'project': PROJECT.name, 'assets_restored': count, 'losslessly_compressed': compressed, 'site_bytes': size}))


if __name__ == '__main__':
    main()
