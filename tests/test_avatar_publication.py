"""Verify the public artifact's media boundary and linked complete guide."""
import importlib.util,json,sys,tempfile,unittest
from pathlib import Path
from unittest import mock

REPO=Path(__file__).resolve().parents[1]
PROJECT=REPO/'projects/0021-avatar-video-workflow'
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result

class AvatarPublicationTests(unittest.TestCase):
    def test_public_page_embeds_only_transformed_samples(self):
        build=module('avatar_build_test',PROJECT/'scripts/build.py');build.PUBLIC=True
        page=build.shell('effects',build.effects())
        for alias in ('matting','scene','complete','template'):
            self.assertIn(f'src="media/{alias}.mp4"',page)
        for alias in ('reference','comparison'):
            self.assertNotIn(f'src="media/{alias}.mp4"',page)
        self.assertIn('https://x.com/tm_uchal/status/2120573380768518390',page)
        self.assertNotIn('本机视频尚未连接',page)
        self.assertNotIn('未公开发布',page)

    def test_manifest_contains_exactly_four_safe_verified_files(self):
        data=json.loads((PROJECT/'publication-media.json').read_text(encoding='utf-8'))
        self.assertEqual({x['path'] for x in data['files']},{f'media/{name}.mp4' for name in ('matting','scene','complete','template')})
        self.assertTrue(all(len(x['sha256'])==64 and x['bytes']>0 for x in data['files']))
        self.assertLess(data['bytes'],25_000_000)

    def test_corrupted_cached_archive_is_rejected_before_extraction(self):
        media=module('avatar_media_test',PROJECT/'scripts/publication_media.py')
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);archive=root/'bad.zip';archive.write_bytes(b'not-the-approved-archive')
            with self.assertRaisesRegex(ValueError,'checksum'):
                media.hydrate(root/'destination',archive)
            self.assertFalse((root/'destination').exists())

    def test_complete_guide_is_the_generated_research_figure(self):
        from scripts import projects
        data=projects.load_registry(REPO);entry=next(x for x in data['projects'] if x['id']=='0021')
        self.assertTrue(entry['preview']['full_path'].endswith('/avatar-research-overview-v1.png'))
        rendered=projects.render_index(data)
        self.assertIn(f"]({entry['preview']['full_path']})",rendered)
        bad=json.loads(json.dumps(data));next(x for x in bad['projects'] if x['id']=='0021')['preview']['full_path']='projects/0021-avatar-video-workflow/assets/../../../../secret.png'
        with self.assertRaises(ValueError):projects.validate(bad,REPO)

    def test_navigation_keeps_existing_sites_and_links_full_research_guide(self):
        site=module('avatar_site_test',REPO/'scripts/build_site.py')
        html=site.navigation()
        self.assertIn('./demos/0021-avatar-video-workflow/assets/overview-preview.jpg',html)
        self.assertIn('href="./demos/0021-avatar-video-workflow/assets/avatar-research-overview-v1.png"',html)
        self.assertIn('真实样片、完整研究图和可复用后期模板',html)
        self.assertIn('./demos/0001-animation-skills-atlas/summary.html',html)
        self.assertIn('./demos/0009-ai-source-field-guide/index.html',html)
        self.assertIn('./demos/0011-everyday-wonders/map.html',html)

if __name__=='__main__':unittest.main()
