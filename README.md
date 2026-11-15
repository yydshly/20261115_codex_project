# GitHub 项目研究索引

记录近期遇到的优秀开源项目，沉淀用途、原理、实践结果与选择依据。每个子项目独立研究，首页保留有序索引、简短摘要与真实截图，方便回查和继续探索。

<!-- PROJECTS:START -->

## 子项目索引

已收录 **0** 个项目。

尚未收录子项目。添加首个真实项目后，这里将自动显示有序索引与图片摘要。

<!-- PROJECTS:END -->

## 开始研究

需要 Python 3.10 或更新版本，无需安装第三方依赖。在仓库根目录执行（将示例参数换成实际项目）：

```bash
python scripts/projects.py add project-slug --name "项目名称" --repository "https://github.com/owner/repository" --summary "它解决什么问题，为什么值得研究"
```

命令会分配下一个固定编号、创建研究目录，并更新首页。随后补充子项目 README，将真实截图放入该项目的 `assets/`，再在 `projects.json` 登记图片、标签或已上线的演示链接。

```bash
python scripts/projects.py render
python scripts/projects.py check
```

编号是稳定标识，`order` 决定展示顺序。调整顺序时只改 `order`，保留已有编号和目录链接。

## 仓库导航

| 位置 | 内容 |
| --- | --- |
| [projects/](projects/) | 按固定编号归档的子项目研究、截图与实验 |
| [projects.json](projects.json) | 项目元数据与展示顺序的唯一登记表 |
| [研究规范](docs/conventions.md) | 新增项目、状态、截图与引用约定 |
| [Web 部署约定](docs/deployment.md) | 多个演示站点的目录、路径与发布方式 |
| [研究模板](templates/project/README.md) | 每个子项目的研究提纲 |

当前完成研究总库的初始化。首个实际 Web 项目接入时，再配置 GitHub Pages 发布。

第三方项目的源码与素材遵循各自许可证；研究记录应注明来源、验证范围与仍待确认的问题。
