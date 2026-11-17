"""Copy this project into the authorized isolated branch and merge only entry 0021."""
from pathlib import Path
import argparse,copy,json,shutil

ROOT=Path(__file__).resolve().parents[1];SOURCE_REPO=ROOT.parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--checkout',required=True);args=p.parse_args()
checkout=Path(args.checkout).resolve();target=checkout/'projects'/ROOT.name
if not (checkout/'.git').exists():raise ValueError('Destination must be the isolated Git worktree')
if target.exists():raise ValueError('Destination project exists; review before synchronizing')
shutil.copytree(ROOT,target,ignore=shutil.ignore_patterns('.local','dist','__pycache__','*.pyc'))
registry=json.loads((checkout/'projects.json').read_text(encoding='utf-8'))
entry=copy.deepcopy(next(x for x in json.loads((SOURCE_REPO/'projects.json').read_text(encoding='utf-8'))['projects'] if x['id']=='0021'))
entry['summary']='从模型与平台的分工出发，用真实样片、完整研究图和可复用后期模板，整理人物、内容、剪辑与三维的制作方法及价值。'
entry['preview']['full_path']='projects/0021-avatar-video-workflow/assets/avatar-research-overview-v1.png'
entry['preview']['caption']='2026-11-17 本轮生成的研究全景图；点击顶部预览查看 3200×26588 完整 PNG。包含真实样片、14 个模块与 28 问，人物和原声来自 @tm_uchal；已实测与待验证分别标明。'
entry['highlights']=[
    '理解与思路：以14模块、28问的完整研究图，梳理模型、数字人平台、编排、内容与后期的分工，保留原作者声明、实测和判断的区别。',
    '实际效果：5秒抠像与字幕、5秒三维屏幕、10秒整合和6秒换配置片；保留连续原声与音画校对，人物仍是二维视频素材。',
    '复用价值：本次创建的后期模板可替换素材和文字，复用抠像与三维缓存；新人物、真实图表、上游生成和批量收益仍需进一步验证。',
    '阅读引导：先点击下图看完整全景，再进入网页播放样片、看制作方法与选型价值，最后使用配置导出和模板源码。'
]
entry['demo_url']=None
if any(x['id']==entry['id'] or x['slug']==entry['slug'] for x in registry['projects']):raise ValueError('Project already registered remotely')
registry['projects'].append(entry);registry['next_id']=max(registry['next_id'],int(entry['id'])+1)
(checkout/'projects.json').write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'checkout':str(checkout),'registered':[x['id'] for x in registry['projects']],'copied_project':ROOT.name}))
