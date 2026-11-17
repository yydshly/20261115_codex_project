"""Use the previous, unchanged VGGT/SIFT screening on two new bridge images."""
import itertools
import json
import sys
from collections import deque
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
PREVIOUS = HERE.parent / 'canal-vggt-consistency'
sys.path.insert(0, str(PREVIOUS))
import analyze as core

CFG = json.loads((HERE / 'manifest.json').read_text(encoding='utf-8'))
OUT = Path(CFG['out'])
ASSETS = HERE.parents[1] / 'assets/canal-entry-bridge-test'
VIEWS = {view['id']: view for view in CFG['views']}
BASELINE = json.loads((Path(core.CFG['out']) / 'analysis.json').read_text(encoding='utf-8'))

old_region = core.region


def region(view_id, point, size):
    if view_id == 'bridge_a':
        return old_region('original', point, size)
    if view_id == 'bridge_b':
        x, y = point / np.array(size)
        if .423 < x < .458 or .76 < x < .817 or (y > .90 and .43 < x < .81):
            return '入口固定门框／门槛'
        if .44 < x < .66 and y > .50:
            return '柜台／货架结构'
        return '窗边／室内（含透射风险）'
    return old_region(view_id, point, size)


core.region = region


def graph(records, nodes, strict=False):
    edges = {key: set() for key in nodes}
    for pair in records:
        accept = pair['status'] == 'locally_supported' if strict else pair['status'] != 'insufficient_overlap'
        if accept:
            a, b = pair['pair']
            edges[a].add(b)
            edges[b].add(a)
    seen, components = set(), []
    for key in nodes:
        if key in seen:
            continue
        component, pending = [], [key]
        seen.add(key)
        while pending:
            item = pending.pop()
            component.append(item)
            for other in sorted(edges[item]):
                if other not in seen:
                    pending.append(other)
                    seen.add(other)
        components.append(component)
    pending = deque([['original']]) if 'original' in edges and 'inside' in edges else deque()
    visited = {'original'} if pending else set()
    route = None
    while pending:
        path = pending.popleft()
        if path[-1] == 'inside':
            route = path
            break
        for node in sorted(edges[path[-1]]):
            if node not in visited:
                visited.add(node)
                pending.append(path + [node])
    return {'components': components, 'original_to_inside_route': route,
            'meaning': 'Thresholded diagnostic evidence only, not a proof of complete rigid 3D geometry'}


def main():
    prepared = {}
    for key, view in VIEWS.items():
        item = dict(view)
        if key == 'bridge_a':
            item['id'] = 'original'  # Same broad sky/water exclusion as exterior images.
        prepared[key] = core.prepare(item)
    report = {
        'method': BASELINE['method'], 'evaluation_size_wh': [1000, 563],
        'thresholds': BASELINE['thresholds'],
        'generation': 'Exactly two new builtin image_gen outputs, no hand retouching or old image edits.',
        'camera_intent_note': 'A/B pose values were prompt instructions, not numeric camera control. B remained mostly outside the door.',
        'door_state_note': 'Original/A show a closed leaf; approach/B show an open leaf. The leaf and view-dependent glazing are not rigid-scene truth.',
        'groups': {}, 'before_pairs': BASELINE['pairs'],
        'before_support_graph': graph(BASELINE['pairs'], BASELINE['view_ids']),
        'before_strict_graph': graph(BASELINE['pairs'], BASELINE['view_ids'], strict=True),
        'limitations': BASELINE['limitations'] + [
            'New generated textures may increase match counts without preserving doorframe/counter topology.',
            'Adding frames changes VGGT context, so before/after prediction differences alone do not prove better images.',
            'The new images are not independently captured spatial evidence.',
        ],
    }
    all_correspondences = {}
    for group in CFG['groups']:
        pred = dict(np.load(OUT / group['id'] / 'prediction.npz'))
        ids = group['view_ids']
        pairs = list(itertools.combinations(ids, 2))
        group_records = []
        for a, b in pairs:
            record, points = core.analyze_pair(a, b, prepared, pred, ids)
            group_records.append(record)
            if group['id'] == 'joint' and points:
                all_correspondences[a + '--' + b] = points
            if group['id'] != 'joint' or a.startswith('bridge') or b.startswith('bridge'):
                print('PAIR', group['id'], a, b, record['status'], record['empirical_f_inliers'],
                      record.get('vggt_forward_reprojection_px', {}).get('median'), flush=True)
        h, w = pred['depth'].shape[1:]
        cameras = {}
        for index, key in enumerate(ids):
            cameras[key] = core.camera(pred['K'][index], pred['extrinsic'][index], w, h)
            cameras[key]['depth_median'] = float(np.median(pred['depth'][index]))
        report['groups'][group['id']] = {'view_ids': ids, 'pairs': group_records, 'cameras': cameras,
                                        'support_graph': graph(group_records, ids),
                                        'strict_graph': graph(group_records, ids, strict=True) if 'original' in ids else None}
    augmented = report['groups']['joint']
    report['joint_support_graph_after'] = augmented['support_graph']
    report['joint_strict_graph_after'] = augmented['strict_graph']
    report['entry_strict_graph_after'] = report['groups']['entry']['strict_graph']
    report['entry_connection_criteria_met'] = bool(augmented['strict_graph']['original_to_inside_route'] and
                                                   report['groups']['entry']['strict_graph']['original_to_inside_route'])
    report['decision'] = ('Local diagnostic connection criteria met; full geometry and semantic topology still require inspection.'
                          if report['entry_connection_criteria_met'] else
                          'Entry bridge not validated under the previously fixed criteria. Do not proceed to Gaussian training.')
    (OUT / 'analysis.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    (ASSETS / 'analysis.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    (OUT / 'correspondences.json').write_text(json.dumps(all_correspondences, ensure_ascii=False), encoding='utf-8')
    print('BEFORE', json.dumps(report['before_support_graph'], ensure_ascii=False), flush=True)
    print('AFTER', json.dumps(report['joint_support_graph_after'], ensure_ascii=False), flush=True)
    print('STRICT_AFTER', json.dumps(report['joint_strict_graph_after'], ensure_ascii=False), flush=True)
    print('DECISION', report['decision'], flush=True)


if __name__ == '__main__':
    main()
