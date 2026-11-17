from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
import hashlib
import importlib.util
import json
import unittest
from zipfile import ZipFile

PROJECT = Path(__file__).resolve().parents[1]/'projects/0020-human-nature-film-study'
spec = importlib.util.spec_from_file_location('human_nature_media', PROJECT/'scripts/publication_media.py')
media = importlib.util.module_from_spec(spec)
spec.loader.exec_module(media)


class PublicationArchiveTests(unittest.TestCase):
    def prepare(self, root):
        file = root/'assets/videos/film-v1-60s.mp4'
        file.parent.mkdir(parents=True)
        data = b'verified-video-test-payload'
        file.write_bytes(data)
        manifest = {'videos':[{'id':'film-v1','file':'videos/film-v1-60s.mp4',
                               'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}]}
        (root/'assets/media-manifest.json').write_text(json.dumps(manifest),encoding='utf-8')
        return data

    def test_package_and_restore_preserve_bytes(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            data = self.prepare(root)
            with patch.object(media, 'ROOT', root):
                media.package(root/'archive.zip')
                self.assertEqual(media.hydrate(root/'restored',root/'archive.zip'),1)
                self.assertEqual((root/'restored/videos/film-v1-60s.mp4').read_bytes(),data)

    def test_corrupt_archive_is_rejected_before_writing(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.prepare(root)
            with patch.object(media, 'ROOT', root):
                media.package(root/'archive.zip')
                with (root/'archive.zip').open('ab') as stream:
                    stream.write(b'corruption')
                with self.assertRaisesRegex(ValueError,'archive failed'):
                    media.hydrate(root/'restored',root/'archive.zip')
                self.assertFalse((root/'restored').exists())

    def test_extra_traversal_entry_is_rejected(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.prepare(root)
            with patch.object(media, 'ROOT', root):
                media.package(root/'archive.zip')
                with ZipFile(root/'archive.zip','a') as archive:
                    archive.writestr('../outside.txt',b'outside')
                data = (root/'archive.zip').read_bytes()
                record = json.loads((root/'publication-media.json').read_text(encoding='utf-8'))
                record.update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
                (root/'publication-media.json').write_text(json.dumps(record),encoding='utf-8')
                with self.assertRaisesRegex(ValueError,'Unexpected archive entries'):
                    media.hydrate(root/'restored',root/'archive.zip')
                self.assertFalse((root/'restored').exists())


if __name__ == '__main__':
    unittest.main()
