# 项目收录约定

本仓库用于研究多个优秀 GitHub 项目。根 README 负责有序索引、简短摘要和图片引导；详细研究记录放在各项目目录。

## 添加项目

需要 Python 3.10 或更新版本，无需安装第三方依赖。在仓库根目录执行：

```shell
python scripts/projects.py add example-project --name "项目名称" --repository "https://github.com/owner/repo" --summary "一句话说明它解决的问题"
```

此命令分配新编号，在 `projects.json` 登记项目，并从模板创建 `projects/<id>-<slug>/README.md` 和 `assets/.gitkeep`。只在实际开发 Web 时创建该项目的 `web/`。

修改登记信息后执行：

```shell
python scripts/projects.py render
python scripts/projects.py check
```

`render` 更新根 README 的自动生成区域；该区域请勿手工维护。`check` 校验登记表、实际目录与图片，以及 README 是否同步。提交时一起包含登记表、生成后的 README 和项目文件。

## 编号与展示顺序

- `id` 为四位数字字符串，例如 `0001`，代表首次收录时分配的稳定身份；不复用旧编号。
- `slug` 使用小写英文、数字和连字符，例如 `example-project`。项目路径由 `id` 和 `slug` 推导。
- `order` 为唯一正整数，仅控制根 README 的展示顺序。调整 `order` 不需要更改编号或目录。
- 项目创建后，不要原地修改 `id` 或 `slug`。确需迁移时，应同步更新所有引用并保留旧链接的引导；先明确迁移方案。
- 暂停或结束研究时修改状态，保留已有研究结论和引用，不为复用编号删除历史。

## 登记表

`projects.json` 是索引信息的唯一来源。顶层结构为：

```json
{
  "schema_version": 1,
  "next_id": 1,
  "projects": []
}
```

`next_id` 用于分配下一个编号，不能回退以复用已分配编号。每个项目使用以下字段：

| 字段 | 内容 |
| --- | --- |
| `id`、`order`、`slug` | 稳定编号、展示排序和目录短名 |
| `name`、`summary` | 项目名称和一句话摘要，避免把长篇研究内容写入摘要 |
| `repository` | 原项目的 HTTPS GitHub 仓库地址 |
| `status` | `queued` 待研究、`researching` 研究中、`validated` 已验证、`paused` 暂停、`archived` 已归档 |
| `tags` | 标签字符串数组；没有标签时为 `[]` |
| `preview` | 无图片时为 `null`，有图片时为 `{"path": "projects/0001-example-project/assets/overview.png", "alt": "图片内容说明", "caption": "截图描述及来源"}` |
| `demo_url` | 未部署时为 `null`；部署并验证成功后填写 HTTPS 演示地址 |

`validated` 表示项目记录中已有验证步骤和结果，不代表原项目的所有能力均已验证。请注明测试环境、版本或提交，以及已知限制。

## 研究记录与图片

项目 README 从 [研究模板](../templates/project/README.md) 开始。优先记录原项目用途、关注原因、已证实结论和运行方法，区分原作者声明、自己的判断与实际验证结果。需要更多内容时，再在项目目录内增加专题文档。

图片放在本项目 `assets/` 中，使用清楚的文件名。登记表中的 `preview.path` 使用仓库根相对路径和 `/` 分隔符；Markdown 正文使用相对链接。图片必须真实存在，尚无截图时保留 `preview: null`。

为图片提供准确的替代文字和简短说明。自行截图注明来源页面及必要的版本信息；引用原项目或第三方图片时记录出处、作者与许可条件。不得把占位示意图表述为真实运行结果，截图发布前检查私人信息。

## 代码与依赖

默认保存研究文档、必要图片和自己的实现。不要直接把完整原仓库、Git 历史、依赖目录或构建产物复制进总库。引用第三方代码时保留来源和适用许可证；需要完整源码时，再为该项目选择并记录获取方式。

Web 项目的路径和发布规则见 [部署约定](deployment.md)。
