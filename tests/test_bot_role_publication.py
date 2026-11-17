"""User-facing publication contracts for the bot-role study."""
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "projects/0018-bot-role-research"
spec = importlib.util.spec_from_file_location("bot_publication", PROJECT / "scripts/check_publication.py")
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)
site_spec = importlib.util.spec_from_file_location("bot_site", ROOT / "scripts/build_site.py")
site = importlib.util.module_from_spec(site_spec)
site_spec.loader.exec_module(site)


class BotRolePublicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run([sys.executable, str(PROJECT / "scripts/build.py"), "--publication"], check=True, capture_output=True)

    def test_export_carries_understanding_and_the_original_full_guide(self):
        result = checker.verify_site(PROJECT / "dist")
        self.assertEqual(result["guide_size"], [3200, 7230])
        self.assertEqual(result["understanding"], 6)
        self.assertEqual(result["roles"], [8, 5])

    def test_a_source_directory_dependency_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            export = Path(folder) / "dist"
            shutil.copytree(PROJECT / "dist", export)
            page = export / "index.html"
            page.write_text(page.read_text(encoding="utf-8").replace('href="styles.css"', 'href="../styles.css"'), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Missing or escaping"):
                checker.verify_site(export)

    def test_public_navigation_uses_the_selected_generated_image(self):
        self.assertIn("0018-bot-role-research", site.STATIC_PROJECTS)
        with tempfile.TemporaryDirectory() as folder:
            temp = Path(folder)
            (temp / "projects.json").write_text(json.dumps({"projects": [{"id": "0018", "slug": "bot-role-research", "order": 18, "name": "Bot study", "summary": "Understanding and evidence", "demo_url": None, "preview": {"path": "projects/0018-bot-role-research/assets/bot-role-overview.png", "alt": "Original full guide", "caption": "Author claims remain unverified"}}]}), encoding="utf-8")
            with patch.object(site, "ROOT", temp):
                html = site.navigation()
        self.assertIn("./demos/0018-bot-role-research/index.html", html)
        self.assertIn("./demos/0018-bot-role-research/assets/bot-role-overview.png", html)


if __name__ == "__main__":
    unittest.main()
