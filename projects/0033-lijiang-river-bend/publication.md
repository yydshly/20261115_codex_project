# 发布记录

## 发布内容

本项目通过研究总库的 GitHub Pages Actions 统一构建。首页汇总提示词原文、技术分工、实际效果和复用价值。`play/` 为现有浏览器 Demo。支持 WebGL 2 的浏览器可走完引导航程、自由航行或快飞。环境声在首次输入后可开启。

使用技术导览图 v2 的原始 PNG，尺寸 1720 × 1872，SHA-256 为 `92e75fc505f8e6ae21b9de90dc2f881653741c9264a7ee596605e0597325c392`。图内使用项目的真实浏览器截图和同机位高斯层开关对照。单独的快飞图来自远山衔接优化后的实际 Chromium 画面。

标准库构建脚本复制网页和实测素材，复用总库内固定的 Three.js 0.180.0 模块及许可证。发布副本将模块和素材相对路径保留在本站子目录内。

## 本地构建

```powershell
python projects/0033-lijiang-river-bend/scripts/build.py
```

输出包括 `dist/index.html`、`dist/play/index.html` 和 `dist/assets/rendering-guide.png`。完整站点构建与上线地址回填方式见[总库发布约定](../../docs/deployment.md)。

## 首次公开部署与验收

- [研究页](https://yydshly.github.io/20261115_codex_project/demos/0033-lijiang-river-bend/)
- [可玩场景](https://yydshly.github.io/20261115_codex_project/demos/0033-lijiang-river-bend/play/)
- [导览图原件](https://yydshly.github.io/20261115_codex_project/demos/0033-lijiang-river-bend/assets/rendering-guide.png)
- [发布 PR #24](https://github.com/yydshly/20261115_codex_project/pull/24)，合并提交 `1bcde249c330bd3777e8bc8b772801aaaab5b0f9`。[Pages 构建与部署](https://github.com/yydshly/20261115_codex_project/actions/runs/44767775229)成功。

公网确认研究总览、项目首页、可玩场景、主程序、Three.js、Reflector 和导览图均返回 HTTP 200。总导航链接到该页面与原图，导览图 SHA-256 与生成原件相同，在线主程序与发布源码一致。

首次上线之前，在 Chromium SwiftShader 的桌面及 390 像素触屏视口实测 WebGL 2、启停完整航程、八个游览章节、贴岸定位、快船与快飞、两种视角和声音开关，未观察到浏览器控制台、网络或 WebGL 错误。四分半岸、水、空全程来自此前的 Chromium 场景回归，真机长时性能与上游河道末端截边见[项目说明](README.md#验证范围)。

公网桌面 Chromium 复测通过。读者可从总导航进入研究页及导览图，再从首页开启 Demo、开始和退出完整航程、选择贴岸章节，并操作快船、快飞、视角与声音开关。未观察到浏览器控制台、网络或 WebGL 错误。
