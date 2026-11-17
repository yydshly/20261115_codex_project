"""Decode, frame-count and waveform-alignment checks for delivered output."""
from pathlib import Path
import json,subprocess
import numpy as np
from avatar_video import write_json

def pcm(path):
    result=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(path),'-f','f32le','-ac','1','-ar','8000','pipe:1'],check=True,capture_output=True)
    return np.frombuffer(result.stdout,np.float32)

def verify(context):
    out=Path(context['output']);t=context['timing'];video=out/'video.mp4'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(video),'-f','null','-'],check=True)
    result=subprocess.run(['ffprobe','-v','error','-count_frames','-show_entries',
        'format=duration,size:stream=index,codec_type,codec_name,width,height,nb_read_frames,r_frame_rate,duration,sample_rate,channels',
        '-of','json',str(video)],check=True,capture_output=True,text=True)
    record=json.loads(result.stdout);vs=next(s for s in record['streams'] if s['codec_type']=='video')
    audio=next(s for s in record['streams'] if s['codec_type']=='audio')
    if int(vs['nb_read_frames'])!=t['frames']:raise RuntimeError('Output frame count mismatch')
    if abs(float(vs['duration'])-t['duration'])>1/t['fps']:raise RuntimeError('Output video duration mismatch')
    if abs(float(audio['duration'])-t['duration'])>.04:raise RuntimeError('Output audio duration mismatch')
    a=pcm(Path(context['prep'])/'normalized.mkv');b=pcm(video)
    hi=min(len(a),len(b))-2400;lo=2400
    if hi<=lo:raise RuntimeError('Audio too short to verify')
    if np.std(a[lo:hi])<1e-5:
        record['audio_alignment']={'status':'silent source; correlation unavailable'}
    else:
        lags=list(range(-80,81));corr=[float(np.corrcoef(a[lo:hi],b[lo+lag:hi+lag])[0,1]) for lag in lags]
        n=int(np.argmax(corr))
        if abs(lags[n])>1 or corr[n]<.98:raise RuntimeError(f'Audio alignment verification failed: lag {lags[n]}, correlation {corr[n]}')
        record['audio_alignment']={'status':'passed','lag_samples_at_8khz':lags[n],'correlation':round(corr[n],6)}
    record['full_decode']='passed';record['source_sync']='global output frame i uses normalized source frame i, including 3D screen'
    write_json(out/'verification.json',record)
    return record
