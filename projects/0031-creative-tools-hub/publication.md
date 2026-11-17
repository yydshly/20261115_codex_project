# 15库创作工具总览 · 发布记录

2026-11-17，按用户明确授权整理理解、部署网页并提交远端；摘要说明对我们的价值，引导图沿用本轮生成原件。

[正式网页](https://yydshly.github.io/20261115_codex_project/demos/0031-creative-tools-hub/) · [完整汇总图](https://yydshly.github.io/20261115_codex_project/demos/0031-creative-tools-hub/map.html) · [统一导航](https://yydshly.github.io/20261115_codex_project/)

## 内容与价值

15项创作库放在同一入口，先看效果和署名，再说明作用、对我们的价值、参考场景、输入输出、修改方式与验证边界。五条任务路线帮助我们按短片、数字人口播、三维世界、网页返修和参考片研究选工具；最多三项并排对照。保留15份阶段资料、官方出处及本库已有测量口径，便于继续修改、验收和复用。

作者案例、本站实测、共享样片与原理示意分别标注。三段自制视频随公开站点提供；其他未发布项目、依赖、缓存和原作者完整影片不随本轮提交。研究汇总不代表新跑通了全部15库或全自动生产线。

## 原图与素材

总导航和项目首页引用同一份3200×10440原始PNG。SHA-256：`e41c8fdbdf549304220d70487aa102d532c85ca87bc9f52538c721a221ae7c7f`。构建不调用模型、不重绘，线上原图与源文件逐字节一致。

[媒体Release](https://github.com/yydshly/20261115_codex_project/releases/tag/creative-tools-hub-media-20261117)恢复三段本库视频，包级及逐文件SHA-256均校验；具体来源和许可见[第三方声明](THIRD_PARTY_NOTICES.md)与[素材台账](assets/SOURCES.md)。

## 首次公开部署

- 发布[PR #20](https://github.com/yydshly/20261115_codex_project/pull/20)，源提交`01943703eb2c0bec39af9ede4895d35a20d0e402`。
- 合并提交`1d57b07f3349e4feec1f186862e7a4601312361f`。
- PR统一构建与索引校验通过；[主分支构建和Pages部署](https://github.com/yydshly/20261115_codex_project/actions/runs/44104546549)成功后，才填写登记表demo_url。
- 本地40项总库测试通过，1项按既有规则跳过；发布检查覆盖15项、五条路线、17页、相对资源、原图和媒体哈希，体积约24MB。

## 线上核验

首次部署后读取69个公开文件，均HTTP 200；图片与视频核对原始字节哈希，文字仅归一Windows／Linux换行后比较。统一导航15个入口均可访问，0031摘要、价值要点与原PNG路径正确。三段自制视频的1024字节Range请求均返回206；EffectCraft六秒视频在浏览器完整播放到结束。

浏览器确认15张条目、3200×10440原图、写实场景筛选、数字人口播路线、三项对照、带署名的图片放大和长图原尺寸／适宽切换。390×844手机视口无页面横向溢出，筛选保留ComfyUI、Blender MCP与Three.js；临时视口已恢复。

阅读阶段资料时发现旧路径替换误伤部分HTTPS链接；补录时从本库原研究记录恢复15份资料的官方出处，并加入来源URL覆盖检查。原研究判断、测量口径和引导图保持原样。首次上线的文件与交互核验保存于[online-verification.json](online-verification.json)，记录明确对应首次部署提交；后续发布状态可在仓库Actions回查。
