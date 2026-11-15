"""Encode Motion Canvas frames and build an evidence report from actual files."""
import difflib,hashlib,json,subprocess,time
from pathlib import Path
PROJECT=Path(__file__).resolve().parents[1]
ROOT=PROJECT.parents[1]
OUTPUT=PROJECT/'web/public/comparison';OUTPUT.mkdir(exist_ok=True,parents=True)
DATA=PROJECT/'comparison'
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
for revision in [1,2]:
    record=json.loads((DATA/f'canvas-v{revision}.json').read_text(encoding='utf-8'))
    count=(18 if revision==1 else 24)*24
    folder=ROOT/'.local/case-canvas-frames'/f'canvas-v{revision}'
    assert len(list(folder.glob('*.png')))>=count,'Incomplete Motion Canvas frame sequence'
    target=OUTPUT/f'canvas-v{revision}.mp4'
    start=time.perf_counter()
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-framerate','24','-i',str(folder/'%06d.png'),'-frames:v',str(count),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(target),'-y'],check=True)
    record.update(encodingSeconds=round(time.perf_counter()-start,3),bytes=target.stat().st_size,sha256=digest(target),frames=count)
    (DATA/f'canvas-v{revision}.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
config=[
 ('remotion','Remotion','4.0.543','web/remotion/CaseStudy.jsx','Remotion.jsx','增加按时间计算的查询角度与第二问题分支；复用结果卡组件；延长总帧数。','CLI → H.264 MP4'),
 ('manim','Manim','0.22.1','experiments/case_manim.py','Manim.py','增加角度 ValueTracker，将原段、新增并行动画和结尾分成三个时段；更新卡片标签。','Python Scene → H.264 MP4'),
 ('canvas','Motion Canvas','3.17.2','experiments/motion-canvas/src/scenes/study.tsx','MotionCanvas.tsx','把固定角度改为信号，用 all 同时推进时间与角度；已有依赖节点随信号更新。','Renderer → PNG 序列 → FFmpeg MP4')
]
report={'date':'2026-11-15','width':1280,'height':720,'fps':24,'engines':[]}
for key,name,version,source_path,baseline,summary,pipeline in config:
    source=(PROJECT/source_path).read_text(encoding='utf-8')
    old=(DATA/'baseline'/baseline).read_text(encoding='utf-8')
    diff=list(difflib.unified_diff(old.splitlines(),source.splitlines(),fromfile='before/'+baseline,tofile='after/'+baseline,lineterm=''))
    added=sum(line.startswith('+') and not line.startswith('+++') for line in diff)
    removed=sum(line.startswith('-') and not line.startswith('---') for line in diff)
    (DATA/f'{key}-revision.patch').write_text('\n'.join(diff)+'\n',encoding='utf-8')
    records=[json.loads((DATA/f'{key}-v{r}.json').read_text(encoding='utf-8')) for r in [1,2]]
    for revision,record in zip([1,2],records):
        target=OUTPUT/f'{key}-v{revision}.mp4'
        metadata=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-print_format','json','-show_streams','-show_format',str(target)],text=True))
        video=next(s for s in metadata['streams'] if s['codec_type']=='video')
        assert (video['width'],video['height'])==(1280,720)
        assert video['r_frame_rate']=='24/1'
        assert abs(float(metadata['format']['duration'])-(18 if revision==1 else 24))<.1
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-ss','10' if revision==1 else '18','-i',str(target),'-frames:v','1','-update','1',str(OUTPUT/f'{key}-v{revision}-poster.jpg'),'-y'],check=True)
        record.update(metadata={'duration':float(metadata['format']['duration']),'width':video['width'],'height':video['height'],'fps':video['r_frame_rate']},bytes=target.stat().st_size,sha256=digest(target))
        (DATA/f'{key}-v{revision}.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
    def timing(r):
        value=f"{r['wallSeconds']:.1f} 秒"
        return value+(f" + 编码 {r['encodingSeconds']:.1f} 秒" if key=='canvas' else '')
    report['engines'].append({'id':key,'name':name,'version':version,'sourcePath':source_path,'source':source,'patch':'\n'.join(diff),'added':added,'removed':removed,'changedFiles':1,'changeSummary':summary,'pipeline':pipeline,'v1Text':timing(records[0]),'v2Text':timing(records[1]),'v1Bytes':records[0]['bytes'],'v2Bytes':records[1]['bytes'],'baselineSha256':digest(DATA/'baseline'/baseline),'sourceSha256':digest(PROJECT/source_path)})
(OUTPUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{k:e[k] for k in ['name','added','removed','v1Text','v2Text']} for e in report['engines']],ensure_ascii=False,indent=2))
