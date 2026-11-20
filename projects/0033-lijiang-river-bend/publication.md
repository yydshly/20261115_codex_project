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
