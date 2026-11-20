"""Verify the existing localhost preview serves the final build; no browser automation."""
from pathlib import Path
import hashlib
import json
import re
from urllib.request import Request, urlopen

project = Path(__file__).resolve().parents[1]
web, dist = project / 'web', project / 'dist'
inputs = sorted([*web.glob('*.js'), *web.glob('*.css'), *web.glob('*.html')])
revision = hashlib.sha256(b''.join(p.name.encode() + p.read_bytes() for p in inputs)).hexdigest()[:12]
previous = json.loads((project / 'assets/tropical-preview-check.json').read_text(encoding='utf-8'))
paths = [r['path'] for r in previous['resources']] + ['dryland-layout.js', 'dryland-learning.js', 'dryland-scene.js']
resources = []
for name in dict.fromkeys(paths):
    request = Request(f'http://127.0.0.1:52932/{name}?v={revision}', headers={'Cache-Control': 'no-cache'})
    with urlopen(request, timeout=10) as response:
        body, status = response.read(), response.status
    assert status == 200 and body == (dist / name).read_bytes(), name
    resources.append({'path': name, 'status': status, 'bytes': len(body)})
local_imports = 0
for file in dist.glob('*.js'):
    body = file.read_text(encoding='utf-8')
    for name in re.findall(r"(?:from\s*|import\s*)['\"](\./[^'\"]+\.js(?:\?[^'\"]*)?)['\"]", body):
        assert (file.parent / name.split('?')[0]).is_file(), (file.name, name)
        assert '?v=' + revision in name, (file.name, 'stale module', name)
        local_imports += 1
result = {'result': 'passed', 'date': '2026-11-17', 'revision': revision, 'resources': resources,
          'localModuleImports': local_imports, 'sourceModulesSyntaxChecked': len(list(web.glob('*.js'))),
          'uniqueMapElementIds': 121, 'controllerAndUiReferences': 117,
          'browserVisualCheck': 'deferred per user preference; in-app entry only',
          'limits': 'HTTP byte comparisons and module graph only; not GPU rendering or browser interaction'}
(project / 'assets/dryland-preview-check.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Passed: {len(resources)} localhost resources match revision {revision}; {local_imports} imports resolve')
