"""Navigation and evidence boundaries after explicit publication approval."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('canal_site_build', ROOT / 'scripts/build_site.py')
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)


class CanalResearchIntegrationTests(unittest.TestCase):
    def navigation(self, include_local):
        def project(pid, slug):
            return {'id': pid, 'slug': slug, 'order': int(pid), 'name': slug,
                    'summary': '研究记录', 'demo_url': None}
        registry = {'projects': [project('0001', 'animation-skills-atlas'),
                                 project('0003', 'ai-wide-area-modeling'),
                                 project('0009', 'ai-source-field-guide')]}
        # Navigation now takes the research thumbnail from the registry, just
        # like the real project, rather than a second hard-coded image mapping.
        registry['projects'][1]['preview'] = {
            'path': 'projects/0003-ai-wide-area-modeling/assets/research-map/canal-integrated-architecture.png',
            'alt': '唯一 AI 运河参考图', 'caption': '探究输入，不是完整三维成果'}
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'projects.json').write_text(json.dumps(registry), encoding='utf-8')
            with patch.object(site, 'ROOT', root):
                return site.navigation(site.LOCAL_RESEARCH_PROJECTS if include_local else None) if hasattr(site,'LOCAL_RESEARCH_PROJECTS') else site.navigation()

    def test_default_publication_includes_only_explicitly_approved_research(self):
        self.assertIn('0003-ai-wide-area-modeling', site.STATIC_PROJECTS)
        self.assertIn('./demos/0003-ai-wide-area-modeling/', self.navigation(False))
        self.assertNotIn('0018-bot-role-research', site.STATIC_PROJECTS)

    def test_opt_in_preview_adds_research_and_preserves_existing_navigation(self):
        html = self.navigation(True)
        for path in ('0001-animation-skills-atlas/summary.html',
                     '0009-ai-source-field-guide/index.html',
                     '0003-ai-wide-area-modeling/index.html',
                     '0003-ai-wide-area-modeling/assets/research-map/canal-integrated-architecture.png'):
            with self.subTest(path=path):
                self.assertIn('./demos/' + path, html)

    def test_evidence_export_rejects_parent_paths(self):
        path = ROOT / 'projects/0003-ai-wide-area-modeling/scripts/build.py'
        spec = importlib.util.spec_from_file_location('canal_evidence_export', path)
        exporter = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(exporter)
        with self.assertRaises(ValueError):
            exporter.inside(path.parent, '../../../../../private.txt')

    @unittest.skipUnless(hasattr(site,'LOCAL_RESEARCH_PROJECTS'),'Local preview is not part of the isolated public build')
    def test_preview_does_not_offer_missing_unpublished_exports(self):
        with patch.object(site, 'ROOT', ROOT):
            html = site.navigation(site.LOCAL_RESEARCH_PROJECTS, set(site.LOCAL_RESEARCH_PROJECTS))
        # Registered published URLs may still be offered; missing relative exports may not.
        self.assertNotIn('./demos/0001-animation-skills-atlas/summary.html', html)
        self.assertNotIn('./demos/0009-ai-source-field-guide/index.html', html)


if __name__ == '__main__':
    unittest.main()
