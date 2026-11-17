"""Publication integrity, path boundaries and explicitly approved navigation."""
from pathlib import Path
import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
from unittest.mock import patch
from zipfile import ZipFile

ROOT=Path(__file__).resolve().parents[1]
PROJECT=ROOT/'projects/0003-ai-wide-area-modeling'
spec=importlib.util.spec_from_file_location('canal_public_media',PROJECT/'scripts/publication_media.py')
media=importlib.util.module_from_spec(spec);spec.loader.exec_module(media)


class CanalPublicationTests(unittest.TestCase):
    def test_archive_paths_cannot_escape_target(self):
        with tempfile.TemporaryDirectory() as folder:
            for name in ('../outside','/absolute','a/../../outside','a\\outside'):
                with self.subTest(name=name),self.assertRaises(ValueError):media.safe_target(Path(folder),name)

    def test_verified_archive_restores_only_public_members(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);archive=root/'test.zip';out=root/'dist';out.mkdir()
            entries={'media/a.ply.gz':b'public','media/raw.npz':b'archive only'}
            with ZipFile(archive,'w') as z:
                for name,value in entries.items():z.writestr(name,value)
            record={'bytes':archive.stat().st_size,'sha256':media.digest_file(archive),'files':[{'path':name,'bytes':len(value),'sha256':hashlib.sha256(value).hexdigest(),'publish':not name.endswith('.npz')} for name,value in entries.items()],'catalog':{'scenes':[]},'assets':{}}
            manifest=root/'manifest.json';manifest.write_text(json.dumps(record))
            result=media.hydrate(out,archive,manifest)
            self.assertEqual((out/'media/a.ply.gz').read_bytes(),b'public')
            self.assertFalse((out/'media/raw.npz').exists())
            self.assertEqual(result['mode'],'published')
            with archive.open('ab') as stream:stream.write(b'tamper')
            with self.assertRaises(ValueError):media.hydrate(out,archive,manifest)

    def test_unlisted_archive_file_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);archive=root/'test.zip'
            with ZipFile(archive,'w') as z:z.writestr('../outside',b'bad')
            manifest=root/'manifest.json';manifest.write_text(json.dumps({'bytes':archive.stat().st_size,'sha256':media.digest_file(archive),'files':[]}))
            with self.assertRaises(ValueError):media.hydrate(root/'out',archive,manifest)

    def test_published_catalog_keeps_originals_and_all_viewers(self):
        record=json.loads((PROJECT/'publication-media.json').read_text(encoding='utf-8'))
        catalog=record['catalog']
        self.assertEqual(len(catalog['videos']),6);self.assertEqual(len(catalog['scenes']),6)
        self.assertEqual(len([f for f in catalog['files'] if f['kind']=='project']),39)
        self.assertEqual(len(catalog['images']),98)
        self.assertNotIn('local-api/',json.dumps(record));self.assertNotIn('127.0.0.1',json.dumps(record))
        paths=[f['path'] for f in record['files']]
        self.assertEqual(len(paths),len(set(paths)))
        self.assertLess(sum(f['bytes'] for f in record['files'] if f['publish']),800_000_000)
        for file in catalog['files']:
            if file['extension'] in ('blend','ply'):
                self.assertTrue(file['compressed']);self.assertEqual(len(file['sha256']),64)


if __name__=='__main__':unittest.main()
