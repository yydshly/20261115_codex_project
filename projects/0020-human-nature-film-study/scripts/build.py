"""Build only this research website, optionally adding it to local navigation."""
from pathlib import Path
from html import escape
import argparse
import hashlib
import importlib.util
import json
import os
import shutil

ROOT = Path(__file__).resolve().parents[1]

def e(value):
    return escape(str(value), quote=True)

def analysis_fragments(data):
    reference_cards = []
    for index, item in enumerate(data['reference_reading'], 1):
        reference_cards.append(f'''<article class="reading-card" id="reading-{e(item['id'])}"><span class="note-index">0{index} / 原参考分析</span><h3>{e(item['title'])}</h3><dl><dt>可核对的内容</dt><dd>{e(item['visible'])}</dd><dt>我们的解读</dt><dd>{e(item['reading'])}</dd><dt>带到创作中</dt><dd>{e(item['value'])}</dd></dl><p class="reading-boundary">{e(item['boundary'])}</p></article>''')
    understanding = ''.join(f'''<article class="understanding-card"><h3>{e(item['title'])}</h3><blockquote>“{e(item['quote'])}”</blockquote><p>{e(item['explanation'])}</p><p class="creative-meaning">{e(item['creative_meaning'])}</p></article>''' for item in data['understanding'])
    values = ''.join(f'<article><span class="note-index">0{i}</span><h3>{e(item["title"])}</h3><p>{e(item["text"])}</p></article>' for i,item in enumerate(data['value'],1))
    dialogue = ''.join(f'''<article class="dialogue-record" id="{e(item['id'])}"><div class="dialogue-label"><span class="note-index">{e(item['n'])}</span><span>{e(item['stage'])}</span></div><h3>{e(item['title'])}</h3><blockquote>{e(item['quote'])}</blockquote><span class="speaker">用户原话</span><dl><dt>这一步的理解</dt><dd>{e(item['analysis'])}</dd><dt>对创作的影响</dt><dd>{e(item['consequence'])}</dd></dl></article>''' for item in data['dialogue'])
    translation = ''.join(f'''<article class="translation-card"><span class="note-index">0{i}</span><h3>{e(item['principle'])}</h3><dl><dt>为什么</dt><dd>{e(item['why'])}</dd><dt>可作的选择</dt><dd>{e(item['choice'])}</dd><dt>本次试片</dt><dd>{e(item['trial'])}</dd></dl></article>''' for i,item in enumerate(data['creative_translation'],1))
    spring = ''.join(f'''<article><span class="note-index">0{i}</span><h3>{e(item['title'])}</h3><p>{e(item['examples'])}</p><p class="spring-meaning">{e(item['meaning'])}</p></article>''' for i,item in enumerate(data['spring_layers'],1))
    comparison = ''.join(f'<tr><th scope="row">{e(item["aspect"])}</th><td>{e(item["reference"])}</td><td>{e(item["trial"])}</td><td>{e(item["lesson"])}</td></tr>' for item in data['trial_comparison'])
    return {'REFERENCE_READINGS': ''.join(reference_cards), 'UNDERSTANDING':understanding,
            'VALUES':values, 'DIALOGUE':dialogue, 'TRANSLATION':translation,
            'SPRING_LAYERS':spring, 'TRIAL_COMPARISON':comparison,
            'BOUNDARIES':'<ul>'+''.join(f'<li>{e(item)}</li>' for item in data['boundaries'])+'</ul>'}

def analysis_markdown(data):
    ref = data['reference']
    lines = ['# '+data['title'], '', data['scope'], '', '更新：'+data['updated'], '',
             '## 原始参考', '', f'[@purelivn · {ref["caption"]}]({ref["url"]})', '',
             f'![{ref["image_caption"]}]({ref["image"]})', '', ref['review_scope'], '', ref['rights']]
    for item in data['reference_reading']:
        lines += ['', '### '+item['title'], '', '**可核对的内容**：'+item['visible'], '',
                  '**我们的解读**：'+item['reading'], '', '**带到创作中**：'+item['value'], '', item['boundary']]
    lines += ['', '## 我们确认的理解', '']
    for item in data['understanding']:
        lines += ['### '+item['title'], '', '> '+item['quote'], '', item['explanation'], '', item['creative_meaning'], '']
    lines += ['## 它给我们的价值', '']
    for item in data['value']:
        lines += ['### '+item['title'], '', item['text'], '']
    lines += ['## 从链接到创作：九次关键讨论', '', '引文为用户原话；解释与创作影响为本次复核归纳。', '']
    for item in data['dialogue']:
        lines += ['### '+item['n']+' · '+item['title'], '', item['stage'], '', '> '+item['quote'], '',
                  '**这一步的理解**：'+item['analysis'], '', '**对创作的影响**：'+item['consequence'], '']
    lines += ['## 从理解到创作选择', '']
    for item in data['creative_translation']:
        lines += ['### '+item['principle'], '', item['why'], '', '**可作的选择**：'+item['choice'], '', '**本次试片**：'+item['trial'], '']
    lines += ['## 写春的四个层次', '']
    for item in data['spring_layers']:
        lines += ['### '+item['title'], '', item['examples'], '', item['meaning'], '']
    lines += ['## 参考、试片与差距', '']
    for item in data['trial_comparison']:
        lines += ['### '+item['aspect'], '', '**参考与原理解**：'+item['reference'], '', '**实际试片**：'+item['trial'], '', '**得到的提醒**：'+item['lesson'], '']
    lines += ['## 研究边界', '']+['- '+item for item in data['boundaries']]
    return '\n'.join(lines)+'\n'

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site-preview', action='store_true')
    parser.add_argument('--publication', action='store_true', help='Export the authorized public research with verified Release videos')
    parser.add_argument('--media-archive', type=Path)
    args = parser.parse_args()
    if args.publication:
        from publication_media import hydrate
        hydrate(ROOT/'assets',args.media_archive or os.environ.get('HUMAN_NATURE_MEDIA_ARCHIVE'))
    research = json.loads((ROOT / 'research.json').read_text(encoding='utf-8'))
    production = json.loads((ROOT / 'production.json').read_text(encoding='utf-8'))
    analysis = json.loads((ROOT / 'analysis.json').read_text(encoding='utf-8'))
    manifest = json.loads((ROOT / 'assets/media-manifest.json').read_text(encoding='utf-8'))
    map_manifest = json.loads((ROOT / 'assets/understanding-map-manifest.json').read_text(encoding='utf-8'))
    for item in map_manifest['files']:
        if hashlib.sha256((ROOT/'assets'/item['file']).read_bytes()).hexdigest()!=item['sha256']:
            raise ValueError('Changed understanding map asset: '+item['file'])
    for media in manifest['videos']:
        path = ROOT / 'assets' / media['file']
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != media['sha256']:
            raise ValueError('Missing or changed video: '+media['file'])
    chapters = ''.join(f'<button class="chapter {"is-active" if i==0 else ""}" aria-pressed="{str(i==0).lower()}" aria-label="观看第{i+1}段：{e(x["title"])}"><img src="assets/stills/{e(x["image"])}.jpg" alt="" width="45" height="49" loading="lazy"><span><strong>{e(x["title"])}</strong><small>{e(x["observable"])}</small></span><time>00:00</time></button>' for i,x in enumerate(research['chapters']))
    themes = ''.join(f'<button id="theme-{e(x["id"])}" role="tab" aria-selected="{str(x["id"]=="spring").lower()}" aria-controls="theme-panel" data-theme="{e(x["id"])}" tabindex="{0 if x["id"]=="spring" else -1}">{e(x["name"])}</button>' for x in research['themes'])
    journey = ''.join(f'<article class="journey-item"><span class="journey-number">{e(x["n"])}</span><div class="journey-title"><span class="journey-tag">{e(x["tag"])}</span><h3>{e(x["title"])}</h3></div><div class="journey-body"><blockquote>“{e(x["quote"])}”</blockquote><span class="speaker">{e(x["speaker"])}</span><p>{e(x["note"])}</p></div></article>' for x in research['journey'])
    review = ''.join(f'<article class="review-card"><figure><button class="image-button" data-lightbox="assets/stills/{e(x["image"])}.jpg" data-caption="本次AI试片的实际抽帧；{e(x["title"])}"><img src="assets/stills/{e(x["image"])}.jpg" loading="lazy" width="720" height="1280" alt="{e(x["fact"])}"></button><figcaption class="review-range">{e(x["range"])}</figcaption></figure><h3>{e(x["title"])}</h3><dl><dt>实际画面</dt><dd>{e(x["fact"])}</dd><dt>创作判断</dt><dd>{e(x["judgment"])}</dd><dt>本次重剪测试</dt><dd>{e(x["test"])}</dd></dl></article>' for x in research['review'])
    short_names = ['人物','嫩叶','湿土','水流','柳树','全景']
    rhythm = ''
    for version in research['versions']:
        segments = ''.join(f'<button class="rhythm-segment tone-{i}" style="flex:{duration}" data-rhythm-version="{version["id"]}" data-chapter="{i}" title="{e(short_names[i])} · {duration:g}秒" aria-label="定位{e(version["title"])}第{i+1}段{e(short_names[i])}，{duration:g}秒"><span>{i+1:02}</span><span class="segment-name"> {e(short_names[i])}</span></button>' for i,duration in enumerate(version['durations']))
        rhythm += f'<div class="rhythm-row"><span>{e(version["title"])}</span><div class="rhythm-bar" aria-label="{e(version["title"])}时间分配">{segments}</div><strong>{version["duration"]}秒</strong></div>'
    legend = ''.join(f'<span><i class="tone-{i}" aria-hidden="true"></i>{i+1:02} {e(name)}</span>' for i,name in enumerate(short_names))
    checks = '<ol>'+''.join(f'<li>{e(text)}</li>' for text in research['checks'])+'</ol>'
    shots = ''
    costs = ''
    for x in production['shots']:
        sid = x['id']
        shots += f'''<details class="shot-record" id="shot-{sid}" {'open' if sid=='01' else ''}><summary><span>{sid}</span><h3>{e(x['title'])}</h3><small>{x['duration']}秒 · {x['credits']:g}积分</small><span aria-hidden="true">+</span></summary><div class="shot-body"><div class="shot-video"><video controls playsinline preload="none" poster="{e(x['poster'])}" aria-label="播放第{sid}镜生成原片"><source src="{e(x['video'])}" type="video/mp4"></video><a href="{e(x['video'])}" download="多停一会儿-原始镜头{sid}.mp4">下载本镜播放副本 ↓</a></div><div class="prompt-record"><div class="prompt-heading"><span>实际提交文本 · 任务 {e(x['task_id'])}</span><button class="copy-button" data-copy="prompt-{sid}">复制提示词</button></div><pre id="prompt-{sid}" tabindex="0" aria-label="第{sid}镜实际提示词">{e(x['prompt'])}</pre><div class="prompt-links"><a href="{e(x['prompt_file'])}" download>下载原始提示词 TXT ↓</a><a href="index.html#watch">回到整片 →</a></div></div></div></details>'''
        costs += f'<tr><th scope="row">{sid} · {e(x["title"])}</th><td>{e(x["task_id"])}</td><td>{x["duration"]}秒</td><td>{x["credits"]:g}</td></tr>'
    replacements = {'CHAPTERS':chapters,'THEME_TABS':themes,'JOURNEY':journey,'REVIEW':review,'RHYTHM':rhythm,'LEGEND':legend,'CHECKS':checks,'SHOTS':shots,'COST_ROWS':costs,'DATA':json.dumps(research,ensure_ascii=False).replace('<','\\u003c')}
    replacements.update(analysis_fragments(analysis))
    replacements['MAP_DIMENSIONS']=f'{map_manifest["width"]} × {map_manifest["height"]}'
    (ROOT/'ANALYSIS.md').write_text(analysis_markdown(analysis),encoding='utf-8',newline='\n')
    dest = ROOT / 'dist'
    dest.mkdir(exist_ok=True)
    for name in ('index.html','analysis.html','archive.html'):
        text = (ROOT / 'web' / name).read_text(encoding='utf-8')
        for key,value in replacements.items():
            text = text.replace('@@'+key+'@@', value)
        if '@@' in text:
            raise ValueError('Unresolved template field in '+name)
        (dest / name).write_text(text,encoding='utf-8',newline='\n')
    for name in ('styles.css','app.js','mark.svg'):
        shutil.copy2(ROOT / 'web' / name, dest / name)
    shutil.copytree(ROOT / 'assets', dest / 'assets', dirs_exist_ok=True)
    for name in ('research.json','analysis.json','ANALYSIS.md','understanding-map.json','production.json','verification.json','README.md','THIRD_PARTY_NOTICES.md','publication-media.json'):
        shutil.copy2(ROOT / name,dest / name)
    files = [{'path':p.relative_to(dest).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(dest.rglob('*')) if p.is_file() and p.name!='build-manifest.json']
    (dest/'build-manifest.json').write_text(json.dumps({'project':ROOT.name,'published':args.publication,'mode':'publication' if args.publication else 'local-only','files':files},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if args.site_preview:
        repo = ROOT.parents[1]
        spec = importlib.util.spec_from_file_location('research_site',repo/'scripts/build_site.py')
        site = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(site)
        output = repo / '_site'
        shutil.copytree(dest, output/'demos'/ROOT.name, dirs_exist_ok=True)
        local_projects = getattr(site,'LOCAL_RESEARCH_PROJECTS',{})
        entries = {site.SLUG:'summary.html',**site.STATIC_PROJECTS,**local_projects}
        available = {slug for slug,entry in entries.items() if (output/'demos'/slug/entry).is_file()}
        navigation = site.navigation(local_projects,available) if local_projects else site.navigation()
        (output/'index.html').write_text(navigation,encoding='utf-8',newline='\n')
    print(json.dumps({'project':ROOT.name,'entry':str(dest/'index.html'),'pages':3,'videos':len(manifest['videos']),'published':args.publication},ensure_ascii=False))

if __name__ == '__main__':
    main()
