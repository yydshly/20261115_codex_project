"""Check prompt fidelity, local assets and portable links (standard library only)."""

import argparse
import hashlib
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PROMPT_BLOB = "c23587a9f624bd4c98c830dbe69b2f6bb7f2122c"


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.links = []
        self.prompts = []
        self.record = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            assert attrs["id"] not in self.ids, f"Duplicate id: {attrs['id']}"
            self.ids.add(attrs["id"])
        if tag == "img":
            assert attrs.get("alt"), "Image missing alternative text"
        for name in ("src", "href"):
            if attrs.get(name):
                self.links.append((tag, attrs[name]))
        if tag == "pre":
            self.record = []

    def handle_endtag(self, tag):
        if tag == "pre" and self.record is not None:
            self.prompts.append("".join(self.record))
            self.record = None

    def handle_data(self, data):
        if self.record is not None:
            self.record.append(data)


def check(directory):
    page = Page()
    content = (directory / "index.html").read_text(encoding="utf-8")
    page.feed(content)
    assert len(page.prompts) == 2, "Expected complete Chinese and English prompts"
    for actual, name in zip(page.prompts, ("prompt-zh.txt", "prompt-original.txt")):
        expected = (ROOT / "assets" / name).read_text(encoding="utf-8")
        assert actual.strip() == expected.strip(), f"Incomplete prompt: {name}"
    original = (ROOT / "assets/prompt-original.txt").read_bytes().rstrip(b"\n")
    git_blob = b"blob " + str(len(original)).encode() + b"\0" + original
    assert hashlib.sha1(git_blob).hexdigest() == PROMPT_BLOB, "English prompt differs from fixed upstream blob"
    local = 0
    for tag, target in page.links:
        parsed = urlsplit(target)
        if parsed.scheme or parsed.netloc:
            assert parsed.scheme in {"https", "data"}, f"Unexpected scheme: {target}"
            assert tag == "a" or parsed.scheme == "data", "Remote runtime asset"
            continue
        assert not parsed.path.startswith("/"), f"Domain-root link: {target}"
        if parsed.path:
            candidate = (directory / unquote(parsed.path)).resolve()
            assert candidate.is_relative_to(ROOT), f"Link escapes project: {target}"
            assert candidate.is_file(), f"Missing asset: {target}"
            local += 1
        elif parsed.fragment:
            assert parsed.fragment in page.ids, f"Missing anchor: {target}"
    assert len(page.ids) >= 40, "Missing content sections"
    for name in ("overview-live.jpg", "shipwreck-live.jpg", "purple-grotto-live.jpg"):
        data = (ROOT / "assets" / name).read_bytes()
        assert data[:2] == b"\xff\xd8" and data[-2:] == b"\xff\xd9", f"Invalid JPEG: {name}"
        origin = ROOT.parent / "0004-abyssal-garden/assets" / name
        if origin.is_file():
            assert hashlib.sha256(data).digest() == hashlib.sha256(origin.read_bytes()).digest(), "Screenshot differs from recorded source"
    print(f"OK: {directory.name}; complete bilingual prompts, upstream blob, {local} local references, 3 source screenshots")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dist", action="store_true")
    args = parser.parse_args()
    check(ROOT / ("dist" if args.dist else "web"))
