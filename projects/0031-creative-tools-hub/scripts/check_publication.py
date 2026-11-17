"""Validate the exact user-selected guide, portable links, scope and publication budget."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import argparse, hashlib, json, re, struct
ROOT=Path(__file__).resolve().parents[1]
GUIDE="e41c8fdbdf549304220d70487aa102d532c85ca87bc9f52538c721a221ae7c7f"
class Page(HTMLParser):
    def __init__(self):super().__init__();self.ids=[];self.refs=[];self.cards=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if "id" in a:self.ids.append(a["id"])
        if tag=="article" and "data-id" in a:self.cards.append(a["data-id"])
        for k in ["href","src","poster"]:
            if a.get(k):self.refs.append(a[k])
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    parser=argparse.ArgumentParser();parser.add_argument("--site");args=parser.parse_args()
    site=Path(args.site).resolve() if args.site else (ROOT/"dist").resolve()
    data=json.loads((site/"research.json").read_text(encoding="utf-8"))
    ids={t["id"] for t in data["tools"]}
    if len(ids)!=15 or len(data["routes"])!=5:raise ValueError("Coverage must be15tools/5routes")
    source=ROOT/"assets/creative-tools-overview.png";image=site/"assets/creative-tools-overview.png"
    if sha(source)!=GUIDE or sha(image)!=GUIDE:raise ValueError("Original guide bytes changed")
    raw=image.read_bytes()
    if raw[:8]!=b"\x89PNG\r\n\x1a\n" or struct.unpack(">II",raw[16:24])!=(3200,10440):raise ValueError("Guide dimensions differ")
    pages={};failures=[];references=0
    for p in site.rglob("*.html"):
        text=p.read_text(encoding="utf-8")
        if re.search(r"https?://(?:127\.0\.0\.1|localhost)|(?<![A-Za-z])[A-Za-z]:[\\/]|server_session|artifact_primary",text):failures.append([str(p.relative_to(site)),"local-only information"])
        page=Page();page.feed(text);pages[p.resolve()]=page
        if len(page.ids)!=len(set(page.ids)):failures.append([str(p.relative_to(site)),"duplicate ids"])
    main_page=pages[site/"index.html"]
    if set(main_page.cards)!=ids:failures.append(["index.html","tool coverage differs"])
    if 'assets/creative-tools-overview.png' not in main_page.refs:failures.append(["index.html","original guide not used"])
    for path,page in pages.items():
        for ref in page.refs:
            u=urlsplit(ref)
            if u.scheme or u.netloc:continue
            references+=1
            target=(path.parent/unquote(u.path)).resolve() if u.path else path
            if target.is_dir():target=target/"index.html"
            if not target.is_relative_to(site) or not target.is_file():failures.append([str(path.relative_to(site)),ref]);continue
            if u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids:failures.append([str(path.relative_to(site)),ref,"missing anchor"])
    for t in data["tools"]:
        if not (site/"studies"/(t["id"]+".html")).is_file() or not (site/"notes"/(t["id"]+".md")).is_file():failures.append([t["id"],"missing study/record"])
        else:
            note=(site/"notes"/(t["id"]+".md")).read_text(encoding="utf-8")
            if t["repo"] not in note and t["source"] not in note:failures.append([t["id"],"record lost its official source URL"])
    for name in ["app.js","map.js","research.json","source-manifest.json","verification.json"]:
        text=(site/name).read_text(encoding="utf-8")
        if re.search(r"https?://(?:127\.0\.0\.1|localhost)|(?<![A-Za-z])[A-Za-z]:[\\/]|server_session|artifact_primary",text):failures.append([name,"local-only information"])
    media=json.loads((ROOT/"publication-media.json").read_text(encoding="utf-8"))
    for item in media["files"]:
        if sha(site/item["path"])!=item["sha256"]:failures.append([item["path"],"media checksum"])
    manifest=json.loads((site/"source-manifest.json").read_text(encoding="utf-8"))
    for item in manifest["media"]:
        if sha(site/item["image"])!=item["sha256"]:failures.append([item["image"],"thumbnail checksum"])
    total=sum(p.stat().st_size for p in site.rglob("*") if p.is_file())
    if total>40*1024*1024:failures.append(["site","exceeds40MiB"])
    for p in site.rglob("*"):
        if p.is_file() and any(x in p.parts for x in [".local",".cache","node_modules","__pycache__"]):failures.append([str(p.relative_to(site)),"excluded folder"])
    report={"tools":15,"routes":5,"pages":len(pages),"references":references,"guide_sha256":GUIDE,"dimensions":[3200,10440],"media_files":3,"total_bytes":total,"failures":failures}
    (ROOT/"publication-checks.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False))
    if failures:raise SystemExit(1)
if __name__=="__main__":main()
