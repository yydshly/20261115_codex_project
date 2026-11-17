"""Annotated measurement figures, keeping all model-generated originals intact."""
import json
import math
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'canal-vggt-consistency'))
from build_report import write, arrow, select_points, BG, FG, MUTED, GREEN, AMBER, RED, MAGENTA

CFG = json.loads((HERE / 'manifest.json').read_text(encoding='utf-8'))
OUT = Path(CFG['out'])
ASSETS = HERE.parents[1] / 'assets/canal-entry-bridge-test'
REPORT = json.loads((OUT / 'analysis.json').read_text(encoding='utf-8'))
MATCHES = json.loads((OUT / 'correspondences.json').read_text(encoding='utf-8'))
VIEWS = {v['id']: v for v in CFG['views']}
LABELS = {key: v['label'] for key, v in VIEWS.items()}
SHORT = {'original': '原图', 'bridge_a': 'A 走近', 'approach': '门口', 'bridge_b': 'B 门槛候选',
         'threshold': '原门槛', 'inside': '室内', 'left': '左图', 'right': '右图', 'reverse': '回望'}


def record(a, b, group='joint'):
    return next(p for p in REPORT['groups'][group]['pairs'] if p['pair'] == [a, b])


def metric(pair):
    item = pair.get('vggt_forward_reprojection_px', {})
    return item.get('median'), item.get('p90')


def flow(draw, ids, positions, y, records):
    for a, b, x0, x1 in zip(ids, ids[1:], positions, positions[1:]):
        p = next(r for r in records if r['pair'] == [a, b])
        enough = p['status'] != 'insufficient_overlap'
        color = GREEN if p['status'] == 'locally_supported' else (RED if p['status'] == 'conflict_candidate' else AMBER)
        if not enough:
            color = '#7b8997'
        draw.line([(x0 + 65, y), (x1 - 65, y)], fill=color, width=3 if enough else 1)
        label = f"{p['empirical_f_inliers']} 对"
        write(draw, ((x0 + x1) / 2 - 38, y + 30), label, 24, color)
    for key, x in zip(ids, positions):
        col = AMBER if key.startswith('bridge') else FG
        draw.rounded_rectangle((x - 75, y - 25, x + 75, y + 25), radius=4, fill='#283644')
        write(draw, (x - 65, y - 18), SHORT[key], 24, col)


def verdict():
    im = Image.new('RGB', (1780, 1180), BG)
    draw = ImageDraw.Draw(im)
    write(draw, (30, 20), '补两张过渡图后：匹配增加，但入口连接仍未通过', 38)
    write(draw, (30, 80), '沿用先前门槛：充分分布的对应＋联合投影中位 ≤5px、P90 ≤15px。画宽统一 1000px。', 25, MUTED)
    write(draw, (30, 145), '补图前（原 7 张联合）', 28)
    flow(draw, ['original', 'approach', 'threshold', 'inside'], [200, 650, 1100, 1550], 235, REPORT['before_pairs'])
    write(draw, (30, 340), '补图后（原图＋A＋门口＋B＋原门槛＋室内，另保留原左右与回望）', 27)
    ids = ['original', 'bridge_a', 'approach', 'bridge_b', 'threshold', 'inside']
    flow(draw, ids, [160, 450, 740, 1030, 1320, 1610], 430, REPORT['groups']['joint']['pairs'])
    headers = ['新增连接', '筛选对应', '9 图联合中位', '单独两图中位', '判定']
    xs = [40, 430, 710, 1040, 1370]
    for x, text in zip(xs, headers):
        write(draw, (x, 555), text, 27)
    tests = [('original', 'bridge_a', 'pair_oa'), ('bridge_a', 'approach', 'pair_aa'),
             ('approach', 'bridge_b', 'pair_ab'), ('bridge_b', 'threshold', 'pair_bt'),
             ('bridge_b', 'inside', 'pair_bi')]
    translations = {'locally_supported': '仅局部支持', 'needs_review': '仍有偏差',
                    'conflict_candidate': '冲突候选', 'insufficient_overlap': '证据不足'}
    for index, (a, b, group) in enumerate(tests):
        p, local = record(a, b), record(a, b, group)
        y = 620 + index * 72
        enough = p['status'] != 'insufficient_overlap'
        med, _ = metric(p)
        local_med, _ = metric(local)
        values = [SHORT[a] + ' → ' + SHORT[b], str(p['empirical_f_inliers']),
                  f'{med:.1f}px' if enough and med is not None else '不可靠，不判定',
                  f'{local_med:.1f}px' if local['status'] != 'insufficient_overlap' and local_med is not None else '不可靠，不判定',
                  translations[p['status']]]
        for x, value in zip(xs, values):
            write(draw, (x, y), value, 27, RED if p['status'] == 'conflict_candidate' else (AMBER if not enough else FG))
    write(draw, (30, 1020), 'A 与外景／门口的纹理对应增加，B 与室内的对应增加；但门口与 B 之间仍缺可靠连接。', 26, AMBER)
    write(draw, (30, 1070), '较多匹配 ≠ 同一三维空间。误配、玻璃、开门状态与 VGGT 误差仍须区分。', 26, MUTED)
    write(draw, (30, 1120), '本轮到此停止通用补图试验；未训练高斯，未修改旧模型。', 27)
    im.save(ASSETS / 'before-after-verdict.png')


def pairs():
    tests = [('original', 'bridge_a', 'pair_oa'), ('bridge_a', 'approach', 'pair_aa'),
             ('approach', 'bridge_b', 'pair_ab'), ('bridge_b', 'threshold', 'pair_bt'), ('bridge_b', 'inside', 'pair_bi')]
    selected_records = []
    for a, b, group in tests:
        p = record(a, b)
        weak = p['status'] == 'insufficient_overlap'
        candidates = MATCHES.get(a + '--' + b, [])
        if (a, b) == ('bridge_a', 'approach'):
            # Visually obvious descriptor mismatch: neighbouring shop frame to
            # the round-sign bracket. Keep raw statistics, do not use it as
            # an illustrated example of actual structural disagreement.
            candidates = [q for q in candidates if q['keypoint_indices'] != [845, 5543]]
        points = select_points(candidates)
        im = Image.new('RGB', (2040, 1030), BG)
        draw = ImageDraw.Draw(im)
        write(draw, (20, 15), f'{SHORT[a]} → {SHORT[b]}：新增连接的实际检查', 37)
        write(draw, (20, 69), '同号圆圈＝二维匹配候选；粉色 ×＝9 图联合 VGGT 的投影位置；不是实测真值。', 27, MUTED)
        im.paste(Image.open(VIEWS[a]['path']).convert('RGB').resize((1000, 563)), (10, 150))
        im.paste(Image.open(VIEWS[b]['path']).convert('RGB').resize((1000, 563)), (1030, 150))
        write(draw, (20, 111), LABELS[a], 25)
        write(draw, (1030, 111), LABELS[b], 25)
        for index, point in enumerate(points, 1):
            error = point['error_px']
            color = AMBER if weak or not point['above_relative_confidence_cut'] else (GREEN if error is not None and error <= 5 else RED)
            for key, offset in [('source_xy_1000', 10), ('target_xy_1000', 1030)]:
                x, y = np.array(point[key]) + [offset, 150]
                draw.ellipse((x - 8, y - 8, x + 8, y + 8), fill=BG, outline=color, width=3)
                write(draw, (x + (10 if x < offset + 950 else -36), y - 31 if y > 190 else y + 10), str(index), 25, color)
            px, py = point['vggt_projection_xy_1000']
            if np.isfinite([px, py]).all() and 0 <= px <= 1000 and 0 <= py <= 563:
                px, py = px + 1030, py + 150
                actual = np.array(point['target_xy_1000']) + [1030, 150]
                if np.linalg.norm(np.array([px, py]) - actual) > 6:
                    arrow(draw, tuple(actual), (px, py), MAGENTA, 2)
                draw.line([(px - 7, py - 7), (px + 7, py + 7)], fill=MAGENTA, width=3)
                draw.line([(px - 7, py + 7), (px + 7, py - 7)], fill=MAGENTA, width=3)
        med, p90 = metric(p)
        text = '对应稀少或集中，不可靠；不把大残差当作物体确实移动。' if weak else f"筛选 {p['empirical_f_inliers']} 对；联合投影偏差中位 {med:.1f}px，P90 {p90:.1f}px。"
        write(draw, (20, 737), text, 28, AMBER if weak else RED)
        local = record(a, b, group)
        local_med, _ = metric(local)
        if local['status'] != 'insufficient_overlap' and local_med is not None:
            write(draw, (20, 785), f'同图对单独推理中位 {local_med:.1f}px；仍需区分生成改形、错误匹配和模型估计误差。', 25, MUTED)
        for index, point in enumerate(points, 1):
            col, row = (index - 1) % 5, (index - 1) // 5
            error = point['error_px']
            write(draw, (20 + 402 * col, 841 + row * 46), f"{index} {point['source_region']} {error:.1f}px" if error is not None else f'{index} 无前向投影', 21, MUTED)
        write(draw, (20, 970), '黄圈含低置信／稀疏证据；抽样不代表全图错误率；明显疑似错配不作结构矛盾示例。', 25, MUTED)
        filename = f'pair-{a}-{b}.png'
        im.save(ASSETS / filename)
        selected_records.append({'pair': [a, b], 'file': filename, 'displayed_points': points})
    (ASSETS / 'illustrated-points.json').write_text(json.dumps(selected_records, ensure_ascii=False, indent=2), encoding='utf-8')


def gallery():
    ids = ['original', 'bridge_a', 'approach', 'bridge_b', 'threshold', 'inside']
    im = Image.new('RGB', (1740, 910), BG)
    draw = ImageDraw.Draw(im)
    write(draw, (20, 15), '实际输入：原图 → A → 门口 → B → 原门槛 → 室内', 35)
    write(draw, (20, 70), 'B 仍偏门外观察，未严格达到“跨门槛”目标；图片之间的空间一致性未通过。', 25, AMBER)
    for index, key in enumerate(ids):
        x, y = 20 + index % 3 * 570, 165 + index // 3 * 370
        write(draw, (x, y - 36), LABELS[key], 26, AMBER if key.startswith('bridge') else FG)
        im.paste(Image.open(VIEWS[key]['path']).convert('RGB').resize((550, 310)), (x, y))
    im.save(ASSETS / 'input-sequence.png')


def cameras():
    cams = REPORT['groups']['joint']['cameras']
    ids = REPORT['groups']['joint']['view_ids']
    scale = cams['original']['depth_median']
    points = np.array([cams[key]['center'] for key in ids]) / scale
    low = points[:, [0, 2]].min(axis=0) - .12
    high = points[:, [0, 2]].max(axis=0) + .14
    unit = min(1080 / max(high[0] - low[0], .1), 850 / max(high[1] - low[1], .1))
    im = Image.new('RGB', (1700, 1120), BG)
    draw = ImageDraw.Draw(im)
    write(draw, (25, 20), '新增过渡图后的相机预测（9 图联合）', 36)
    write(draw, (25, 75), '相对位置尚未被可靠匹配链验证；灰线仅表示输入顺序，不是已恢复的行走路线。', 25, MUTED)
    def xy(point):
        return (90 + (point[0] - low[0]) * unit, 980 - (point[2] - low[1]) * unit)
    for x in np.arange(math.ceil(low[0] / .2) * .2, high[0], .2):
        a, b = xy([x, 0, low[1]]), xy([x, 0, high[1]])
        draw.line([a, b], fill='#2c3c4a', width=1)
        write(draw, (a[0] - 20, 995), f'{x:.1f}', 21, MUTED)
    for z in np.arange(math.ceil(low[1] / .2) * .2, high[1], .2):
        a, b = xy([low[0], 0, z]), xy([high[0], 0, z])
        draw.line([a, b], fill='#2c3c4a', width=1)
        write(draw, (30, a[1] - 15), f'{z:.1f}', 21, MUTED)
    chain = ['original', 'bridge_a', 'approach', 'bridge_b', 'threshold', 'inside']
    for a, b in zip(chain, chain[1:]):
        draw.line([xy(np.array(cams[a]['center']) / scale), xy(np.array(cams[b]['center']) / scale)], fill='#667381', width=2)
    label_ids = {'original': '0', 'left': 'L', 'right': 'R', 'bridge_a': 'A', 'approach': 'P',
                 'bridge_b': 'B', 'threshold': 'T', 'inside': 'I', 'reverse': 'V'}
    for index, key in enumerate(ids):
        c = np.array(cams[key]['center']) / scale
        pos = xy(c)
        direction = np.array(cams[key]['forward'])
        norm = max(np.linalg.norm(direction[[0, 2]]), 1e-8)
        end = xy(c + direction / norm * .08)
        col = AMBER if key == 'bridge_a' else (GREEN if key == 'bridge_b' else '#a5bed2')
        arrow(draw, pos, end, col, 3)
        draw.ellipse((pos[0] - 7, pos[1] - 7, pos[0] + 7, pos[1] + 7), fill=col)
        write(draw, (pos[0] + 10, pos[1] + (-38 if index % 2 else 10)), label_ids[key], 28, col)
        write(draw, (1270, 165 + index * 70), label_ids[key] + '  ' + LABELS[key], 26, col)
    write(draw, (30, 1050), '横向 X／原图预测深度中位数；纵向为前进 Z。尺度不是米，机位不是实测。', 25, MUTED)
    im.save(ASSETS / 'camera-map.png')


def main():
    verdict()
    pairs()
    gallery()
    cameras()
    shutil.copy2(OUT / 'inference.json', ASSETS / 'inference.json')
    print('FIGURES_READY', flush=True)


if __name__ == '__main__':
    main()
