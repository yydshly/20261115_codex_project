# 风与春网页发布记录

2026-11-17用户明确授权整理理解、部署网页并提交远端。本次提交与验收按用户要求只使用Git和命令行。

## 已上线

- [公开研究网页](https://yydshly.github.io/20261115_codex_project/demos/0020-human-nature-film-study/index.html)
- [完整分析](https://yydshly.github.io/20261115_codex_project/demos/0020-human-nature-film-study/analysis.html)
- [制作档案与视频](https://yydshly.github.io/20261115_codex_project/demos/0020-human-nature-film-study/archive.html)
- [自动发布成功记录](https://github.com/yydshly/20261115_codex_project/actions/runs/44052881520)

## 内容与提交

摘要分别写明原参考的天气体验效果、可见拍摄组织、对我们的创作价值。人物开窗和门边姿态、框景、室内外明暗与湿润材质是可见依据；完整原作者拍摄、声音和制作流程仍未知。保留九次关键讨论、四项价值、五步创作路径与写春的延伸，试片只作验证。

- `cbe682f5ef599e66e67b31b12f3c3e6efcba4699`：新增0020研究及必要索引、Pages配置，保留远端并行新增的鹈鹕研究。
- `34a4887acdff36038bb997f624d312eee1d8671f`：修正阻塞统一构建的SVG校验记录。已证明差异只有CRLF/LF，更新两处长度和哈希元数据，PNG/JPG和SVG图稿内容均保留。

## 原图与视频

引导图使用此前交付的`assets/understanding-map-v1.png`原文件，2400×5166，SHA-256为`1f2034e59f1b8c2f2eb82806a85116a4911e7c4418c69ac358e7b166fdd75960`。总导航和项目页可打开完整高清图。

两版整片和六段原片沿用已生成的网页副本，从[Release素材包](https://github.com/yydshly/20261115_codex_project/releases/tag/human-nature-film-media-20261117)校验恢复。素材包37,657,226字节，SHA-256为`033428d408f68342f45a03ecd20232813971540f06bd26cfee557fcfebb9f2b2`；此前生成共975积分，本次发布新增0生成积分。第三方完整原片保留原帖入口，引用截图与AI试片分别注明来源。

## 真实验收范围

2026-11-17 17:12（Asia/Shanghai）通过HTTP检查三页内容与共享总导航，在线引导图与原图SHA-256一致，八段视频首段与末段请求均返回HTTP206和正确长度。详见`live-verification.json`。

CI通过37项Python测试（其中一项本地预览检查跳过）及现有Node检查，完成统一站点构建、上传与Pages部署。本项目发布前还检查了三页链接、九条原话、八段视频哈希、原图哈希、公开体积及素材包篡改/路径拒绝测试。

新版页面未做新的浏览器排版复核；命令行资源检查不证明视觉体验与声音有效。60秒初版反馈感受偏弱，30秒重剪仍待反馈；原片与试片均未完成听审。
