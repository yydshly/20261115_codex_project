"""Draw measured diagnostic annotations; source photographs remain untouched."""
import json
import argparse
import math
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
import analyze as core

OUT, ASSETS, CFG = core.OUT, core.ASSETS, core.CFG
REPORT = json.loads((OUT / 'analysis.json').read_text(encoding='utf-8'))
MATCHES = json.loads((OUT / 'correspondences.json').read_text(encoding='utf-8'))
VIEWS = {view['id']: view for view in CFG['views']}
LABELS = {key: view['label'] for key, view in VIEWS.items()}
COLORS = {'original': '#b8cbd9', 'left': '#64c4df', 'right': '#8cbcf3', 'approach': '#e8c16b',
          'threshold': '#e29d59', 'inside': '#bda1e7', 'reverse': '#ef9eb7', 'off': '#83cfb6'}
BG, FG, MUTED = '#111923', '#edf3f7', '#b4c5d1'
GREEN, AMBER, RED, MAGENTA = '#79d7a0', '#f2c46b', '#ff8585', '#f4a4e2'
FONT = 'C:/Windows/Fonts/msyh.ttc'


def font(size):
    return ImageFont.truetype(FONT, size)


def write(draw, xy, text, size=27, color=FG):
    draw.text(xy, text, font=font(size), fill=color)


def arrow(draw, a, b, fill=FG, width=3):
    draw.line([a, b], fill=fill, width=width)
    x, y = b
    angle = math.atan2(b[1] - a[1], b[0] - a[0])
    for delta in [-.5, .5]:
        draw.line([b, (x - 14 * math.cos(angle + delta), y - 14 * math.sin(angle + delta))], fill=fill, width=width)


def auxiliary_checks():
    prepared = {key: core.prepare(view) for key, view in VIEWS.items() if key != 'off'}
    reports = []
    groups = [('exterior', ['original', 'left', 'right'], [('original', 'left'), ('original', 'right'), ('left', 'right')]),
              ('entry', ['original', 'approach', 'threshold', 'inside'], [('original', 'approach'), ('approach', 'threshold'), ('threshold', 'inside')]),
              ('interior_pair', ['threshold', 'inside'], [('threshold', 'inside')]),
              ('reverse_pair', ['inside', 'reverse'], [('inside', 'reverse')])]
    for group, ids, pairs in groups:
        pred = dict(np.load(OUT / 'aux' / group / 'prediction.npz'))
        records = [core.analyze_pair(a, b, prepared, pred, ids)[0] for a, b in pairs]
        record = {'group': group, 'pairs': records}
        if group == 'reverse_pair':
            record['intended_same_position_turn'] = core.relative_camera(pred['extrinsic'][0], pred['extrinsic'][1], float(np.median(pred['depth'][0])))
        reports.append(record)
    REPORT['subset_controls'] = reports
    (OUT / 'analysis.json').write_text(json.dumps(REPORT, ensure_ascii=False, indent=2), encoding='utf-8')
    (ASSETS / 'analysis.json').write_text(json.dumps(REPORT, ensure_ascii=False, indent=2), encoding='utf-8')
    print('SUBSET_CONTROLS', json.dumps(reports, ensure_ascii=False), flush=True)


def camera_board():
    im = Image.new('RGB', (1780, 1330), BG)
    draw = ImageDraw.Draw(im)
    write(draw, (30, 20), 'VGGT 空间检验：预测相机与图像匹配连通性', 38)
    write(draw, (30, 76), '相机是推测结果；坐标按原图预测深度中位数 D50 归一化，不是真实米数。', 26, MUTED)
    cams = REPORT['camera_predictions']
    scale = cams['original']['depth_median']
    centers = np.array([cams[key]['center'] for key in REPORT['view_ids']]) / scale
    x0, z0 = centers[:, 0].min() - .16, centers[:, 2].min() - .15
    x1, z1 = centers[:, 0].max() + .20, centers[:, 2].max() + .18
    units = min(820 / (x1 - x0), 810 / (z1 - z0))
    left, top, bottom = 85, 160, 1010
    def point(x, z):
        return (left + (x - x0) * units, bottom - (z - z0) * units)
    for value in np.arange(math.ceil(x0 / .2) * .2, x1, .2):
        a, b = point(value, z0), point(value, z1)
        draw.line([a, b], fill='#263746', width=1)
        write(draw, (a[0] - 20, a[1] + 8), f'{value:.1f}', 20, MUTED)
    for value in np.arange(math.ceil(z0 / .2) * .2, z1, .2):
        a, b = point(x0, value), point(x1, value)
        draw.line([a, b], fill='#263746', width=1)
        write(draw, (a[0] - 54, a[1] - 14), f'{value:.1f}', 20, MUTED)
    write(draw, (340, 1060), '横向 X / D50', 25, MUTED)
    write(draw, (45, 125), '前进 Z / D50（俯视）', 25, MUTED)
    # Only a guide through named inputs; it is not a recovered physical path.
    path_ids = ['original', 'approach', 'threshold', 'inside']
    for a, b in zip(path_ids, path_ids[1:]):
        pa, pb = np.array(cams[a]['center']) / scale, np.array(cams[b]['center']) / scale
        draw.line([point(pa[0], pa[2]), point(pb[0], pb[2])], fill='#576475', width=2)
    offsets = {'original': (10, 10), 'left': (-130, -60), 'right': (14, -42),
               'approach': (15, 10), 'threshold': (-140, 8), 'inside': (14, -54), 'reverse': (-40, 20)}
    for key in REPORT['view_ids']:
        c = np.array(cams[key]['center']) / scale
        direction = np.array(cams[key]['forward'])
        direction = direction[[0, 2]] / max(np.linalg.norm(direction[[0, 2]]), 1e-9)
        p = point(c[0], c[2])
        q = point(c[0] + direction[0] * .13, c[2] + direction[1] * .13)
        arrow(draw, p, q, COLORS[key], 4)
        draw.ellipse((p[0] - 8, p[1] - 8, p[0] + 8, p[1] + 8), fill=COLORS[key])
        dx, dy = offsets[key]
        write(draw, (p[0] + dx, p[1] + dy), LABELS[key], 25, COLORS[key])
    write(draw, (990, 135), '对应关系图（不是空间布局）', 29)
    nodes = {'original': (1350, 225), 'left': (1125, 355), 'right': (1570, 355),
             'approach': (1350, 510), 'threshold': (1125, 680), 'inside': (1570, 680), 'reverse': (1570, 875)}
    chosen = [('original', 'left'), ('original', 'right'), ('left', 'right'), ('original', 'approach'),
              ('approach', 'threshold'), ('threshold', 'inside'), ('inside', 'reverse')]
    for a, b in chosen:
        record = next(p for p in REPORT['pairs'] if p['pair'] == [a, b])
        supported = record['status'] != 'insufficient_overlap'
        col = AMBER if supported else '#637482'
        pa, pb = nodes[a], nodes[b]
        if supported:
            draw.line([pa, pb], fill=col, width=3)
        else:
            for t in np.arange(0, 1, .09):
                aa, bb = np.array(pa) * (1 - t) + np.array(pb) * t, np.array(pa) * (1 - min(t + .045, 1)) + np.array(pb) * min(t + .045, 1)
                draw.line([tuple(aa), tuple(bb)], fill=col, width=2)
        mid = (np.array(pa) + np.array(pb)) / 2
        text = f"{record['empirical_f_inliers']} 对"
        if a == 'left':
            mid[1] += 48
        if a == 'original' and b == 'approach':
            mid[0] += 72
            mid[1] += 60
        draw.rectangle((mid[0] - 45, mid[1] - 16, mid[0] + 70, mid[1] + 22), fill=BG)
        write(draw, (mid[0] - 36, mid[1] - 14), text, 23, col)
    for key, (x, y) in nodes.items():
        draw.rounded_rectangle((x - 92, y - 23, x + 92, y + 23), radius=5, fill='#243341')
        write(draw, (x - 78, y - 18), LABELS[key], 24, COLORS[key])
    write(draw, (1015, 960), '实线：有较多匹配，但仍有几何偏差', 24, AMBER)
    write(draw, (1015, 1000), '虚线：共同细节不足，不能据此判错', 24, MUTED)
    write(draw, (95, 1100), '灰线仅为输入顺序示意，孤立机位的相对位置没有得到验证。', 21, MUTED)
    check = REPORT['intended_camera_checks']['inside_to_reverse']
    write(draw, (35, 1130), f"回望预测：旋转 {check['rotation_degrees']:.1f}°；相机位置差 {check['distance_over_reference_median_depth']:.3f} × D50", 29, AMBER)
    write(draw, (35, 1182), '提示目标是同站位转身 180°，但回望匹配证据不足；上面的偏差不是测量真值。', 26, MUTED)
    lighting = REPORT['lighting_control']
    write(draw, (35, 1237), f"开／关灯控制：预测位置差 {lighting['distance_over_reference_median_depth']:.6f} × 室内 D50；深度差中位 {lighting['relative_depth_difference_median'] * 100:.2f}%", 26, GREEN)
    im.save(ASSETS / 'camera-map.png')


def select_points(records):
    if not records:
        return []
    valid = [p for p in records if p['error_px'] is not None and p['in_front_of_both_cameras']]
    if not valid:
        valid = records
    # Two small residuals plus spatially diverse high residuals; an illustration,
    # not a random accuracy sample. All matches remain in the numeric sidecar.
    ordered = sorted(valid, key=lambda p: p['error_px'] or 0)
    choices, used = [], set()
    for p in ordered[:2] + list(reversed(ordered)):
        x, y = p['source_xy_1000']
        cell = (int(x / 180), int(y / 140))
        if cell in used:
            continue
        if any(np.linalg.norm(np.array(p['source_xy_1000']) - q['source_xy_1000']) < 60 for q in choices):
            continue
        choices.append(p)
        used.add(cell)
        if len(choices) == 10:
            break
    return choices


def pair_boards():
    chosen = [('original', 'right'), ('original', 'left'), ('left', 'right'),
              ('approach', 'threshold'), ('threshold', 'inside'), ('inside', 'reverse')]
    illustrations = []
    for a, b in chosen:
        record = next(r for r in REPORT['pairs'] if r['pair'] == [a, b])
        points = select_points(MATCHES.get(a + '--' + b, []))
        im = Image.new('RGB', (2040, 1005), BG)
        draw = ImageDraw.Draw(im)
        weak = record['status'] == 'insufficient_overlap'
        write(draw, (20, 12), f'{LABELS[a]} → {LABELS[b]}：对应点与 VGGT 投影', 37)
        write(draw, (20, 65), '同号圆圈＝图像匹配候选；右图粉色 ×＝VGGT 预测投影；箭头表示两者差距。', 27, MUTED)
        im.paste(Image.open(VIEWS[a]['path']).convert('RGB').resize((1000, 563)), (10, 150))
        im.paste(Image.open(VIEWS[b]['path']).convert('RGB').resize((1000, 563)), (1030, 150))
        write(draw, (20, 110), LABELS[a], 26, COLORS[a])
        write(draw, (1030, 110), LABELS[b], 26, COLORS[b])
        for i, p in enumerate(points, 1):
            error = p['error_px']
            color = AMBER if weak else (GREEN if error is not None and error <= 5 else RED)
            for key, offset in [('source_xy_1000', 10), ('target_xy_1000', 1030)]:
                x, y = p[key]
                x, y = x + offset, y + 150
                draw.ellipse((x - 8, y - 8, x + 8, y + 8), fill=BG, outline=color, width=3)
                dx = -40 if x > offset + 940 else 10
                dy = 10 if y < 190 else -31
                write(draw, (x + dx, y + dy), str(i), 25, color)
            px, py = p['vggt_projection_xy_1000']
            if np.isfinite([px, py]).all() and 0 <= px <= 1000 and 0 <= py <= 563:
                px, py = px + 1030, py + 150
                actual = np.array(p['target_xy_1000']) + [1030, 150]
                if np.linalg.norm(np.array([px, py]) - actual) > 6:
                    arrow(draw, tuple(actual), (px, py), MAGENTA, 2)
                draw.line([(px - 7, py - 7), (px + 7, py + 7)], fill=MAGENTA, width=3)
                draw.line([(px - 7, py + 7), (px + 7, py - 7)], fill=MAGENTA, width=3)
        note = '证据不足：这些稀疏匹配也可能错误，不作结构冲突判定。' if weak else '红点只标“模型与匹配不符”候选；需排查误配、玻璃／反射和模型估计误差。'
        write(draw, (20, 731), note, 27, AMBER if weak else RED)
        med = record.get('vggt_forward_reprojection_px', {}).get('median')
        p90 = record.get('vggt_forward_reprojection_px', {}).get('p90')
        metric = '无可用前向投影统计' if med is None else f'模型投影偏差：中位 {med:.1f}px，P90 {p90:.1f}px（统一画宽 1000px）'
        write(draw, (20, 779), f"二维筛选对应 {record['empirical_f_inliers']} 对；{metric}", 26)
        for i, p in enumerate(points, 1):
            column = (i - 1) % 5
            row = (i - 1) // 5
            value = '--' if p['error_px'] is None else f"{p['error_px']:.1f}px"
            write(draw, (20 + column * 402, 832 + row * 48), f"{i} {p['source_region']} {value}", 22, MUTED)
        if a == 'threshold' and b == 'inside':
            write(draw, (20, 947), '注意：只输入这两张图时中位偏差降到 3.4px；上图的联合偏差不能全部归因于补图错误。', 25, AMBER)
        else:
            write(draw, (20, 947), '显示点经过空间抽样以便阅读，不代表整幅错误率；全部候选与数值已保留。', 25, MUTED)
        name = f'pair-{a}-{b}.png'
        im.save(ASSETS / name)
        illustrations.append({'pair': [a, b], 'file': name, 'selected_points': points})
    (ASSETS / 'illustrated-points.json').write_text(json.dumps(illustrations, ensure_ascii=False, indent=2), encoding='utf-8')


def object_board():
    im = Image.new('RGB', (1700, 1260), BG)
    draw = ImageDraw.Draw(im)
    write(draw, (25, 17), '物体对应核对：门口 → 门槛 → 室内 → 回望', 36)
    write(draw, (25, 70), '同字母是人工目视定位的同名物件区域，不表示三维位置已经锁定。', 25, MUTED)
    boxes = {
        'approach': {'D': [.39, .22, .56, .81], 'C': [.22, .49, .45, .67], 'F': [.29, .40, .35, .57]},
        'threshold': {'C': [.05, .53, .59, .98], 'F': [.23, .30, .37, .64], 'M': [.36, .40, .54, .58]},
        'inside': {'C': [.005, .53, .66, .99], 'F': [.14, .27, .36, .64], 'M': [.38, .39, .55, .61]},
        'reverse': {'D': [.395, .19, .56, .80], 'C': [.58, .53, .995, .99], 'F': [.65, .34, .79, .63], 'M': [.84, .39, .995, .75]},
    }
    palette = {'D': '#b9d4f0', 'C': '#e8c170', 'F': '#9ed3ac', 'M': '#e3afd8'}
    for index, key in enumerate(boxes):
        ox, oy = 25 + (index % 2) * 835, 160 + (index // 2) * 520
        write(draw, (ox, oy - 40), LABELS[key], 28, COLORS[key])
        im.paste(Image.open(VIEWS[key]['path']).convert('RGB').resize((810, 456)), (ox, oy))
        for label, (x0, y0, x1, y1) in boxes[key].items():
            rect = (ox + x0 * 810, oy + y0 * 456, ox + x1 * 810, oy + y1 * 456)
            draw.rectangle(rect, outline=palette[label], width=3)
            draw.rectangle((rect[0], rect[1], rect[0] + 32, rect[1] + 35), fill=BG)
            write(draw, (rect[0] + 4, rect[1]), label, 25, palette[label])
    write(draw, (25, 1180), 'D 入口　C 柜台　F 白花花瓶　M 咖啡机；回望是否换了站位或挪动物件，仍需验证。', 25, MUTED)
    im.save(ASSETS / 'object-correspondence.png')


def depth_board():
    pred = dict(np.load(OUT / 'joint/prediction.npz'))
    ids = REPORT['view_ids']
    im = Image.new('RGB', (1620, 1180), BG)
    draw = ImageDraw.Draw(im)
    write(draw, (20, 15), '同一轮 VGGT 深度预测（不是实测深度）', 35)
    write(draw, (20, 66), '统一对数色标：蓝近、红远；灰色为该图相对低置信区域，不代表已确定错误。', 25, MUTED)
    valid_depth = pred['depth'][np.isfinite(pred['depth']) & (pred['depth'] > 0)]
    low, high = np.percentile(np.log(valid_depth), [2, 98])
    for index, key in enumerate(ids):
        ox, oy = 20 + (index % 4) * 400, 150 + (index // 4) * 500
        write(draw, (ox, oy - 35), LABELS[key], 25, COLORS[key])
        rgb = Image.fromarray(pred['rgb'][index]).resize((380, 216))
        im.paste(rgb, (ox, oy))
        value = np.clip((np.log(np.maximum(pred['depth'][index], 1e-8)) - low) / (high - low), 0, 1)
        color = np.stack((np.clip(1.5 - abs(4 * value - 3), 0, 1), np.clip(1.5 - abs(4 * value - 2), 0, 1), np.clip(1.5 - abs(4 * value - 1), 0, 1)), axis=-1)
        color[pred['confidence'][index] < np.percentile(pred['confidence'][index], 30)] = .28
        im.paste(Image.fromarray((color * 255).astype('uint8')).resize((380, 216)), (ox, oy + 230))
    write(draw, (1220, 670), '重要边界', 28, AMBER)
    write(draw, (1220, 720), '玻璃、倒影和新生成内容', 22, MUTED)
    write(draw, (1220, 760), '会影响预测。不能把', 22, MUTED)
    write(draw, (1220, 800), '高置信等同于真实。', 22, MUTED)
    im.save(ASSETS / 'depth-overview.png')


def diagnostic_points():
    pred = dict(np.load(OUT / 'joint/prediction.npz'))
    ids = REPORT['view_ids']
    scale = REPORT['camera_predictions']['original']['depth_median']
    clouds = []
    for index, key in enumerate(ids):
        h, w = pred['depth'][index].shape
        yy, xx = np.mgrid[7:h:11, 7:w:11]
        xy = np.c_[xx.ravel(), yy.ravel()].astype(float)
        depth = pred['depth'][index, yy, xx].ravel()
        confidence = pred['confidence'][index, yy, xx].ravel()
        keep = (confidence >= np.percentile(pred['confidence'][index], 55)) & (depth > 0) & (depth < np.percentile(pred['depth'][index], 90))
        if key in ['original', 'left', 'right']:
            keep &= ~((xy[:, 0] > w * .62) & (xy[:, 1] < h * .39))
            keep &= ~((xy[:, 0] > w * .46) & (xy[:, 1] > h * .73))
        world = core.unproject(xy[keep], depth[keep], pred['K'][index], pred['extrinsic'][index]) / scale
        color = pred['rgb'][index, yy, xx].reshape(-1, 3)[keep]
        clouds.append({'id': key, 'positions': np.round(world, 5).ravel().tolist(), 'colors': color.ravel().tolist()})
    payload = {'cameras': REPORT['camera_predictions'], 'labels': LABELS, 'colors': COLORS,
               'normalization_depth': scale, 'clouds': clouds,
               'note': 'Sparse VGGT diagnostic samples, not a reconstructed editable world or Gaussian scene.'}
    (OUT / 'diagnostic-points.json').write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


def control_board():
    im = Image.new('RGB', (1640, 940), BG)
    draw = ImageDraw.Draw(im)
    write(draw, (30, 20), '子集对照：局部可对应，但室内外还没有连成可靠的共同空间', 35)
    write(draw, (30, 80), '两列使用同一批图像特征，仅改变 VGGT 联合输入；不是不同模型精度排名。', 25, MUTED)
    columns = [30, 560, 900, 1250]
    for x, text in zip(columns, ['检查图片', '7 图联合：中位偏差', '单独子集：中位偏差', '依据／限制']):
        write(draw, (x, 155), text, 25)
    lookups = {}
    for group in REPORT['subset_controls']:
        for pair in group['pairs']:
            lookups[(group['group'], tuple(pair['pair']))] = pair
    cases = [('原图 → 左图', ('original', 'left'), 'exterior', '222 对；局部仍有尾部偏差'),
             ('原图 → 右图', ('original', 'right'), 'exterior', '390 对；局部支持较好'),
             ('左图 → 右图', ('left', 'right'), 'exterior', '151 对；局部仍需核对'),
             ('门槛 → 室内', ('threshold', 'inside'), 'interior_pair', '219 对；联合定位不稳定')]
    for i, (title, pair, group, note) in enumerate(cases):
        y = 225 + i * 92
        main = next(p for p in REPORT['pairs'] if p['pair'] == list(pair))
        isolated = lookups[(group, pair)]
        write(draw, (columns[0], y), title, 29)
        write(draw, (columns[1], y), f"{main['vggt_forward_reprojection_px']['median']:.1f}px", 31, AMBER)
        write(draw, (columns[2], y), f"{isolated['vggt_forward_reprojection_px']['median']:.1f}px", 31, GREEN)
        write(draw, (columns[3], y + 4), note, 21, MUTED)
    write(draw, (30, 625), '室外 → 门口：仅 9 对筛选匹配；门口 → 门槛：15 对；室内 → 回望：11 对。', 27, AMBER)
    write(draw, (30, 680), '这些连接证据不足，不能把相机预测图当成已验证的行走路径。', 27, MUTED)
    write(draw, (30, 755), '开／关灯对照：同构图的预测相机几乎重合，深度差中位约 0.44%。', 27, GREEN)
    write(draw, (30, 815), '因此本轮结果支持继续核对局部结构，但不支持宣布完整场景已经重建成立。', 27)
    write(draw, (30, 880), '偏差统一换算到画宽 1000px；SIFT 误配、玻璃与模型误差仍需排除。', 23, MUTED)
    im.save(ASSETS / 'subset-controls.png')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--boards-only', action='store_true')
    args = parser.parse_args()
    if not args.boards_only:
        auxiliary_checks()
    camera_board()
    pair_boards()
    object_board()
    depth_board()
    diagnostic_points()
    control_board()
    shutil.copy2(OUT / 'inference.json', ASSETS / 'inference.json')
    (OUT / 'report-ready.json').write_text(json.dumps({'camera_map': True, 'object_board': True,
                                                      'annotated_pair_images': 6, 'gaussian_training': False}), encoding='utf-8')
    print('REPORT_BOARDS_READY', flush=True)


if __name__ == '__main__':
    main()
