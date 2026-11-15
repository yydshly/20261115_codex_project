"""Record local render wall time and actual output metadata; no universal benchmark."""
import argparse,json,subprocess,time,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
PROJECT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('engine',choices=['remotion','manim']);parser.add_argument('revision',type=int);args=parser.parse_args()
output=PROJECT/'web/public/comparison'/f'{args.engine}-v{args.revision}.mp4';output.parent.mkdir(parents=True,exist_ok=True)
if args.engine=='remotion':
    cmd=['node','node_modules/@remotion/cli/remotion-cli.js','render','remotion/compare-index.jsx','SameCase',str(output),'--codec=h264','--concurrency=4'];cwd=PROJECT/'web'
else:
    cmd=[str(ROOT/'.local/manim-env/Scripts/python.exe'),'-m','manim','-qm','--fps','24','--media_dir',str(ROOT/'.local/case-manim'),str(PROJECT/'experiments/case_manim.py'),'SameCase'];cwd=ROOT
log=PROJECT/'comparison'/f'{args.engine}-v{args.revision}.log'
started=time.time()
with log.open('w',encoding='utf-8') as handle: result=subprocess.run(cmd,cwd=cwd,stdout=handle,stderr=subprocess.STDOUT)
elapsed=round(time.time()-started,3)
if result.returncode:
    print(log.read_text(encoding='utf-8')[-6000:]);raise SystemExit(result.returncode)
if args.engine=='manim':
    import shutil
    shutil.copy2(ROOT/'.local/case-manim/videos/case_manim/720p24/SameCase.mp4',output)
record={'engine':args.engine,'revision':args.revision,'wallSeconds':elapsed,'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'command':cmd,'timeLocal':'recorded locally; see file mtime'}
(PROJECT/'comparison'/f'{args.engine}-v{args.revision}.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(record,ensure_ascii=False))
