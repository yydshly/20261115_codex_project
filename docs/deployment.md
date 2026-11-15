# GitHub Pages 发布约定

首个已接入发布的项目为 `0001-animation-skills-atlas`。研究源码、正式引导图与验证记录保存在 Git；视频和预览文件通过带 SHA-256 清单的媒体 Release 恢复。站点构建产物 `_site/` 不提交。

## 公开路径

- 总导航：`https://yydshly.github.io/20261115_codex_project/`
- 动画研究总结：`https://yydshly.github.io/20261115_codex_project/demos/0001-animation-skills-atlas/summary.html`
- 项目目录下还包含 `index.html`（原始目录）、`cases.html`、`compare.html`、`showcase.html`、`lab.html`、`sources.html`。

上述为固定发布路径；实际首次上线结果与检查时间见项目 `publication.md`。登记表的 `demo_url` 只在公开页面验证通过后填写。

## 构建与发布

`.github/workflows/pages.yml` 在 main 上相关文件变更或手动触发时运行：锁文件安装前端依赖 → 校验登记表 → 校验并恢复媒体 → 构建 Vite 多页面站点 → 生成 `_site/index.html` 导航 → 上传统一 Pages artifact → 发布。

```powershell
cd projects/0001-animation-skills-atlas/web
npm ci
cd ../../..
python scripts/projects.py check
python scripts/build_site.py
```

`build_site.py` 仅构建明确接入的项目，不因其他项目存在 `web/` 就自动发布。每个项目未来按需加入统一构建，保持 `_site/demos/<id>-<slug>/`。一份 Pages artifact 汇总所有明确发布的项目，避免不同项目覆盖整个站点。

## 视频与预览

`projects/0001-animation-skills-atlas/publication-media.json` 记录公开媒体包 URL、包哈希与逐文件哈希。下载、文件列表和哈希不一致时构建失败。解包只允许项目 `web/public/` 内的相对路径，拒绝目录穿越。

媒体包由 `projects/0001-animation-skills-atlas/scripts/package_publication_media.py` 从当前有效媒体白名单生成；不收集依赖、临时帧、私人资料、校验截图或完整第三方工程。发布包为网页展示资源，不是第三方商业素材包。归因与许可说明见项目 `THIRD_PARTY_NOTICES.md`。

本地已有媒体包时可用 `python scripts/build_site.py --media-archive <本地 zip 路径>`，仍执行全部哈希验证。Pages 不提供后端；纯前端交互和浏览器内导出可运行，私密凭据不得进入 artifact。

## 子路径与验收

Vite 使用经验证的相对路径，全部页面与媒体保留在 `/20261115_codex_project/demos/0001-animation-skills-atlas/`。不使用跳到域名根目录的 `/assets/...`。每次发布检查主入口、深层页面、脚本、样式、引导图、18 张预览、8 段动态效果和同案成片；视频须可解码并支持请求。

发布成功后更新 `demo_url`，运行 `python scripts/projects.py render` 与 `check`，提交登记表、生成 README 和本项目相关文件。其他聊天未完成的项目保留原工作区，单独研究，不随本次发布提交。
