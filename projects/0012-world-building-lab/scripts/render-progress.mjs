import {writeFileSync} from 'node:fs';
import {progressItems,progressStatuses,progressGroups,progressCounts,progressRoadmap,worldSummary,progressVersion,sceneHref} from '../web/world-progress-data.js';
import {auditCounts,auditPriorities,auditSeams} from '../web/world-audit-data.js';
const counts=progressCounts(),base='http://127.0.0.1:52932/';
const lines=['# 世界构建进度与补全顺序','',`更新：${progressVersion}。根据 web/world-progress-data.js 生成；网页总览、大地图内进度和本表共用一份清单。`,'','[打开统一总览]('+base+'journey.html) · [进入3D大地图]('+base+'expedition.html#build-1)','',`当前${progressItems.length}项清单：已完成展示${counts.done}项、简化样本${counts.sample}项、尚未制作${counts.planned}项。它们范围不同，不换算为游戏完成百分比。`,`构建路线${worldSummary.stations}站${worldSummary.observations}处；水系${worldSummary.waterStations}站${worldSummary.waterObservations}处。观察数量与项目完成度分开。`,'','## 状态口径',''];
lines.splice(lines.length-2,0,'## 环境基座全局盘点','',
  `环境图谱有 ${auditCounts.modern} 个现代条目，其中 ${auditCounts.linked} 个有 3D 入口。另有 ${auditCounts.ancient} 个史前案例。`,'',
  ...auditSeams.map(r=>`- [${r.title}](${base}journey.html#seam-${r.id})。 ${r.seen}`),'',
  ...auditPriorities.map((r,i)=>`${i+1}. ${r.title}。 ${r.detail}`),'');
for(const s of Object.values(progressStatuses))lines.push(`- **${s.label}**：${s.description}`);
lines.push('','## 当前完整清单','','| 层次 / 内容 | 状态 | 现在具备 | 仍需补全 |','| --- | --- | --- | --- |');
for(const r of progressItems){const link=r.scene?`[${r.title}](${base+sceneHref(r)})`:r.title;lines.push(`| ${progressGroups[r.group]} / ${link} | ${progressStatuses[r.status].label} | ${r.have} | ${r.missing} |`);}
lines.push('','## 接下来按依赖补全','');for(const r of progressRoadmap)lines.push(`### ${r.step}. ${r.title}`,`状态：${r.status}。`,'',r.focus,'',r.reason,'',`依赖：${r.depends}。`,'',`验收目标：${r.acceptance}。`,'');
lines.push('## 入口与历史内容','','- index.html 与 journey.html 是同一份当前进度总览。','- expedition.html 进入当前3D地图，右上角“世界进度”打开同源清单。','- 总览可保留大地图传入的观察站点，返回继续。查看进度时暂停导览。','- legacy-journey.html 保留早期十境演示、原讲解与原观察手记键。','','本轮核对了四处重点接缝视角。完整116站行程、所有天气组合与真机性能另行验收。','');
writeFileSync(new URL('../PROGRESS.md',import.meta.url),lines.join('\n'));console.log(`Rendered PROGRESS.md: ${progressItems.length} items, ${progressRoadmap.length} next steps`);
