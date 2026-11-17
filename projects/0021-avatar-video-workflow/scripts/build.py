"""Build six local research pages and a portable template package (standard library)."""
from pathlib import Path
from html import escape as e
import argparse,hashlib,importlib.util,json,shutil,zipfile

ROOT=Path(__file__).resolve().parents[1]
R=json.loads((ROOT/'research.json').read_text(encoding='utf-8'))
PAGES=[('index','总览'),('effects','效果实录'),('methods','制作方法'),('value','选型与价值'),('template','复用模板'),('sources','讨论与证据')]
M={x['id']:x for x in R['media']}
PUBLIC=False

def pill(text,kind=''):return f'<span class="pill {kind}">{e(text)}</span>'
def refs(ids):return '<div class="source-links">'+''.join(f'<a href="sources.html#{e(x)}">{e(next((s["title"] for s in R["sources"]+R["evidence"] if s["id"]==x),x))} ↗</a>' for x in ids)+'</div>'
def section(n,title,description='',id=''):
    return f'<div class="section-heading"'+(f' id="{e(id)}"' if id else '')+f'><span>{e(n)}</span><div><h2>{title}</h2>'+ (f'<p>{e(description)}</p>' if description else '')+'</div></div>'
def table(heads,rows):
    return '<div class="table-scroll" tabindex="0"><table><thead><tr>'+''.join(f'<th>{e(h)}</th>' for h in heads)+'</tr></thead><tbody>'+''.join('<tr>'+''.join(f'<td>{e(str(c))}</td>' for c in row)+'</tr>' for row in rows)+'</tbody></table></div>'
def image(name,alt,caption='',class_name=''):
    return f'<figure class="figure {class_name}"><button class="image-button" data-lightbox="assets/{e(name)}" data-caption="{e(caption or alt)}" aria-label="放大：{e(alt)}"><img src="assets/{e(name)}" alt="{e(alt)}" loading="lazy"></button>'+ (f'<figcaption>{e(caption)}</figcaption>' if caption else '')+'</figure>'
def video(id,feature=False):
    x=M[id]
    if PUBLIC and id in ('reference','comparison'):
        note='原作品由原作者的帖子提供。' if id=='reference' else '并排检查片保留静帧；公开播放使用本项目制作的四段后期样片。'
        return f'<div class="reference-entry"><img src="assets/{e(x["poster"])}" alt="{e(x["title"])}静帧" loading="lazy"><p>{note}</p><a class="button secondary" href="https://x.com/tm_uchal/status/2120573380768518390" target="_blank" rel="noreferrer">观看原作者参考片 ↗</a></div>'
    error='视频暂时无法加载，可稍后重试或查看制作分镜。' if PUBLIC else '本机视频尚未连接。请按 README 运行素材登记和本地预览服务。'
    return f'<div class="video-wrap {"featured-video" if feature else ""}"><video id="video-{id}" controls playsinline preload="{"metadata" if feature else "none"}" poster="assets/{e(x["poster"])}" aria-label="{e(x["title"])}"><source src="media/{e(x["file"])}" type="video/mp4">浏览器不支持视频播放。</video><p class="media-error" hidden>{error}</p></div>'
def media_card(id):
    x=M[id]
    return f'<article class="media-card" id="sample-{id}">{video(id)}<div class="media-copy"><div class="eyebrow">{e(x["eyebrow"])} {pill(x["state"])}</div><h3>{e(x["title"])}</h3><p>{e(x["description"])}</p><p class="proof">{e(x["proof"])}</p><p class="small">{e(x["limit"])}</p>{refs([x["source"]])}</div></article>'
def lead(kicker,title,description):return f'<section class="page-lead wrap"><p class="eyebrow">{e(kicker)}</p><h1>{title}</h1><p class="lead-description">{e(description)}</p></section>'

def home():
    overview=''
    if (ROOT/'assets/overview-manifest.json').is_file():
        overview_record=json.loads((ROOT/'assets/overview-manifest.json').read_text(encoding='utf-8'))
        overview=f'''<section class="section" id="overview">{section('00','理解、研究与价值，放进一张完整图。','14 个模块，完整展开效果、制作思路、模板来历与后续意义；包含原来 26 问和最近两次澄清。')}<div class="overview-layout"><figure class="figure"><button class="image-button" data-lightbox="assets/avatar-research-overview-v1.png" data-caption="数字人口播研究全景图 · 3200×{overview_record['height']} · 顶部仅为封面，点击可滚动查看全图" aria-label="展开数字人口播研究完整长图"><img src="assets/overview-preview.jpg" alt="研究全景图顶部预览，完整图片包含14个模块和28个问题" loading="lazy"></button><figcaption>顶部预览；完整图 {overview_record['width']}×{overview_record['height']}，放大阅读。</figcaption></figure><div class="overview-copy"><span class="pill">一张图 / 可保存 / 中文可校对</span><h3>从“能不能做”，<br>到“怎样反复做”。</h3><p>真实样片、四层能力、八项效果、八步流程、人物与图表布局、平台选型、模板机制、三层价值和后续验证放在一起。</p><p class="small">图中 28 问含网页已有的 26 问，以及“模板怎么出现”和“最大价值是否只是复用”的两次最新澄清。技术通过、潜在收益和未验证能力分别标明。</p><div class="actions"><a class="button primary" href="assets/avatar-research-overview-v1.png" target="_blank" rel="noreferrer">打开高清 PNG ↗</a><a class="button secondary" href="assets/avatar-research-overview-v1.svg" target="_blank" rel="noreferrer">查看矢量 SVG ↗</a></div><a class="text-link" href="overview-summary.json">可修订的图文总纲 ↗</a></div></div></section>'''
    layers=''.join(f'<article class="layer"><span class="big-number">{x["n"]}</span><h3>{e(x["title"])}</h3><p class="accent">{e(x["role"])}</p><p>{e(x["detail"])}</p><dl><dt>输入</dt><dd>{e(x["input"])}</dd><dt>交付</dt><dd>{e(x["output"])}</dd></dl>{pill(x["status"])}</article>' for x in R['layers'])
    values=''.join(f'<article class="value-summary"><span>0{i}</span><h3>{e(x["title"])}</h3><p>{e(x["after"])}</p><small>{e(x["evidence"])}</small></article>' for i,x in enumerate(R['values'][:3],1))
    entries=[('effects','效果实录','实际成片与逐项拆解','播放四类样片，观察人物边缘、字幕、转场和三维空间。'),('methods','制作方法','从素材到完整表达','理解人物与内容的分配，以及先口播、先音轨和分镜驱动的差异。'),('value','选型与价值','把钱和时间花在哪里','比较模型、平台和自建流程，估算候选生成与重复制作的成本。'),('template','复用模板','开始下一条视频','调整素材与文案，导出可用配置，下载模板源码。')]
    return f'''<section class="hero wrap"><div class="hero-copy"><p class="eyebrow">021 / AVATAR VIDEO WORKFLOW</p><h1>让人物，<br>进入<span>表达。</span></h1><p class="hero-description">从一段口播，到抠像、字幕、转场与三维空间。把一次尝试，整理成能看懂、能复用、能继续验证的制作流程。</p><div class="actions"><a class="button primary" href="effects.html">观看实际样片 <span>↗</span></a><a class="button secondary" href="template.html">使用这套模板 →</a></div><p class="hero-note"><i></i>已有口播的后期已跑通 · 上游生成服务未接入</p></div><div class="hero-stage">{video('complete',True)}<div class="stage-label"><span>LOCAL COMPOSITION / 01</span><b>10 秒完整样片</b><span>720p · 24 fps</span></div><p class="small">人物与原声来自 @tm_uchal；中文是效果示意文案，非原声译文。</p></div></section>
<div class="wrap"><div class="metrics"><div><strong>4<span>类</span></strong><p>实际制作验证</p></div><div><strong>8<span>项</span></strong><p>效果与内容层拆解</p></div><div><strong>26<span>问</span></strong><p>讨论、判断与边界</p></div><div><strong>1<span>套</span></strong><p>可运行的复用模板</p></div></div>{overview}
<section class="section">{section('01','先把能力，放回正确的位置。','数字人视频是多层能力的组合。模型可以生成素材，工作流负责把内容变成一段连贯表达。')}<div class="layers">{layers}</div><aside class="note"><b>这次真正做到了什么</b><p>用已有同步口播视频，完成可编辑的本地后期与模板化导出。还没有证明数字人平台可以全部替代，也没有自动生成新的台词、声音或事实图表。</p><a href="sources.html#evidence">看实测记录 →</a></aside></section>
<section class="section">{section('02','看得见的结果，才是讨论的依据。','从单项效果到整段视频，再到换配置测试。所有画面都是已经保存的真实输出。')}<div class="sample-links">{''.join(f'<a href="effects.html#sample-{id}"><img src="assets/{M[id]["poster"]}" alt="{e(M[id]["title"])}" loading="lazy"><div><span>{M[id]["duration"]:g} SEC / {M[id]["fps"]} FPS</span><h3>{e(M[id]["title"])}</h3><p>{e(M[id]["description"])}</p></div></a>' for id in ('matting','scene','complete','template'))}</div></section>
<section class="section">{section('03','对我们最直接的价值。','先把重复劳动变成稳定流程，再按需要扩展人物、声音和内容能力。')}<div class="value-grid">{values}</div><a class="text-link" href="value.html#our-value">展开全部六项价值与限制 ↗</a></section>
<section class="section">{section('04','从哪里继续。','按你现在手里的素材和问题，进入对应部分。')}<div class="reading-grid">{''.join(f'<a class="reading-card" href="{key}.html"><span>{e(label)} ↗</span><h3>{e(title)}</h3><p>{e(detail)}</p></a>' for key,label,title,detail in entries)}</div></section>
<aside class="update-note"><span>资料复核 / 2026.11.17</span><h3>历史参考和当前接口，要分别看。</h3><p>Google 当前文档已经把 Gemini API 中的 Veo 3.1 Preview 列为下线接口。Google Cloud 的 GA 型号是另一入口；不能直接复制早期 Preview 示例或单价。</p>{refs(['google-video','google-deprecations','google-cloud'])}</aside></div>'''

def effects():
    steps=''.join(f'<button data-seek="{x["start"]}" data-video="video-complete"><span>{x["start"]:g}–{x["end"]:g}s</span><b>{e(x["title"])}</b></button>' for x in R['timeline'])
    tiles=''.join(f'<article class="effect-card" id="effect-{x["id"]}" data-effect-group="{e(x["group"])}"><img src="assets/{x["image"]}" alt="{e(x["title"])}的实际样片或分镜" loading="lazy"><div>{pill(x["state"],"pending" if x["state"]!="已实测" else "")}<h3>{e(x["title"])}</h3><p>{e(x["method"])}</p><dl><dt>作用</dt><dd>{e(x["value"])}</dd><dt>怎么看</dt><dd>{e(x["inspect"])}</dd></dl><p class="small">{e(x["limit"])}</p></div></article>' for x in R['effects'])
    return lead('EFFECTS / 01','先看效果，<br><span>再看实现。</span>','原始参考、单项试验、完整整合与模板复用放在一起。播放后再判断边缘、空间和节奏，而不是只看工具名称。')+f'''<div class="wrap"><section class="section compact" id="sample-complete">{section('01','10 秒，串成一个完整段落。','点击时间节点可以定位画面。人物在不同镜头里跟随同一段原声时间更新。')}{video('complete',True)}<div class="chapter-buttons">{steps}</div><div class="chapter-explanation" aria-live="polite">{e(R['timeline'][0]['detail'])}</div><div class="two-notes"><p><b>完成：</b>{e(M['complete']['proof'])}</p><p><b>范围：</b>{e(M['complete']['limit'])}</p></div></section>
<section class="section">{section('02','拆开验证，再组合。','局部样片侧重看问题；6 秒蓝绿版验证更换输入与配置后的流程。')}<div class="media-grid">{''.join(media_card(id) for id in ('matting','scene','template','comparison'))}</div></section>
<section class="section">{section('03','把每项效果的作用说清楚。','已实测与方案待实现分别标注。图表分配还没有进入当前成片模板。')}<div class="filters" role="group" aria-label="效果类别筛选">{''.join(f'<button data-effect-filter="{g}" aria-pressed="{str(g=="全部").lower()}" class="{"selected" if g=="全部" else ""}">{g}</button>' for g in ('全部','平面','内容','节奏','三维'))}</div><div class="effects-grid">{tiles}</div><p class="filter-result small" aria-live="polite">显示 8 项效果与内容层。</p></section>
<section class="section" id="reference">{section('04','原片提供参照，不替代我们的验证。','以下是 @tm_uchal 的原作品。本轮仅作本地效果研究，没有公开分发。')}{media_card('reference')}<div class="image-pair">{image('reference-city.jpg','原片约 15 秒处的三维场景','原作者参考帧，约 15 秒；不是我们制作的场景。')}{image('scene-poster.jpg','本轮独立构建的三维屏幕场景','本地 Blender 独立实现；没有原工程，未做逐帧复刻。')}</div></section>
<section class="section">{section('05','按整段节奏回看。','静态分镜用于快速核对构图与镜头顺序，不能代替动态观看。')}{image('complete-storyboard.jpg','10 秒整合片的八个画面节点','本轮实际成片分镜；中文为效果示意，非原声翻译。')}{image('template-storyboard.jpg','6 秒换配置验证片的八个画面节点','同一人物的新竖幅输入，30 fps、蓝绿配色与替换文案。')}</section></div>'''

def methods():
    routes=''.join(f'<button class="{"selected" if i==0 else ""}" data-route="{x["id"]}" aria-pressed="{str(i==0).lower()}"><span>0{i+1}</span>{e(x["title"])}</button>' for i,x in enumerate(R['routes']))
    stages=''.join(f'<button data-stage="{i}" class="{"selected" if i==0 else ""}" aria-pressed="{str(i==0).lower()}"><span>0{i+1}</span>{e(x["title"])}</button>' for i,x in enumerate(R['workflow']))
    steps=''.join(f'<details class="detail"><summary><span>0{i+1} / {e(x["title"])}</span>{pill(x["tools"])}</summary><dl><dt>输入</dt><dd>{e(x["input"])}</dd><dt>输出</dt><dd>{e(x["output"])}</dd><dt>主要风险</dt><dd>{e(x["risk"])}</dd><dt>本轮状态</dt><dd>{e(x["verified"])}</dd></dl></details>' for i,x in enumerate(R['workflow']))
    return lead('METHOD / 02','先组织内容，<br><span>再组织画面。</span>','并非所有视频都要先生成整段人物，再统一加效果。真正需要保持一致的是内容、原声、字幕和镜头的时间关系。')+f'''<div class="wrap"><section class="section compact" id="routes">{section('01','从你已经拥有的素材开始。','选择一种输入，查看还缺什么，以及当前流程能直接承接哪些工作。')}<div class="route-selector" role="group" aria-label="选择制作起点">{routes}</div><div id="route-detail" class="route-detail"></div></section>
<section class="section">{section('02','完整制作链。','点击步骤看输入与交付；下方保留全部细节，便于完整阅读。')}<div class="workflow-buttons" role="group" aria-label="制作步骤">{stages}</div><div class="workflow-panel" id="stage-detail"></div><div class="details-list">{steps}</div></section>
<section class="section" id="layouts">{section('03','人物和内容，应该怎样分配？','人物建立信任与连接，图表承担精确比较。下面是网页布局示意，尚未接入模板的事实图表生产。')}<div class="layout-tabs filters" role="group" aria-label="内容布局">{''.join(f'<button data-layout="{key}" class="{"selected" if i==0 else ""}" aria-pressed="{str(i==0).lower()}">{name}</button>' for i,(key,name) in enumerate([('presenter','人物主讲'),('split','左右分屏'),('chart','图表全屏'),('screen','三维屏幕意向')]))}</div><div class="layout-demo is-presenter" id="layout-demo"><div class="layout-copy"><span>LAYOUT STUDY / 仅示意</span><h3>先说明观点，<br>再展示依据。</h3><p>图形里的 42 / 65 / 84 是演示数据，不对应原声。</p></div><div class="demo-chart"><span>示例指标 · 非事实数据</span><svg viewBox="0 0 420 250" role="img" aria-label="演示数据 A 42，B 65，C 84"><line x1="35" y1="205" x2="400" y2="205" stroke="currentColor" opacity=".2"/><rect x="70" y="121" width="60" height="84" rx="3"/><rect x="185" y="75" width="60" height="130" rx="3"/><rect x="300" y="37" width="60" height="168" rx="3"/><g fill="currentColor" class="chart-labels"><text x="100" y="110">42</text><text x="215" y="64">65</text><text x="330" y="26">84</text><text x="100" y="235">A</text><text x="215" y="235">B</text><text x="330" y="235">C</text></g></svg></div><div class="demo-presenter"><img src="assets/presenter.png" alt="来自本轮素材的人物透明抠像"></div><div class="demo-subtitle">这里展示布局关系，未生成新的视频或事实图表。</div></div><p class="layout-explanation" aria-live="polite"></p>
{table(['布局','适合的表达','人物与内容的关系','需要避免'],[('人物主讲','引入、解释、收尾','人物为主要视觉中心','长时间无信息变化'),('左右分屏','讲解单个数据或步骤','人物与内容各有稳定区域','图表被缩得无法阅读'),('全屏图表','密集比较、趋势与证据','人物暂时离场，声音继续','为了保留人物而遮住关键数值'),('画中画 / 屏幕','需要连续陪伴或空间感','人物处于较小区域或场景屏幕','小嘴型和装饰抢过内容')])}</section>
<section class="section">{section('04','四种可选的制作顺序。','先后次序服务于任务，不能把某一种示例当成所有视频的标准。')}<div class="recipe-grid"><article><span>A / 当前已做</span><h3>现成口播 → 后期</h3><p>先有准确音画，再布置字幕、转场和三维。适合复用已有角色素材。</p></article><article><span>B / 可选路线</span><h3>脚本 → 音轨 → 分镜</h3><p>先锁台词、时长与重音，再分段生成或组织人物和内容镜头。</p></article><article><span>C / 可选路线</span><h3>分镜 → 多段人物与素材</h3><p>逐镜头处理表演，候选更多，但身份和声音衔接需要额外控制。</p></article><article><span>D / 内容优先</span><h3>人物引入 → 图表主体</h3><p>口播持续，人物不必持续出现；准确图表和素材承担大部分信息。</p></article></div></section>
<section class="section" id="accuracy">{section('05','准确内容，要留在可校验的层。','这是事实类视频的建议控制方式；当前模板只实现了其中的文字与时间校验。')}<ol class="number-list"><li><b>先锁来源与口径。</b>记录数据出处、时间范围、单位与计算方式。</li><li><b>再锁真实台词。</b>字幕必须对应实际声音，不能只改文字假装换了口播。</li><li><b>由程序绘图。</b>数字、表格和图形从结构化数据输出，而不是依赖模型把字“画对”。</li><li><b>把图表绑定句子。</b>显式定义开始、结束、布局与数据版本。</li><li><b>分开检查三件事。</b>事实是否正确、视觉是否保真、声音与画面是否同一时刻。</li></ol><pre class="code-block"><code>{e(json.dumps({'start':2.4,'end':4.2,'layout':'split','presenter':True,'content':{'type':'bar_chart','data_source':'已核对的数据文件'},'caption':'使用与原声一致的真实文案'},ensure_ascii=False,indent=2))}</code></pre><p class="small">以上为内容时间轴扩展示意，不是当前模板已有的图表 API。</p></section>
<section class="section">{section('06','这次实际遇到的两个问题。','工作流需要识别输入的剪辑结构，而不是机械地把片段拼起来。')}<div class="two-notes"><article><h3>两段小样不能直接接音轨</h3><p>两个 5 秒片都用原片前 5 秒声音，直接拼接会重复台词。整合版改为连续 0–10 秒音轨，并让各镜头读取对应源时间。</p></article><article><h3>纯文字镜头会影响循环抠像</h3><p>原片约 8 秒切到文字。整合版用关键词卡承接，9 秒人物回归时重置 RVM 状态，避免前一镜头污染人物轮廓。</p></article></div></section></div>'''

def value():
    providers=''.join(f'<article class="provider" id="provider-{x["id"]}" data-provider="{x["id"]}"><div class="provider-header"><div><p class="eyebrow">{e(x["type"])}</p><h3>{e(x["name"])}</h3></div>{pill(x["state"],"pending" if x["id"]!="local" else "")}</div><p class="provider-role">{e(x["role"])}</p><dl><dt>适合</dt><dd>{e(x["use"])}</dd><dt>边界</dt><dd>{e(x["boundary"])}</dd></dl><details><summary>接入与费用说明</summary><p>{e(x["access"])}</p><p>{e(x["pricing"])}</p></details>{refs(x["sources"])}</article>' for x in R['providers'])
    values=''.join(f'<article class="value-detail"><span>0{i}</span><div><h3>{e(x["title"])}</h3><div class="before-after"><p><small>原来的工作</small>{e(x["before"])}</p><p><small>沉淀后的变化</small>{e(x["after"])}</p></div><p class="proof">{e(x["evidence"])}</p><p class="small">{e(x["limit"])}</p></div></article>' for i,x in enumerate(R['values'],1))
    return lead('CHOICE & VALUE / 03','价值在于，<br><span>持续把内容做出来。</span>','模型能力、平台产品和自己的工作流各有分工。比较实际交付、修改成本与质量边界，比只比较一段生成视频更有意义。')+f'''<div class="wrap"><section class="section compact" id="providers">{section('01','选型先分层，再看组合。','以下是适用思路与官方能力范围，不是六个平台的效果横评。本轮只跑通最后一条本地后期路线。')}<div class="filters" role="group" aria-label="平台与路线筛选"><button data-provider-filter="all" class="selected" aria-pressed="true">全部</button><button data-provider-filter="models" aria-pressed="false">视频模型与入口</button><button data-provider-filter="platforms" aria-pressed="false">创作与数字人平台</button><button data-provider-filter="local" aria-pressed="false">本地已实测</button></div><div class="provider-grid">{providers}</div></section>
<section class="section" id="our-value">{section('02','我们的六项具体收益。','每一项同时保留实测依据和不能推出的结论。没有用一次样片虚构规模化 ROI。')}<div class="value-details">{values}</div></section>
<section class="section" id="cost">{section('03','算候选总量，再算费用。','下面的单价是自填假设，不是任何平台的现价。只估算生成接口部分，其他成本需要另计。')}<div class="calculator"><form id="cost-form"><label>生成片段数<input name="shots" type="number" min="0" max="1000" value="3" step="1"></label><label>每段时长（秒）<input name="seconds" type="number" min="1" max="60" value="5" step="1"></label><label>每段候选数<input name="variants" type="number" min="1" max="20" value="2" step="1"></label><label>平均重试率（%）<input name="retry" type="number" min="0" max="1000" value="50" step="10"></label><label>假设单价（USD / 秒）<input name="price" type="number" min="0" max="100" value="0.1" step="0.01"></label><label>制作条数<input name="count" type="number" min="1" max="1000" value="1" step="1"></label></form><div class="cost-result" aria-live="polite"><span>假设的生成接口费用</span><strong id="cost-total">$4.50</strong><p id="cost-seconds">预计生成 45 秒候选素材</p><p class="small">片段数 × 时长 × 候选数 ×（1 + 重试率）× 条数 × 单价。</p></div></div><div class="two-notes"><p><b>另计：</b>脚本模型、TTS、平台订阅、存储、渲染、音乐与素材授权、人工选片与审校。本轮没有完整统计这些成本。</p><p><b>已有口播：</b>上游生成秒数可以为 0，但本地后期仍有算力和制作成本。改字幕复用缓存是计算复用，不等于整条视频没有成本。</p></div>{refs(['google-pricing','heygen','seedance'])}</section>
<section class="section">{section('04','什么已经可用，什么还值得验证。','按实际使用顺序推进，避免同时接入所有供应商和全部特效。')}{table(['阶段','交付目标','当前状态','验收依据'],[('当前','已有口播 → 完整包装片','已实现','多段样片、模板片与校验记录'),('下一步','第二、第三个人物与正式字幕','待验证','发丝、手势、台词、手机阅读与声音连续性'),('内容扩展','人物与真实图表的时间轴分配','方案','来源、单位、准确数值与句子对应'),('按需接入','一种上游口播生成服务','未接入','身份、中文、口型、计费、失败重试'),('长期','批量栏目生产与协作审片','未验证','成功率、修改次数、审校工时与综合成本')])}</section></div>'''

def template():
    return lead('REUSABLE TEMPLATE / 04','把下一条，<br><span>交给同一套流程。</span>','模板已经保存为 avatar-motion-template。输入同步口播视频，修改配置，再自动执行抠像、字幕、场景、转场和成片导出。')+f'''<div class="wrap"><section class="section compact">{section('01','替换入口，而不是重写一遍。','当前网页可以真实导出 JSON 配置；制作仍由本机 Python 和 Blender 执行。')}<div class="template-notice"><b>给 Codex 的一句话</b><p>用 <code>$avatar-motion-template</code>，把这段人物视频和下面的文案做成 10 秒成片，沿用上次的风格。</p></div><div class="template-editor"><form id="template-form"><label>人物视频文件名<input name="video" value="presenter.mp4" maxlength="160" required><small>视频和下载的 project.json 放在同一任务目录。</small></label><div class="form-row"><label>标题第一行<input name="title1" value="留住人物，" maxlength="24"></label><label>标题第二行<input name="title2" value="打开画面。" maxlength="24"></label></div><label>场景段字幕<input name="caption" value="让镜头，把空间打开。" maxlength="64"></label><div class="form-row"><label>片长（秒）<input name="duration" type="number" min="5" max="30" step="1" value="10"></label><label>帧率<select name="fps"><option>24</option><option>30</option><option>60</option></select></label></div><div class="form-row color-row"><label>背景色<input name="paper" type="color" value="#f3eee3"></label><label>强调色<input name="accent" type="color" value="#ca3946"></label><label>白描边（px）<input name="outline" type="number" min="0" max="20" value="7"></label></div><div class="form-row"><label>收尾第一行<input name="outro1" value="同一人物，" maxlength="24"></label><label>收尾第二行<input name="outro2" value="多种呈现。" maxlength="24"></label></div><div class="actions"><button type="submit" class="button primary">下载 project.json ↓</button><button type="button" id="copy-command" class="button secondary">复制运行命令</button></div><p id="config-message" class="small" role="status">预设字幕随片长缩放；不进行语音识别或自动对齐。</p></form><div class="editor-preview"><div class="config-preview" id="config-preview"><div><span>STYLE PREVIEW</span><h3><span id="preview-title1">留住人物，</span><em id="preview-title2">打开画面。</em></h3><p>参考人物仅演示构图和配色。</p></div><img src="assets/presenter.png" alt="参考人物的静态布局预览"></div><p class="small">此处是网页静态布局预览，没有读取新视频，也没有生成新台词或三维画面。</p><details class="json-detail"><summary>查看将导出的完整配置</summary><pre id="config-json" class="code-block"></pre></details></div></div></section>
<section class="section">{section('02','下载与本机执行。','模板源代码、预设和说明完整保留；视频原片与模型权重不包含在下载包中。')}<div class="download-grid"><a href="downloads/avatar-motion-template-v1.zip" download><span>可复用源代码</span><h3>模板程序包 ↙</h3><p>人物提取、三维、合成、验证与技能说明。</p></a><a href="downloads/copy.example.json" download><span>只换画面文字</span><h3>文案 JSON 示例 ↙</h3><p>标题、说明、关键词、字幕与收尾。</p></a><a href="downloads/captions.example.srt" download><span>示意文字 / 非原声译文</span><h3>SRT 格式示例 ↙</h3><p>使用正式字幕时，替换为真实时间与台词。</p></a></div><pre class="code-block"><code>python "D:/codex/home/skills/avatar-motion-template/scripts/avatar_video.py" init --job-dir "你的任务目录" --video "人物口播.mp4"
python "D:/codex/home/skills/avatar-motion-template/scripts/avatar_video.py" run --config "你的任务目录/project.json"</code></pre><p>如果直接下载了本页配置，将口播视频和 <code>project.json</code> 放到同一目录，使用第二条命令即可。新机器需要先配置 Python 依赖、Blender、RVM 模型与中文字体。</p><div class="actions"><a class="text-link" href="template/avatar-motion-template/references/configuration.md">完整字段、环境与用法 ↗</a><a class="text-link" href="template/avatar-motion-template/SKILL.md">查看技能说明 ↗</a></div></section>
<section class="section">{section('03','哪些参数，控制哪些结果。','默认布局为 16:9、720p。模板代码支持 5–180 秒；本轮只实际验证了 5、6、10 秒范围。')}{table(['配置','可以改变','是否涉及重算'],[('source','人物视频、取片起点、时长、人物区域','更新抠像及相关场景'),('copy','标题、逐字字幕、关键词、收尾','复用抠像与三维，只重新合成'),('style','背景、字体、强调色、白边、屏幕底色','二维部分直接合成；屏幕色变化更新三维'),('timeline','出现人物、转入场景、关键词与回归的时间比例','依变化更新相关片段'),('scene','相机位置、灯带颜色、采样与设备','更新三维'),('runtime','Blender、RVM、字体路径','环境配置；不应放入 API Key')])}</section>
<section class="section">{section('04','每条片，都留下可回查的结果。','最新结果由 latest.json 指向，每次导出使用新时间戳目录。')}<pre class="code-block"><code>任务目录/
  project.json          输入、文字和参数
  cache/                分开的抠像与三维缓存
  latest.json           最新成片入口
  outputs/时间戳/
    video.mp4           最终成片
    preview.gif         无声快速预览
    storyboard.jpg      实际输出分镜
    project.resolved.json
    manifest.json       素材与模型哈希、参数、缓存状态
    verification.json   解码、帧数、时长、音轨偏移检查
    scene/              可编辑场景及相对路径贴图</code></pre></section>
<aside class="note"><b>输入仍然需要“已经会说话”的视频。</b><p>更换实际台词，需要先提供对应口播素材。当前模板不做照片开口、TTS、唇形重建、事实核验或自动图表；这些是独立的上游或内容层扩展。</p></aside></div>'''

def sources():
    questions=''.join(f'<details class="faq detail" id="q-{i+1}" data-topic="{e(x["topic"])}"><summary><span><small>{i+1:02} / {e(x["topic"])} </small>{e(x["q"])}</span></summary><p>{e(x["a"])}</p><p class="takeaway">{e(x["take"])}</p>{pill(x["state"])}</details>' for i,x in enumerate(R['questions']))
    evidence=''.join(f'<article class="evidence-card" id="{x["id"]}"><span class="eyebrow">{e(x["kind"])}</span><h3>{e(x["title"])}</h3><p>{e(x["result"])}</p><p class="small">{e(x["limit"])}</p><a class="text-link" href="{x["file"]}">读取实际验证 JSON ↗</a></article>' for x in R['evidence'])
    primary=''.join(f'<article class="source-card" id="{x["id"]}"><span>{e(x["id"])}</span><div>{pill(x["type"])}<h3><a href="{e(x["url"])}" target="_blank" rel="noreferrer">{e(x["title"])} ↗</a></h3><p>{e(x["note"])}</p></div></article>' for x in R['sources'])
    topics=list(dict.fromkeys(x['topic'] for x in R['questions']))
    return lead('DISCUSSION & EVIDENCE / 05','保留问题，<br><span>也保留证据。</span>','讨论按议题归纳，不冒充逐字聊天转录。区分参考观察、作者声明、官方资料、自己的判断，以及真正跑过的程序。')+f'''<div class="wrap"><section class="section compact" id="evidence">{section('01','五组实测记录。','技术校验是有限证据，不等于表演、听感、事实内容和审美全部通过。')}<div class="evidence-grid">{evidence}</div><div class="two-notes"><p><b>已测：</b>已有口播的平面后期、三维屏幕、整合节奏、换输入比例与文案、缓存复用、场景相对引用。</p><p><b>未测：</b>其他人物身份、多人、长片、复杂遮挡、各家生成 API、真实数据图表、批量成功率与自动混音。</p></div></section>
<section class="section" id="questions">{section('02','26 个问题，把整个讨论接起来。','从“能力是否被替代”，到“现在究竟做了什么”。每个回答保留当前证据层级。')}<div class="faq-toolbar"><label for="faq-search">搜索讨论<input id="faq-search" type="search" placeholder="试试：口型、人物和表格、费用、模板"></label><button id="expand-faq" class="button secondary" aria-pressed="false">展开当前问题</button></div><div class="filters" role="group" aria-label="讨论类别筛选">{''.join(f'<button data-topic-filter="{t}" class="{"selected" if t=="全部" else ""}" aria-pressed="{str(t=="全部").lower()}">{t}</button>' for t in ['全部']+topics)}</div><p id="faq-count" class="small" aria-live="polite">共 26 个问题</p><div id="faq-list">{questions}</div><a class="text-link" href="DISCUSSION.md" download>下载完整归纳文字 ↙</a></section>
<section class="section" id="reference-sources">{section('03','资料来源与使用范围。','外部资料于 2026-11-17 复核。型号、接入方式和计费可能继续变化；实际调用前再查对应服务文档。')}{primary}</section>
<section class="section" id="boundaries">{section('04','这份档案怎样保存。','正式网页仍为本地研究，没有加入公开发布白名单。')}<div class="note"><p>视频通过本地白名单映射读取已有文件，不把原片、模型、逐帧缓存或构建产物提交到 Git。必要研究图片保留作者与来源，模板只保存可复用代码和说明。</p><p>人物、声音和原配乐归原权利人；本地研究记录不等于取得公开再分发许可。RVM 模型独立缓存并保留其许可证。</p></div><div class="actions"><a class="text-link" href="README.md">项目 README ↗</a><a class="text-link" href="media.json">视频哈希清单 ↗</a><a class="text-link" href="template-manifest.json">模板源码快照 ↗</a><a class="text-link" href="assets/image-manifest.json">研究图片来源记录 ↗</a><a class="text-link" href="verification.json">网页检查记录 ↗</a></div></section></div>'''

def shell(page,content):
    label=dict(PAGES)[page];i=[p[0] for p in PAGES].index(page);nxt=PAGES[(i+1)%len(PAGES)]
    nav=''.join(f'<a href="{p}.html" {"aria-current=page" if p==page else ""}>{name}</a>' for p,name in PAGES)
    if PUBLIC:
        content=content.replace('以下是 @tm_uchal 的原作品。本轮仅作本地效果研究，没有公开分发。','原作保留原帖入口；本页展示署名研究截图和本项目的后期样片。')
        content=content.replace('正式网页仍为本地研究，没有加入公开发布白名单。','公开页保存研究、后期样片、完整引导图和模板源码。')
        content=content.replace('视频通过本地白名单映射读取已有文件，不把原片、模型、逐帧缓存或构建产物提交到 Git。','四段后期样片通过带校验清单的发布媒体包恢复；原参考片保留原帖入口。原片、模型、逐帧缓存和构建产物不提交到 Git。')
        content=content.replace('人物、声音和原配乐归原权利人；本地研究记录不等于取得公开再分发许可。','人物、声音和原配乐归原权利人；研究署名不构成原素材的开放许可，页面片段用于说明后期方法。')
    status='在线研究档案' if PUBLIC else '本地研究 · 未公开发布'
    return f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{e(label)} · 数字人口播制作</title><meta name="description" content="{e(R['meta']['summary'])}"><meta name="theme-color" content="#f4f1ea"><link rel="icon" href="mark.svg" type="image/svg+xml"><link rel="stylesheet" href="styles.css"><script src="data.js" defer></script><script src="app.js" defer></script></head><body data-page="{page}"><a class="skip-link" href="#main">跳至正文</a><header class="site-header"><div class="header-inner"><a class="brand" href="index.html"><img src="mark.svg" alt="" width="36" height="36"><span>口播影像实验室<small>AVATAR / WORKFLOW 021</small></span></a><button id="menu-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="打开页面导航">☰</button><nav id="site-nav" aria-label="专题导航">{nav}</nav><button class="search-trigger" aria-haspopup="dialog"><span>搜索档案</span><kbd>⌘ K</kbd></button></div></header><main id="main" tabindex="-1">{content}</main><footer class="site-footer wrap"><div><a class="brand" href="index.html">口播影像实验室 <small>021 / 研究与实做</small></a><p>已有口播后期已跑通；生成、图表与长期稳定性按需继续验证。</p><span>整理更新 2026.11.17 · {status}</span></div><a class="footer-next" href="{nxt[0]}.html">继续阅读 <b>{nxt[1]} ↗</b></a></footer><dialog id="lightbox" aria-label="查看大图"><button data-close="lightbox" class="dialog-close" aria-label="关闭大图">×</button><img id="lightbox-image" alt=""><p id="lightbox-caption"></p></dialog><dialog id="search-dialog" aria-labelledby="search-title"><div class="dialog-heading"><h2 id="search-title">搜索这份制作档案</h2><button data-close="search-dialog" class="dialog-close" aria-label="关闭搜索">×</button></div><label for="global-search">问题、工具、效果或制作步骤</label><input id="global-search" type="search" placeholder="例如：嘴型、字幕、三维、缓存" autocomplete="off"><p id="search-status" class="small" aria-live="polite">输入关键词，查找讨论与资料。</p><div id="search-results"></div></dialog><div id="toast" role="status" aria-live="polite"></div></body></html>'''

def main():
    global PUBLIC
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--site-preview',action='store_true');parser.add_argument('--public',action='store_true');parser.add_argument('--media-archive');args=parser.parse_args()
    PUBLIC=args.public
    if PUBLIC:
        original=next(x for x in R['sources'] if x['id']=='original')
        original['note']='原视频和原声音轨归原权利人；完整原片通过原帖查看。后期样片的署名与公开展示范围见项目说明，原工程与完整参数未公开。'
    dest=ROOT/'dist';dest.mkdir(exist_ok=True)
    discussion='# 数字人口播制作 · 完整讨论归纳\n\n按议题归纳，不是逐字聊天转录。来源与状态见网页和 research.json。\n\n'
    for i,q in enumerate(R['questions'],1):
        discussion+=f'## {i:02} · {q["q"]}\n\n{q["a"]}\n\n- 留下的判断：{q["take"]}\n- 状态：{q["state"]}\n\n'
    (ROOT/'DISCUSSION.md').write_text(discussion.rstrip()+'\n',encoding='utf-8',newline='\n')
    for page,fn in [('index',home),('effects',effects),('methods',methods),('value',value),('template',template),('sources',sources)]:
        (dest/f'{page}.html').write_text(shell(page,fn()),encoding='utf-8',newline='\n')
    for name in ('styles.css','app.js','mark.svg'):shutil.copy2(ROOT/'web'/name,dest/name)
    preset=json.loads((ROOT/'template/avatar-motion-template/assets/preset.json').read_text(encoding='utf-8'))
    (dest/'data.js').write_text('window.avatarResearch='+json.dumps(R,ensure_ascii=False)+';\nwindow.avatarPreset='+json.dumps(preset,ensure_ascii=False)+';\n',encoding='utf-8')
    for folder in ('assets','evidence','template'):shutil.copytree(ROOT/folder,dest/folder,dirs_exist_ok=True)
    for name in ('README.md','DISCUSSION.md','VERIFICATION.md','media.json','template-manifest.json','verification.json','browser-verification.json','overview-summary.json'):
        if (ROOT/name).is_file():shutil.copy2(ROOT/name,dest/name)
    downloads=dest/'downloads';downloads.mkdir(exist_ok=True)
    with zipfile.ZipFile(downloads/'avatar-motion-template-v1.zip','w',zipfile.ZIP_DEFLATED) as z:
        for p in sorted((ROOT/'template').rglob('*')):
            if p.is_file():z.write(p,p.relative_to(ROOT/'template'))
    (downloads/'copy.example.json').write_text(json.dumps(preset['copy'],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (downloads/'captions.example.srt').write_text('1\n00:00:02,650 --> 00:00:03,720\n每个字，都有自己的节拍。\n\n2\n00:00:04,250 --> 00:00:07,800\n让镜头，把空间打开。\n',encoding='utf-8')
    if PUBLIC:
        from publication_media import hydrate
        hydrate(dest,args.media_archive)
        for name in ('publication-media.json','publication-verification.json','live-verification.json','THIRD_PARTY_NOTICES.md','publication.md'):
            if (ROOT/name).is_file():shutil.copy2(ROOT/name,dest/name)
    manifest={'project':ROOT.name,'mode':'publication' if PUBLIC else 'local','published':False,'files':[{'path':p.relative_to(dest).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(dest.rglob('*')) if p.is_file() and p.name!='build-manifest.json']}
    (dest/'build-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    if args.site_preview:
        repo=ROOT.parents[1];out=repo/'_site';shutil.copytree(dest,out/'demos'/ROOT.name,dirs_exist_ok=True)
        spec=importlib.util.spec_from_file_location('research_site',repo/'scripts/build_site.py');site=importlib.util.module_from_spec(spec);spec.loader.exec_module(site)
        entries={**site.STATIC_PROJECTS,**getattr(site,'LOCAL_RESEARCH_PROJECTS',{}),ROOT.name:'index.html'}
        for folder in (out/'demos').iterdir():
            if folder.is_dir() and (folder/'index.html').is_file():entries.setdefault(folder.name,'index.html')
        available={key for key,entry in entries.items() if (out/'demos'/key/entry).is_file()}
        if (out/'demos'/site.SLUG/'summary.html').is_file():available.add(site.SLUG)
        navigation=site.navigation(entries,available) if hasattr(site,'LOCAL_RESEARCH_PROJECTS') else site.navigation()
        (out/'index.html').write_text(navigation,encoding='utf-8')
    print(json.dumps({'output':str(dest),'pages':len(PAGES),'files':len(manifest['files']),'published':False}))

if __name__=='__main__':main()
