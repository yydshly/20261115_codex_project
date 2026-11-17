# 离线模型准备

`prepare-mature-tree.mjs` 是开发阶段的派生资产准备工具，不参与页面启动或普通构建，不增加浏览器运行依赖。

- 原件来自 [Poly Haven Jacaranda Tree](https://polyhaven.com/a/jacaranda_tree)，按运行资产内的 `source-manifest.json` 下载并校验到 `.local/upstream/jacaranda/`。
- 优化器使用官方 npm `meshoptimizer@1.3.0`（MIT），包地址 `https://registry.npmjs.org/meshoptimizer/-/meshoptimizer-1.3.0.tgz`。下载包与完整许可证保存在 `.local/tools/meshoptimizer/`，原版的 package.json、依赖和源码未修改。
- 执行 `node --max-old-space-size=4096 tools/prepare-mature-tree.mjs` 生成三个层级；`--distant-only` 只更新远景层级。
- 输出到 `assets/models/trees/jacaranda/`，实际运行直接加载这些已准备文件，不在用户浏览器中减面。生成后运行 `npm run check`。
