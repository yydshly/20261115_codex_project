"""Publication checks for the guide's relative paths and shared navigation."""
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build_site_for_test', ROOT / 'scripts/build_site.py')
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)
GUIDE = ROOT / 'projects/0009-ai-source-field-guide'


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for key in ('href', 'src', 'data'):
            if key in attrs:
                self.refs.append(attrs[key])


class SourceGuidePublicationTests(unittest.TestCase):
    def test_shared_navigation_keeps_both_published_projects_and_guide_image(self):
        def project(pid, slug, name):
            return {'id': pid, 'slug': slug, 'order': int(pid), 'name': name,
                    'summary': '用途与验证范围', 'demo_url': None,
                    'highlights': ['研究价值'], 'preview': {'alt': name + '简化引导图', 'caption': '原创整理'}}
        registry = {'projects': [project('0001', 'animation-skills-atlas', '动画图谱'),
                                 project('0009', 'ai-source-field-guide', '知源')]}
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'projects.json').write_text(json.dumps(registry), encoding='utf-8')
            with patch.object(site, 'ROOT', root):
                html = site.navigation()
        self.assertIn('./demos/0001-animation-skills-atlas/summary.html', html)
        self.assertIn('./demos/0009-ai-source-field-guide/index.html', html)
        self.assertIn('./demos/0009-ai-source-field-guide/assets/relation-map.png', html)
        self.assertIn('知源简化引导图', html)

    def test_export_is_self_contained_for_github_pages_subpath(self):
        subprocess.run([sys.executable, str(GUIDE / 'scripts/build.py')], check=True, capture_output=True)
        export = GUIDE / 'dist'
        for page in ('index.html', 'map.html'):
            parser = Links()
            parser.feed((export / page).read_text(encoding='utf-8'))
            for ref in parser.refs:
                parts = urlsplit(ref)
                if parts.scheme or not parts.path:
                    continue
                with self.subTest(page=page, ref=ref):
                    self.assertFalse(parts.path.startswith('/'), 'Domain-root paths break repository hosting')
                    target = (export / parts.path).resolve()
                    self.assertTrue(target.is_relative_to(export.resolve()), 'Export must not depend on source directories')
                    self.assertTrue(target.is_file(), 'Published resource is missing')


if __name__ == '__main__':
    unittest.main()
