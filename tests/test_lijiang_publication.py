"""Check the Lijiang export at its nested GitHub Pages path."""

from html.parser import HTMLParser
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit
import json
import runpy
import unittest

from scripts import build_site

ROOT = Path(__file__).resolve().parents[1]
SLUG = "0033-lijiang-river-bend"
PROJECT = ROOT / "projects" / SLUG
SITE_SUBPATH = Path("20261115_codex_project") / "demos" / SLUG


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.references = []
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, _tag, attrs):
        for key, value in attrs:
            if key in ("href", "src") and value:
                self.references.append(value)


class LijiangPublicationTests(unittest.TestCase):
    def test_nested_export_contains_original_guide_and_playable_scene(self):
        self.assertEqual(build_site.STATIC_PROJECTS[SLUG], "index.html")
        build = runpy.run_path(str(PROJECT / "scripts/build.py"))["build"]
        with TemporaryDirectory() as temp:
            output = Path(temp) / SITE_SUBPATH
            build(output)
            (output.parents[1] / "index.html").write_text(build_site.navigation(), encoding="utf-8")
            landing = Page(output / "index.html")
            self.assertIn("./play/", landing.references)
            for path in (output / "index.html", output / "play/index.html"):
                for reference in Page(path).references:
                    url = urlsplit(reference)
                    if url.scheme or url.netloc or not url.path:
                        continue
                    self.assertFalse(url.path.startswith("/"), reference)
                    asset = path.parent / url.path
                    if asset.is_dir():
                        asset = asset / "index.html"
                    self.assertTrue(asset.is_file(), (path, reference))

            guide = "assets/rendering-guide.png"
            self.assertEqual((output / guide).read_bytes(), (PROJECT / guide).read_bytes())
            play = output / "play"
            self.assertEqual(
                {file.name for file in play.glob("*.js")},
                {file.name for file in (PROJECT / "web").glob("*.js")},
            )
            for name in ("three.module.min.js", "three.core.min.js", "Reflector.js", "LICENSE"):
                self.assertTrue((play / "vendor" / name).is_file(), name)

    def test_navigation_links_project_and_exact_guide(self):
        registry = json.loads((ROOT / "projects.json").read_text(encoding="utf-8"))
        record = next(item for item in registry["projects"] if item["slug"] == "lijiang-river-bend")
        self.assertEqual(record["preview"]["path"], f"projects/{SLUG}/assets/rendering-guide.png")
        nav = build_site.navigation()
        self.assertIn(f'href="./demos/{SLUG}/index.html"', nav)
        self.assertIn(f'href="./demos/{SLUG}/assets/rendering-guide.png"', nav)
