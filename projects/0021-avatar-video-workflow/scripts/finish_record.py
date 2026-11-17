"""Preserve the observed UI checks and register only this new research project."""
from pathlib import Path
import hashlib,json

ROOT=Path(__file__).resolve().parents[1]
REPOSITORY=ROOT.parents[1]
def read(p):return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def save(p,obj):Path(p).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
record={
    'date':'2026-11-17','browser':'Codex in-app browser','mode':'local-only','published':False,
    'desktop':{'observed_widths':[1280,997],'horizontal_overflow':False,'screenshot':'assets/web-preview.jpg'},
    'mobile':{'width':390,'height':844,'pages':['index','effects','methods','value','template','sources'],'horizontal_overflow_on_any_page':False,'menu':'opened and navigated successfully'},
    'interactions':[
        {'name':'Input route selector','result':'Photo + script route showed missing upstream talking-video step'},
        {'name':'Workflow steps','result':'Step 6 showed Blender, synchronized screen input and the verified scene boundary'},
        {'name':'Presenter and chart layout','result':'Split layout selected; chart labelled as demonstration data'},
        {'name':'Provider filter','result':'Local-only selection showed exactly provider-local'},
        {'name':'Cost calculator','result':'Changing variants from 2 to 4 changed candidate seconds from 45 to 90 and hypothetical cost from USD 4.50 to USD 9.00'},
        {'name':'Config editor and real download','result':'Downloaded project.json with updated title, duration 8 seconds, 30 fps, and scaled caption timestamps; file read back and checked','evidence':'evidence/config-export.json'},
        {'name':'Question topic and expand','result':'Template filter showed 3 of 26 questions; all 3 expanded'},
        {'name':'Global search','result':'Cache search returned 3 matching discussion/source links'},
        {'name':'Effect filter','result':'3D filter showed exactly effect-screen and effect-city'},
        {'name':'Video chapter seek','result':'10-second video moved to 4.167 seconds; video width 1280, readyState 4, no media error'},
        {'name':'Actual playback','result':'Native player started and reached the 10-second end; no media error'},
        {'name':'Console','result':'No captured browser console errors at final inspection'}
    ],
    'not_claimed':['No subjective audio or aesthetic score','No new upstream API integration','No cross-identity avatar test','No public publishing']
}
save(ROOT/'browser-verification.json',record)
manifest=read(ROOT/'assets/image-manifest.json')
manifest=[x for x in manifest if x['file']!='web-preview.jpg']
manifest.append({'file':'web-preview.jpg','sha256':hashlib.sha256((ROOT/'assets/web-preview.jpg').read_bytes()).hexdigest(),
    'source':'2026-11-17 in-app browser screenshot of this local research website; source presenter @tm_uchal credited on page'})
save(ROOT/'assets/image-manifest.json',manifest)
registry=read(REPOSITORY/'projects.json')
project=next(x for x in registry['projects'] if x['id']=='0021' and x['slug']=='avatar-video-workflow')
project.update(status='validated',tags=['数字人口播','视频后期','工作流模板','三维场景','交互研究网页'],
    preview={'path':'projects/0021-avatar-video-workflow/assets/web-preview.jpg',
        'alt':'数字人口播制作研究网页实拍，左侧为工作流总览，右侧播放本轮10秒整合样片，提供效果、方法、价值与模板入口',
        'caption':'2026-11-17 本地网页截图；含本轮后期样片，原人物与原声来自 @tm_uchal。现有口播后期已验证，上游生成与事实图表未实现，未公开部署。'},
    highlights=[
        '完整整理：六个页面串起26个讨论问题、8项效果、8步制作链、6条选型路线与13个来源，作者声明、判断、实测与待验证内容分开标注。',
        '真实效果：原片、5秒抠像、5秒三维、10秒整合、6秒换配置和并排检查片；支持章节定位、效果筛选和大图查看。',
        '可复用价值：人物与图表布局示意、候选生成费用估算、实际JSON导出、模板源码下载与缓存证据；新台词仍需对应口播素材。'
    ])
assert project['demo_url'] is None
save(REPOSITORY/'projects.json',registry)
print(json.dumps({'registered':ROOT.name,'browser_checks':len(record['interactions']),'published':False}))
