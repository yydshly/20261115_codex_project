# 仓库协作规则

这是多个 GitHub 项目的研究总库。默认使用简洁中文；根 README 负责有序索引、简短摘要和图片引导，详细研究放在项目目录。

## 索引与项目结构

- `projects.json` 是索引信息的唯一来源，遵循 `schema_version: 1`。
- 用 `python scripts/projects.py add <slug> --name "名称" --repository "https://github.com/owner/repo" --summary "一句话"` 创建新项目，需要 Python 3.10+。
- 项目目录为 `projects/<id>-<slug>/`。编号稳定且不复用，不原地修改 `id` 或 `slug`；`order` 仅控制展示顺序。
- 修改登记表后运行 `python scripts/projects.py render`，不要手工编辑根 README 的自动生成区域。
- 提交前运行 `python scripts/projects.py check`，一起提交登记表、生成后的 README 和相关项目文件。
- 详细字段和收录流程见 [docs/conventions.md](docs/conventions.md)。

## 研究与素材

- 从 `templates/project/README.md` 开始，按实际需要增加文档或代码，不创建虚构的研究结果、截图和演示地址。
- 区分原作者声明、自己的推断与实际验证结论；记录验证环境和原项目版本或提交。
- 项目图片存入该项目的 `assets/`，提供准确描述，保留来源及必要许可声明。发布前检查截图中的私人信息。
- 不提交密钥、私人数据、依赖目录、完整第三方 Git 历史或可重新生成的构建产物。
- 引用第三方代码或素材时保留所需许可证；不要默认所有上游项目均允许任意再分发。

## Web 开发与发布

- 仅在实际开发时创建项目的 `web/`，尊重各项目已有技术栈。
- 未来统一汇总到 `_site/demos/<id>-<slug>/`，公开路径需包含仓库名 `/20261115_codex_project/`。
- 目前未启用 GitHub Pages。只在有明确发布任务时配置部署，不因初始化自动发布站点。
- 部署规则见 [docs/deployment.md](docs/deployment.md)；演示真实可访问后才填写 `demo_url`。

## 变更边界

保持初始化和维护工具轻量，优先使用 Python 标准库。不为尚未开始的子项目预装框架或依赖。尊重现有内容和用户修改，不覆盖无关文件，不执行范围不明的清理。涉及迁移、删除或改变历史引用时，先明确影响与恢复方式。
