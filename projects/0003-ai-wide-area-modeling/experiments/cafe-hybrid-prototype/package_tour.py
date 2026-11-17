"""Package actual consecutive 3D renders; preserve every rendered frame."""
import argparse
import json
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageStat

p = argparse.ArgumentParser()
p.add_argument('--out', required=True)
p.add_argument('--assets', required=True)
a = p.parse_args()
out, assets = Path(a.out), Path(a.assets)
report = json.loads((out / 'tour-report.json').read_text(encoding='utf-8'))
fps, duration = report['fps'], report['duration']
frames = sorted((out / 'tour-frames').glob('*.png'))
assert len(frames) == report['frames'] == fps * duration
assert report['assetsUnchanged'] and len(report['layerStates']) == 1 and not report['errors']
for frame in frames:
    with Image.open(frame) as im:
        assert im.size == (1000, 563), (frame, im.size)
        assert max(ImageStat.Stat(im.convert('RGB').resize((100, 56))).stddev) > 1, frame

captions = [
    (0, 7, '运河全景：真实左右移动'),
    (7, 13, '连续靠近咖啡店'),
    (13, 16, '停在门口，打开实体门与高斯门外观'),
    (16, 20, '保持同一场景，穿过门口进入室内'),
    (20, 26, '观察实体室内，连续转身'),
    (26, 28, '从室内回看街道：保留当前缺失与拉伸'),
]
def stamp(t):
    return f'00:00:{int(t):02d},000'
srt = '\n\n'.join(f'{i + 1}\n{stamp(start)} --> {stamp(end)}\n{text}' for i, (start, end, text) in enumerate(captions))
(out / 'tour-captions.srt').write_text(srt + '\n', encoding='utf-8')
video = out / 'continuous-tour.mp4'
subprocess.run([
    'ffmpeg', '-hide_banner', '-loglevel', 'warning', '-y',
    '-framerate', str(fps), '-i', 'tour-frames/%04d.png',
    '-vf', "pad=1000:620:0:0:color=0x14202d,subtitles=tour-captions.srt:force_style='FontName=Microsoft YaHei,FontSize=14,Alignment=2,MarginV=8'",
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', '-an', video.name,
], cwd=out, check=True)
probe = json.loads(subprocess.check_output([
    'ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=width,height,nb_frames,r_frame_rate:format=duration', '-of', 'json', str(video),
], text=True))
assert int(probe['streams'][0]['nb_frames']) == len(frames)
assert abs(float(probe['format']['duration']) - duration) < .1

font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 21)
small = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 19)
board = Image.new('RGB', (1500, 726), '#14202d')
draw = ImageDraw.Draw(board)
draw.text((15, 10), '当前场景的连续三维镜头 · 以下均为同一镜头的实际帧', font=font, fill='white')
samples = [(0, '全景起点'), (4, '左右移动产生视差'), (10, '靠近：单图高斯开始拉伸'),
           (15, '开门：外观残留直接可见'), (19, '进入：实体室内与漂浮高斯'), (26, '转身：街道缺失直接可见')]
for i, (t, label) in enumerate(samples):
    x, y = (i % 3) * 500, 48 + (i // 3) * 318
    draw.text((x + 10, y + 4), f'{t:02d}s · {label}', font=small, fill='white')
    with Image.open(frames[round(t * fps)]) as im:
        board.paste(im.convert('RGB').resize((500, 282), Image.Resampling.LANCZOS), (x, y + 36))
draw.text((15, 692), '模型、材质、光源和显示分层保持原样；仅增加相机路线与门动作调度。', font=small, fill='#b9cad8')
board.save(assets / 'continuous-tour-overview.png')

subprocess.run([
    'ffmpeg', '-hide_banner', '-loglevel', 'warning', '-y', '-i', str(video),
    '-filter_complex', 'fps=6,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
    '-loop', '0', str(assets / 'continuous-tour.gif'),
], check=True)

(out / 'continuous-tour-player.html').write_text(Path(__file__).with_name('tour-player.html').read_text(encoding='utf-8'), encoding='utf-8')

verification = {
    'frames': len(frames), 'allFramesNonblank': True, 'videoProbe': probe,
    'sourceAssetsUnchanged': report['assetsUnchanged'], 'constantSceneLayerStates': len(report['layerStates']),
    'maxPositionStep': report['continuous']['maxPositionStep'],
    'maxRotationDegrees': report['continuous']['maxRotationDegrees'],
    'video': str(video), 'scope': 'Actual 3D render frames, no camera cuts or image interpolation; existing scene defects retained',
}
(out / 'tour-verification.json').write_text(json.dumps(verification, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(verification, ensure_ascii=False, indent=2))
