"""Normalize a continuous source segment, extract recurrent mattes and screen assets."""
from pathlib import Path
import math,subprocess,time
import cv2,numpy as np,onnxruntime as ort
from PIL import Image
from avatar_video import W,H,write_json,log

def prepare(cfg,t,root):
    started=time.perf_counter();root=Path(root);(root/'mattes').mkdir(exist_ok=True)
    normalized=root/'normalized.mkv'
    cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-i',cfg['source']['video'],
        '-ss',str(cfg['source']['start_seconds']),'-t',str(t['duration']),
        '-map','0:v:0','-map','0:a:0','-vf',f'scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,fps={t["fps"]}',
        '-c:v','ffv1','-level','3','-pix_fmt','yuv420p','-c:a','pcm_s16le',str(normalized)]
    subprocess.run(cmd,check=True)
    opts=ort.SessionOptions();opts.intra_op_num_threads=cfg['matting']['threads'];opts.inter_op_num_threads=1
    session=ort.InferenceSession(cfg['runtime']['model'],sess_options=opts,providers=['CPUExecutionProvider'])
    def zero():return [np.zeros((1,1,1,1),np.float32) for _ in range(4)]
    states=zero();cap=cv2.VideoCapture(str(normalized));previous=None
    crop=cfg['source'].get('crop') or [0,0,1,1]
    x0,y0,x1,y1=[round(v*s) for v,s in zip(crop,(W,H,W,H))]
    if x1-x0<64 or y1-y0<64:raise ValueError('Crop is too small for matting')
    resets={round(v*t['fps']) for v in cfg['matting']['reset_at_seconds']}
    suspect=[];boxes=[];reset_report=[];areas=[]
    for i in range(t['frames']):
        ok,bgr=cap.read()
        if not ok:raise RuntimeError(f'Normalized video decoded only {i}/{t["frames"]} frames')
        rgb=cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB)
        thumbnail=cv2.resize(cv2.cvtColor(bgr,cv2.COLOR_BGR2GRAY),(128,72))
        cut=previous is not None and float(np.abs(thumbnail.astype(np.float32)-previous).mean())>cfg['matting']['cut_threshold']
        previous=thumbnail.astype(np.float32)
        if i in resets or (cut and cfg['matting']['reset_on_cut']):
            states=zero();reset_report.append({'frame':i,'reason':'configured' if i in resets else 'detected cut'})
        image=rgb[y0:y1,x0:x1]
        feed={'src':image.transpose(2,0,1)[None].astype(np.float32)/255,
            'downsample_ratio':np.array([cfg['matting']['downsample_ratio']],np.float32)}
        feed.update({f'r{j+1}i':s for j,s in enumerate(states)})
        fg,alpha,*states=session.run(None,feed)
        fg=np.clip(fg[0].transpose(1,2,0),0,1);a=np.clip(alpha[0,0],0,1)
        count,labels,components,_=cv2.connectedComponentsWithStats((a>.18).astype(np.uint8))
        if count>1:
            largest=1+np.argmax(components[1:,cv2.CC_STAT_AREA])
            a*=cv2.dilate((labels==largest).astype(np.uint8),np.ones((9,9),np.uint8))
        a[a<.012]=0
        area=float((a>.5).mean());areas.append(area)
        corners=float(np.mean([a[:12,:12].mean(),a[-12:,:12].mean(),a[:12,-12:].mean(),a[-12:,-12:].mean()]))
        bad=area<.035 or area>.86 or corners>.65
        if bad:suspect.append(i)
        coords=np.argwhere(a>.25)
        if len(coords) and not bad:
            lo=coords.min(axis=0);hi=coords.max(axis=0)
            boxes.append([int(lo[1]+x0),int(lo[0]+y0),int(hi[1]+x0+1),int(hi[0]+y0+1)])
        rgba=np.zeros((H,W,4),np.uint8)
        rgba[y0:y1,x0:x1,:3]=np.uint8(fg*255);rgba[y0:y1,x0:x1,3]=np.uint8(np.round(a*255))
        Image.fromarray(rgba).save(root/'mattes'/f'{i:06d}.png',compress_level=2)
        if i%t['fps']==0:log(f'Matting {i+1}/{t["frames"]}')
    cap.release()
    if not boxes:raise ValueError('No usable presenter silhouette found; check source and crop')
    boxes=np.asarray(boxes)
    subject=[max(0,int(np.percentile(boxes[:,0],1))-12),max(0,int(np.percentile(boxes[:,1],1))-12),
        min(W,int(np.percentile(boxes[:,2],99))+12),min(H,int(np.percentile(boxes[:,3],99))+12)]
    write_json(root/'prepared.json',{'frames':t['frames'],'subject_box':subject,'suspect_frames':suspect,
        'state_resets':reset_report,'foreground_area_min_max':[min(areas),max(areas)],
        'method':'RVM MobileNetV3 fp32, ONNX Runtime CPU; largest component; constant subject framing',
        'seconds':round(time.perf_counter()-started,2)})
    # A contact sheet of actual alpha-composited frames, including the final shot.
    board=Image.new('RGB',(1280,720),(28,34,37))
    for n,i in enumerate(np.linspace(0,t['frames']-1,8,dtype=int)):
        frame=Image.new('RGBA',(W,H),(170,194,186,255))
        frame.alpha_composite(Image.open(root/'mattes'/f'{i:06d}.png').convert('RGBA'))
        board.paste(frame.convert('RGB').resize((320,180)),((n%4)*320,(n//4)*360))
    board.save(root/'matting-check.jpg',quality=93)

def prepare_screen(context):
    cfg=context['config'];t=context['timing'];root=Path(context['city']);prep=Path(context['prep'])
    seq=root/'screen-frames';seq.mkdir(exist_ok=True);(root/'render-frames').mkdir(exist_ok=True)
    box=context['subject_box'];bw,bh=box[2]-box[0],box[3]-box[1]
    scale=min(H*.96/bh,W*.62/bw);size=(round(bw*scale),round(bh*scale))
    for local,i in enumerate(range(t['city'],t['keywords_done']),1):
        rgba=Image.open(prep/'mattes'/f'{i:06d}.png').convert('RGBA').crop(tuple(box))
        rgba=rgba.resize(size,Image.Resampling.LANCZOS)
        frame=Image.new('RGBA',(W,H),cfg['style']['screen'])
        frame.alpha_composite(rgba,((W-size[0])//2,H-size[1]))
        frame.convert('RGB').save(seq/f'screen_{local:04d}.png',compress_level=2)
    log(f'Prepared {t["keywords_done"]-t["city"]} synchronized screen frames')
