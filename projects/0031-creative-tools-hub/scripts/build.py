"""Export the15-library research hub. Standard library only; never redraw the guide."""
from pathlib import Path, PurePosixPath
import argparse, copy, hashlib, html, json, re, shutil, urllib.request, zipfile
ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT.parents[1]
GUIDE="e41c8fdbdf549304220d70487aa102d532c85ca87bc9f52538c721a221ae7c7f"
MEDIA_MAP={
"../../0010-lemo-opuscar-trial/episodes/wind-in-the-garden/renders/v2/wind-in-the-garden-v2.mp4":"media/lemo-v2.mp4",
"../../0013-pixelfx-garden-trial/renders/comparison/abc-synchronized.mp4":"media/pixelfx-abc.mp4",
"../../0014-effectcraft-trial/renders/title-v2.mp4":"media/effectcraft-v2.mp4",
"../../0001-animation-skills-atlas/web/public/comparison/remotion-v2.mp4":"https://yydshly.github.io/20261115_codex_project/demos/0001-animation-skills-atlas/comparison/remotion-v2.mp4"}
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def hydrate(out, archive_arg=None):
    record=json.loads((ROOT/"publication-media.json").read_text(encoding="utf-8"))
    archive=Path(archive_arg) if archive_arg else REPO/".local/publication-media/creative-tools-hub-media-20261117.zip"
    if not archive.is_file():
        archive.parent.mkdir(parents=True,exist_ok=True)
        with urllib.request.urlopen(record["url"],timeout=60) as response:
            data=response.read(25_000_001)
        if len(data)>25_000_000:raise ValueError("Media archive exceeds25MB")
        archive.write_bytes(data)
    if digest(archive)!=record["sha256"]:raise ValueError("Media archive hash mismatch")
    expected={x["path"]:x for x in record["files"]}
    with zipfile.ZipFile(archive) as bundle:
        if set(bundle.namelist())!=set(expected):raise ValueError("Media archive members differ")
        for name in bundle.namelist():
            path=PurePosixPath(name);target=out/name
            if path.is_absolute() or ".." in path.parts or "\\" in name or not target.resolve().is_relative_to(out.resolve()):raise ValueError("Unsafe media path")
            blob=bundle.read(name)
            if hashlib.sha256(blob).hexdigest()!=expected[name]["sha256"]:raise ValueError("Media member hash mismatch: "+name)
            target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(blob)
def public_data(data):
    result=copy.deepcopy(data)
    for t in result["tools"]:
        if t.get("video") in MEDIA_MAP:t["video"]=MEDIA_MAP[t["video"]]
        t["study_url"]="studies/"+t["id"]+".html"
        if t.get("measurementSource"):t["measurementSource"]="notes/"+t["id"]+".md"
    return result
def inline(s):
    s=html.escape(s)
    s=re.sub(r'!\[([^]]*)\]\([^)]+\)',lambda m:"［图："+m[1]+"；见本页效果］",s)
    def link(m):
        label,url=m[1],html.unescape(m[2])
        if url.startswith(("https://","http://")):
            return '<a href="'+html.escape(url,quote=True)+'" target="_blank" rel="noopener noreferrer">'+label+'</a>'
        return label+"（阶段工程记录）"
    s=re.sub(r'\[([^]]+)\]\(([^)]+)\)',link,s)
    s=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',s)
    s=re.sub(r'`([^`]+)`',r'<code>\1</code>',s)
    return s
def render_notes(text):
    rows=[];para=[];code=[];in_code=False
    def flush():
        if para:rows.append("<p>"+inline(" ".join(para))+"</p>");para.clear()
    for line in text.splitlines():
        if line.startswith("```"):
            flush()
            if in_code:rows.append("<pre>"+html.escape("\n".join(code))+"</pre>");code=[];in_code=False
            else:in_code=True
            continue
        if in_code:code.append(line);continue
        if not line.strip():flush();continue
        if line.startswith("#"):
            flush();level=min(4,len(line)-len(line.lstrip("#"))+1);rows.append(f"<h{level}>"+inline(line.lstrip("# ")) +f"</h{level}>")
        elif line.startswith("|"):
            flush();rows.append('<p class="record-row">'+inline(line)+"</p>")
        elif line.startswith(("- ","* ")):
            flush();rows.append("<p>• "+inline(line[2:])+"</p>")
        elif line.startswith(">"):
            flush();rows.append("<blockquote>"+inline(line.lstrip("> "))+"</blockquote>")
        else:para.append(line)
    flush()
    if code:rows.append("<pre>"+html.escape("\n".join(code))+"</pre>")
    return "".join(rows)
def main():
    parser=argparse.ArgumentParser();parser.add_argument("--publication",action="store_true");parser.add_argument("--media-archive");args=parser.parse_args()
    if digest(ROOT/"assets/creative-tools-overview.png")!=GUIDE:raise ValueError("User-selected guide changed; publication must preserve original bytes")
    data=json.loads((ROOT/"research.json").read_text(encoding="utf-8"));pub_data=public_data(data)
    out=ROOT/"dist";out.mkdir(exist_ok=True)
    asset_files=["creative-tools-overview.png","creative-tools-overview.svg","creative-tools-overview-preview.jpg","overview-cover.jpg","mark.svg","SOURCES.md"]
    for name in asset_files:
        target=out/"assets"/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/"assets"/name,target)
    for name in sorted({t["media"]+".jpg" for t in data["tools"]}):
        target=out/"assets/thumbs"/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/"assets/thumbs"/name,target)
    for folder in ["licenses","notes"]:
        for source in (ROOT/folder).glob("*"):
            if source.is_file():
                target=out/folder/source.name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)
    for name in ["README.md","source-manifest.json","verification.json","publication-media.json","publication.md","THIRD_PARTY_NOTICES.md"]:
        source=ROOT/name
        if source.is_file():shutil.copyfile(source,out/name)
    (out/"research.json").write_text(json.dumps(pub_data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    text=(ROOT/"web/index.html").read_text(encoding="utf-8")
    text=text.replace("../publication.md","publication.md").replace("../THIRD_PARTY_NOTICES.md","THIRD_PARTY_NOTICES.md").replace("../assets/","assets/").replace("../research.json","research.json").replace("../source-manifest.json","source-manifest.json").replace("../verification.json","verification.json").replace("../README.md","README.md")
    for old,new in MEDIA_MAP.items():text=text.replace(old,new)
    for t in data["tools"]:
        pattern=r'(<article class="tool" id="tool-'+re.escape(t["id"])+r'".*?</article>)'
        match=re.search(pattern,text,re.S)
        if not match:raise ValueError("Missing tool article: "+t["id"])
        card=match[1]
        card=re.sub(r'href="[^"]*"([^>]*>深入专题</a>)','href="studies/'+t["id"]+'.html"'+r'\1',card)
        card=re.sub(r'href="\.\./\.\./[^"]*"','href="notes/'+t["id"]+'.md"',card)
        text=text[:match.start()]+card+text[match.end():]
    encoded=json.dumps(pub_data,ensure_ascii=False).replace("</","<\\/")
    text=re.sub(r'(<script id="research-data" type="application/json">).*?(</script>)',lambda m:m[1]+encoded+m[2],text,flags=re.S)
    (out/"index.html").write_text(text,encoding="utf-8")
    for name in ["styles.css","app.js","map.js"]:shutil.copyfile(ROOT/"web"/name,out/name)
    app=(out/"app.js").read_text(encoding="utf-8").replace("../assets/thumbs/","assets/thumbs/")
    (out/"app.js").write_text(app,encoding="utf-8")
    map_html=(ROOT/"web/map.html").read_text(encoding="utf-8").replace("../assets/","assets/")
    (out/"map.html").write_text(map_html,encoding="utf-8")
    study_dir=out/"studies";study_dir.mkdir(exist_ok=True)
    for t in data["tools"]:
        match=re.search(r'<article class="tool" id="tool-'+re.escape(t["id"])+r'".*?</article>',text,re.S)
        card=match[0];card=re.sub(r'<label class="compare-pick">.*?</label>',"",card,flags=re.S)
        card=re.sub(r'<button class="thumb-button"[^>]*>(.*?)</button>',lambda m:'<a class="thumb-button" href="../assets/thumbs/'+t["media"]+'.jpg">'+m[1]+'</a>',card,flags=re.S)
        card=card.replace('href="studies/'+t["id"]+'.html"','href="#record"')
        card=card.replace('src="assets/','src="../assets/').replace('href="assets/','href="../assets/').replace('src="media/','src="../media/').replace('poster="assets/','poster="../assets/').replace('href="notes/','href="../notes/').replace('href="studies/','href="../studies/').replace("<details>","<details open>")
        if t["id"]=="blender":card=re.sub(r'<div class="youtube-slot">.*?</div>','<p><a href="'+html.escape(t["source"],quote=True)+'" target="_blank" rel="noopener noreferrer">在原站播放作者演示</a></p>',card,flags=re.S)
        note=render_notes((ROOT/"notes"/(t["id"]+".md")).read_text(encoding="utf-8"))
        page='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+html.escape(t["name"])+' · 研究记录</title><link rel="stylesheet" href="../styles.css"><link rel="icon" href="../assets/mark.svg"><style>.tool{max-width:900px;margin:28px auto}.record{max-width:900px;margin:40px auto}.record-row{font-size:12px}blockquote{border-left:2px solid #9aad86;padding-left:18px}</style></head><body><main><nav><a class="brand" href="../index.html#tool-'+t["id"]+'">返回15库总览</a><a href="../map.html">完整汇总图</a></nav><header><h1>'+html.escape(t["name"])+'</h1><p>效果、我们的理解与阶段研究记录。原作、本站制作和未执行任务分别标注。</p></header>'+card+'<section class="record" id="record"><h2>阶段资料与来源</h2>'+note+'</section><footer><a href="../index.html">返回统一入口</a><a href="../assets/SOURCES.md">署名与许可</a></footer></main></body></html>'
        (study_dir/(t["id"]+".html")).write_text(page,encoding="utf-8")
    hydrate(out,args.media_archive)
    assert digest(out/"assets/creative-tools-overview.png")==GUIDE
    (ROOT/"publication-build.json").write_text(json.dumps({"guide_sha256":GUIDE,"tools":15,"study_pages":15,"bytes":sum(p.stat().st_size for p in out.rglob("*") if p.is_file()),"mode":"static-publication","drawing_executed":False},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"project":ROOT.name,"tools":15,"guide_sha256":GUIDE,"output":"dist","redrawn":False}))
if __name__=="__main__":main()
