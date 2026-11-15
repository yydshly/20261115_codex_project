# Web 部署约定

当前仓库只完成研究总库初始化，尚未部署 Web，也未启用 GitHub Pages。项目没有可访问的演示时，`demo_url` 保持 `null`。

GitHub Pages 为每个仓库提供一个站点，可在同一站点下放置多个项目入口。本仓库计划使用项目站点，其地址前缀为 `https://yydshly.github.io/20261115_codex_project/`；这只是未来约定地址，不代表已经上线。Pages 托管静态文件，不提供应用后端运行环境。参见 [GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)。

## 一个站点，多个入口

每个项目按需在自己的 `web/` 下开发，技术栈可以独立选择。将各项目构建后的静态文件汇总到同一个发布目录：

```text
projects/<id>-<slug>/web/       # 项目源码，实际开发时再创建
_site/
  index.html                  # 总导航
  demos/
    <id>-<slug>/
      index.html
      assets/
```

例如，`0001-example-project` 的预期公开路径为：

```text
/20261115_codex_project/demos/0001-example-project/
```

`_site/` 是汇总构建产物，不作为研究源码提交。未来部署时统一构建、统一上传、统一发布，避免不同项目分别发布整个站点而相互覆盖。带服务端、数据库或私密凭据的功能需要另行选择后端托管方式。

## 为子路径构建

- 各项目的资源基础路径需包含仓库名前缀和自己的演示目录，或使用经验证的相对路径。
- 不要将资源地址写死为 `/assets/...`，该地址会跳到域名根目录。
- SPA 需要选择适合静态托管的路由方式，例如 hash 路由，或明确处理刷新和深层链接访问。
- 各项目分别记录构建命令、运行环境及产物目录。统一发布时只收集可公开的静态文件，不上传 `.env`、密钥或本地数据。

## 首次发布时

1. 确定首个 Web 项目的框架、构建命令和子路径配置，并完成本地验证。
2. 建立统一汇总流程，生成 `_site/index.html` 和各项目入口。
3. 再配置 GitHub Pages 发布；可参考 [官方自定义工作流指南](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。本轮不添加部署工作流。
4. 发布后检查导航、图片、静态资源、刷新和深层链接，确认演示可访问后再填写 `demo_url`。
5. 运行 `python scripts/projects.py render` 和 `python scripts/projects.py check`，同步根 README。
