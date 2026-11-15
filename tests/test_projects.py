"""Exercise the research workflow in disposable, isolated repositories."""

import contextlib
import copy
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from scripts import projects


class ResearchWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="research-index-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        (self.root / "projects").mkdir()
        (self.root / "templates/project").mkdir(parents=True)
        projects.write_text(
            self.root / "projects.json",
            json.dumps({"schema_version": 1, "next_id": 1, "projects": []}) + "\n",
        )
        projects.write_text(
            self.root / "README.md",
            f"# 我的研究库\n\n{projects.START}\n{projects.END}\n\n保留手写说明。\n",
        )
        projects.write_text(
            self.root / "templates/project/README.md",
            "# {{id}} · {{name}}\n\n{{summary}}\n\n[原仓库]({{repository}})\n",
        )

    def add(self, slug="alpha", name="Alpha", summary="研究这个项目的用途"):
        return projects.add_project(
            self.root, slug, name, f"https://github.com/example/{slug}", summary
        )

    def command(self, command):
        output = io.StringIO()
        errors = io.StringIO()
        with mock.patch.object(projects, "ROOT", self.root), mock.patch(
            "sys.argv", ["projects.py", command]
        ), contextlib.redirect_stdout(output), contextlib.redirect_stderr(errors):
            code = projects.main()
        return code, output.getvalue(), errors.getvalue()

    def test_empty_repository_renders_without_inventing_projects(self):
        self.assertEqual(self.command("render")[0], 0)
        code, output, errors = self.command("check")
        self.assertEqual((code, errors), (0, ""))
        self.assertIn("0 project(s)", output)
        readme = (self.root / "README.md").read_text(encoding="utf-8")
        self.assertIn("尚未收录子项目", readme)
        self.assertNotIn("| 顺序 |", readme)

    def test_add_creates_research_files_and_advances_stable_ids(self):
        first = self.add(name="Alpha [工具]", summary="用途 A | 用途 B")
        second = self.add("beta", "Beta")
        self.assertEqual((first["id"], second["id"]), ("0001", "0002"))
        registry = projects.load_registry(self.root)
        self.assertEqual(registry["next_id"], 3)
        self.assertEqual([item["status"] for item in registry["projects"]], ["queued"] * 2)
        first_folder = self.root / "projects/0001-alpha"
        self.assertTrue((first_folder / "assets/.gitkeep").is_file())
        self.assertFalse((first_folder / "web").exists())
        research = (first_folder / "README.md").read_text(encoding="utf-8")
        self.assertIn("0001", research)
        self.assertIn("https://github.com/example/alpha", research)
        self.assertIn("用途 A &#124; 用途 B", research)
        self.assertNotIn("{{", research)
        self.assertEqual(self.command("check")[0], 0)

    def test_reordering_preserves_project_ids_and_directory_links(self):
        self.add()
        self.add("beta", "Beta")
        registry = projects.load_registry(self.root)
        registry["projects"][0]["order"] = 20
        registry["projects"][1]["order"] = 10
        projects.validate(registry, self.root)
        index = projects.render_index(registry)
        self.assertLess(index.index("`0002`"), index.index("`0001`"))
        self.assertIn("projects/0001-alpha/README.md", index)
        self.assertIn("projects/0002-beta/README.md", index)
        self.assertTrue((self.root / "projects/0001-alpha/README.md").is_file())

    def test_preview_and_live_demo_render_and_missing_image_is_rejected(self):
        self.add()
        registry = projects.load_registry(self.root)
        image = "projects/0001-alpha/assets/overview screen.svg"
        projects.write_text(
            self.root / image,
            '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">'
            '<rect width="10" height="10" fill="blue"/></svg>\n',
        )
        registry["projects"][0]["preview"] = {
            "path": image,
            "alt": "Alpha 功能总览",
            "caption": "验证环境中的真实界面；来源：原项目。",
        }
        registry["projects"][0]["demo_url"] = "https://example.com/demos/alpha/"
        projects.validate(registry, self.root)
        index = projects.render_index(registry)
        self.assertIn("![Alpha 功能总览]", index)
        self.assertIn("overview%20screen.svg", index)
        self.assertIn("验证环境中的真实界面；来源：原项目。", index)
        self.assertIn("[演示](https://example.com/demos/alpha/)", index)
        registry["projects"][0]["preview"]["path"] = (
            "projects/0001-alpha/assets/missing.png"
        )
        with self.assertRaisesRegex(ValueError, "截图文件不存在"):
            projects.validate(registry, self.root)

    def test_conflicting_ids_and_display_orders_are_rejected(self):
        self.add()
        self.add("beta", "Beta")
        original = projects.load_registry(self.root)
        for field, message in (("id", "重复编号"), ("order", "order 必须是唯一正整数")):
            with self.subTest(field=field):
                registry = copy.deepcopy(original)
                registry["projects"][1][field] = registry["projects"][0][field]
                with self.assertRaisesRegex(ValueError, message):
                    projects.validate(registry, self.root)

    def test_preview_cannot_escape_its_project_assets(self):
        self.add()
        original = projects.load_registry(self.root)
        for relative in (
            "projects/0001-alpha/assets/../../../outside.svg",
            "projects/0002-other/assets/overview.svg",
            "/tmp/outside.svg",
        ):
            with self.subTest(path=relative):
                registry = copy.deepcopy(original)
                registry["projects"][0]["preview"] = {
                    "path": relative, "alt": "预览", "caption": "描述"
                }
                with self.assertRaises(ValueError):
                    projects.validate(registry, self.root)

    def test_render_preserves_manual_content_and_check_detects_stale_index(self):
        self.add()
        readme_path = self.root / "README.md"
        readme = readme_path.read_text(encoding="utf-8")
        projects.write_text(readme_path, "手写导言。\n" + readme + "\n手写尾注。\n")
        registry = projects.load_registry(self.root)
        registry["projects"][0]["summary"] = "更新后的研究目的"
        projects.write_text(
            self.root / "projects.json",
            json.dumps(registry, ensure_ascii=False, indent=2) + "\n",
        )
        code, _, error = self.command("check")
        self.assertEqual(code, 1)
        self.assertIn("README 索引未同步", error)
        self.assertEqual(self.command("render")[0], 0)
        updated = readme_path.read_text(encoding="utf-8")
        self.assertTrue(updated.startswith("手写导言。\n"))
        self.assertTrue(updated.endswith("\n手写尾注。\n"))
        self.assertIn("更新后的研究目的", updated)
        self.assertEqual(self.command("check")[0], 0)

    def test_invalid_add_does_not_change_registry_or_create_project(self):
        before = (self.root / "projects.json").read_bytes()
        with self.assertRaises(ValueError):
            self.add("../outside", "Invalid")
        self.assertEqual((self.root / "projects.json").read_bytes(), before)
        self.assertEqual(list((self.root / "projects").iterdir()), [])


if __name__ == "__main__":
    unittest.main()
