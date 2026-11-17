"""Media seeking, scoped routing and existing-viewer adaptation regressions."""
import importlib.util
from io import BytesIO
import json
from pathlib import Path
import re
import sys
import tempfile
import unittest

SCRIPTS=Path(__file__).resolve().parents[1]/'projects/0003-ai-wide-area-modeling/scripts'
sys.path.insert(0,str(SCRIPTS))
spec=importlib.util.spec_from_file_location('canal_media_server',SCRIPTS/'serve.py')
server=importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)
sys.path.remove(str(SCRIPTS))


class CanalMediaTests(unittest.TestCase):
    def make_handler(self,range_value=None):
        handler=object.__new__(server.Handler)
        handler.headers={'Range':range_value} if range_value else {}
        handler.status=None;handler.response_headers={};handler.remaining=None
        handler.send_response=lambda value:setattr(handler,'status',value)
        handler.send_header=lambda name,value:handler.response_headers.__setitem__(name,value)
        handler.end_headers=lambda:None
        handler.wfile=BytesIO()
        return handler

    def test_video_byte_ranges_and_suffix_ranges_return_exact_bytes(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'sample.mp4';path.write_bytes(b'0123456789')
            for header,expected,content_range in [('bytes=3-5',b'345','bytes 3-5/10'),('bytes=-2',b'89','bytes 8-9/10'),('bytes=7-',b'789','bytes 7-9/10')]:
                with self.subTest(header=header):
                    handler=self.make_handler(header)
                    with handler.send_file(path) as stream:handler.copyfile(stream,handler.wfile)
                    self.assertEqual(handler.status,206)
                    self.assertEqual(handler.wfile.getvalue(),expected)
                    self.assertEqual(handler.response_headers['Content-Range'],content_range)

    def test_unsatisfiable_or_multiple_ranges_fail_without_reading_file(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'sample.mp4';path.write_bytes(b'0123456789')
            for header in ('bytes=10-20','bytes=5-2','bytes=0-1,4-5','bytes=-0'):
                handler=self.make_handler(header)
                self.assertIsNone(handler.send_file(path))
                self.assertEqual(handler.status,416)

    def test_blender_projects_download_with_original_name(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'原工程.blend';path.write_bytes(b'BLENDER')
            handler=self.make_handler()
            with handler.send_file(path) as stream:self.assertEqual(stream.read(),b'BLENDER')
            self.assertIn("attachment; filename*=UTF-8''",handler.response_headers['Content-Disposition'])

    def test_viewer_import_maps_keep_nested_three_module_paths(self):
        for scene_id in server.SCENE_MAP:
            base='/20261115_codex_project/demos/0003-ai-wide-area-modeling/live/'+scene_id+'/'
            html=server.viewer_html(scene_id,base).decode()
            maps=re.findall(r'<script type="importmap">(.*?)</script>',html,re.S)
            self.assertTrue(maps)
            for value in maps:
                imports=json.loads(value)['imports']
                expected='three/build/three.module.js' if scene_id=='consistency' else 'modules/three/build/three.module.js'
                self.assertEqual(imports['three'],base+expected)
            self.assertIn('只读查看',html)
            self.assertIn("parent.postMessage({type:'canal-viewer-ready'",html)

    def test_module_mount_does_not_escape_root(self):
        self.assertIsNone(server.contained(SCRIPTS,'../../../../projects.json'))


if __name__=='__main__':unittest.main()
