"""Regression checks for the summary guide and repository-scoped publication."""
from html.parser import HTMLParser
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / 'projects/0011-everyday-wonders'
spec = importlib.util.spec_from_file_location('wonders_publication_site', ROOT / 'scripts/build_site.py')
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        for name in ('href', 'src'):
            if values.get(name):
                self.refs.append(values[name])


class EverydayWondersPublicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run([sys.executable, str(PROJECT/'scripts/build.py'), '--dist'], check=True)

    def test_navigation_uses_summary_guide_and_keeps_existing_sites(self):
        def project(pid, slug, picture):
            return {'id':pid, 'slug':slug, 'order':int(pid), 'name':slug,
                    'summary':'从参考理解到故事复用', 'demo_url':None, 'highlights':['阶段有区分'],
                    'preview':{'path':f'projects/{pid}-{slug}/assets/{picture}', 'alt':'创意与能力引导图', 'caption':'图文整理'}}
        registry = {'projects':[project('0001','animation-skills-atlas','technology-understanding.png'),
                                project('0009','ai-source-field-guide','relation-map.png'),
                                project('0011','everyday-wonders','creative-summary-v1.png'),
                                project('0013','unpublished-research','private.png')]}
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root/'projects.json').write_text(json.dumps(registry), encoding='utf-8')
            with patch.object(site,'ROOT',root):
                page = site.navigation()
        self.assertIn('./demos/0001-animation-skills-atlas/summary.html', page)
        self.assertIn('./demos/0009-ai-source-field-guide/index.html', page)
        self.assertIn('./demos/0009-ai-source-field-guide/assets/relation-map.png', page)
        self.assertIn('./demos/0011-everyday-wonders/map.html', page)
        self.assertIn('./demos/0011-everyday-wonders/assets/creative-summary-v1.png', page)
        self.assertNotIn('unpublished-research', page)

    def test_both_exported_pages_are_self_contained_at_repository_subpath(self):
        output = PROJECT/'dist'
        for name in ('index.html','map.html'):
            page = output/name
            links = Links()
            links.feed(page.read_text(encoding='utf-8'))
            for ref in links.refs:
                parts = urlsplit(ref)
                if parts.scheme or parts.netloc or not parts.path:
                    continue
                with self.subTest(page=name,ref=ref):
                    self.assertFalse(parts.path.startswith('/'))
                    target = (page.parent/unquote(parts.path)).resolve()
                    self.assertTrue(target.is_relative_to(output.resolve()))
                    self.assertTrue(target.is_file())
        self.assertNotIn('../stories/', (output/'app.js').read_text(encoding='utf-8'))

    def test_published_guide_is_the_same_image_and_archive_has_seven_proposals(self):
        output = PROJECT/'dist'
        meta = json.loads((PROJECT/'assets/creative-summary-v1.meta.json').read_text(encoding='utf-8'))
        image = (output/'assets/creative-summary-v1.png').read_bytes()
        self.assertEqual(hashlib.sha256(image).hexdigest(), meta['png_sha256'])
        self.assertEqual(meta['size'], [2400,4480])
        svg = (output/'assets/creative-summary-v1.svg').read_bytes()
        self.assertEqual(hashlib.sha256(svg).hexdigest(), meta['svg_sha256'])
        archive = json.loads((output/'stories.json').read_text(encoding='utf-8'))
        self.assertEqual(len(archive['stories']),7)
        self.assertEqual(sum(x['stage']=='seed' for x in archive['stories']),5)
        self.assertEqual(sum(x['stage']=='treatment' for x in archive['stories']),2)
        for story in archive['stories']:
            self.assertTrue((output/'stories'/f"{story['id']}.md").is_file())


if __name__ == '__main__':
    unittest.main()
