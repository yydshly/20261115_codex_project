"""Independent 2D correspondences versus fixed VGGT camera/depth predictions.

Empirical two-view F only rejects a subset of descriptor mismatches. It does
not certify identity or rigidity. VGGT is not treated as geometric truth.
"""
import hashlib
import itertools
import json
import math
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent
CFG = json.loads((HERE / 'manifest.json').read_text(encoding='utf-8'))
OUT = Path(CFG['out'])
ASSETS = HERE.parents[1] / 'assets' / 'canal-vggt-consistency'
ASSETS.mkdir(parents=True, exist_ok=True)


def summary(values):
    values = np.asarray(values)
    values = values[np.isfinite(values)]
    return {'count': len(values), 'median': float(np.median(values)) if len(values) else None,
            'p90': float(np.percentile(values, 90)) if len(values) else None}


def sample(image, points):
    return cv2.remap(image.astype(np.float32), points[:, 0].astype(np.float32).reshape(-1, 1),
                     points[:, 1].astype(np.float32).reshape(-1, 1), cv2.INTER_LINEAR,
                     borderMode=cv2.BORDER_CONSTANT, borderValue=np.nan).ravel()


def unproject(points, depth, intrinsic, extrinsic):
    ray = np.c_[points, np.ones(len(points))] @ np.linalg.inv(intrinsic).T
    camera = ray * depth[:, None]
    return (camera - extrinsic[:, 3]) @ extrinsic[:, :3]


def project(world, intrinsic, extrinsic):
    camera = world @ extrinsic[:, :3].T + extrinsic[:, 3]
    homogeneous = camera @ intrinsic.T
    return homogeneous[:, :2] / homogeneous[:, 2, None], camera[:, 2]


def skew(vector):
    x, y, z = vector
    return np.array([[0, -z, y], [z, 0, -x], [-y, x, 0]])


def sampson(fundamental, a, b):
    x, y = np.c_[a, np.ones(len(a))], np.c_[b, np.ones(len(b))]
    fx, fy = x @ fundamental.T, y @ fundamental
    denominator = fx[:, 0] ** 2 + fx[:, 1] ** 2 + fy[:, 0] ** 2 + fy[:, 1] ** 2
    return np.abs(np.sum(y * fx, axis=1)) / np.sqrt(np.maximum(denominator, 1e-25))


def camera(intrinsic, extrinsic, width, height):
    rotation, translation = extrinsic[:, :3], extrinsic[:, 3]
    return {'center': (-rotation.T @ translation).tolist(),
            'forward': (rotation.T @ [0, 0, 1]).tolist(),
            'up': (rotation.T @ [0, -1, 0]).tolist(),
            'K': intrinsic.tolist(), 'world_to_camera': extrinsic.tolist(),
            'horizontal_fov_degrees': float(np.degrees(2 * np.arctan(width / (2 * intrinsic[0, 0])))),
            'vertical_fov_degrees': float(np.degrees(2 * np.arctan(height / (2 * intrinsic[1, 1])))),
            'rotation_orthogonality_error': float(np.linalg.norm(rotation @ rotation.T - np.eye(3)))}


def region(view_id, point, size):
    x, y = point / np.array(size)
    if view_id in ['original', 'left', 'right']:
        if x > .60 and .43 < y < .76:
            return '桥／河岸'
        if y < .38:
            return '楼上窗／墙面'
        return '咖啡店门窗' if x < .36 else '相邻店面'
    if view_id == 'approach':
        return '入口门框' if .38 < x < .58 else ('咖啡店／室内' if x < .70 else '邻店／街道')
    if view_id == 'reverse':
        return '柜台／咖啡机' if x > .60 else ('座位／墙面' if x < .24 else '入口／外景')
    if x < .65:
        return '柜台／货架' if y > .42 else '吊灯／左货架'
    return '后货架／墙面' if y < .62 else '座位／地面'


def prepare(view):
    image = cv2.imread(view['path'])
    height, width = image.shape[:2]
    mask = np.full((height, width), 255, np.uint8)
    if view['id'] in ['original', 'left', 'right']:
        mask[:int(height * .39), int(width * .62):] = 0
        mask[int(height * .73):, int(width * .46):] = 0
    keypoints, descriptors = cv2.SIFT_create(nfeatures=7000).detectAndCompute(
        cv2.cvtColor(image, cv2.COLOR_BGR2GRAY), mask)
    return {'points': np.array([key.pt for key in keypoints], dtype=np.float64),
            'descriptors': descriptors, 'size': (width, height), 'count': len(keypoints)}


def matches(a, b):
    matcher = cv2.BFMatcher(cv2.NORM_L2)
    reverse = {m.queryIdx: m.trainIdx for m, n in matcher.knnMatch(b['descriptors'], a['descriptors'], k=2)
               if m.distance < .72 * n.distance}
    good = [m for m, n in matcher.knnMatch(a['descriptors'], b['descriptors'], k=2)
            if m.distance < .72 * n.distance and reverse.get(m.trainIdx) == m.queryIdx]
    ids_a = np.array([m.queryIdx for m in good], dtype=int)
    ids_b = np.array([m.trainIdx for m in good], dtype=int)
    return a['points'][ids_a], b['points'][ids_b], ids_a, ids_b


def analyze_pair(id_a, id_b, prepared, pred, ids):
    a, b, ids_a, ids_b = matches(prepared[id_a], prepared[id_b])
    size_a, size_b = np.array(prepared[id_a]['size']), np.array(prepared[id_b]['size'])
    original_a, original_b = a.copy(), b.copy()
    a, b = a / size_a * [1000, 563], b / size_b * [1000, 563]
    result = {'pair': [id_a, id_b], 'tentative_matches': len(a),
              'coverage_note': 'Independent SIFT proposals; region labels are coarse image regions, not object recognition.'}
    if len(a) < 12:
        result.update(status='insufficient_overlap', reason='Too few tentative correspondences to screen geometry', empirical_f_inliers=0)
        return result, None
    cv2.setRNGSeed(20261116)
    fundamental, mask = cv2.findFundamentalMat(a, b, cv2.USAC_MAGSAC, 1.5, .999, 10000)
    if fundamental is None or fundamental.shape != (3, 3):
        result.update(status='insufficient_overlap', reason='No stable independent 2D relation', empirical_f_inliers=0)
        return result, None
    selected = mask.ravel().astype(bool)
    selected_ids = np.flatnonzero(selected)
    # 2D F is not reused as a camera estimate. Check fixed VGGT outputs only.
    ah, aw = pred['depth'].shape[1:]
    points_a = a / [1000, 563] * [aw, ah]
    points_b = b / [1000, 563] * [aw, ah]
    ia, ib = ids.index(id_a), ids.index(id_b)
    da, db = sample(pred['depth'][ia], points_a), sample(pred['depth'][ib], points_b)
    ca, cb = sample(pred['confidence'][ia], points_a), sample(pred['confidence'][ib], points_b)
    world_a = unproject(points_a, da, pred['K'][ia], pred['extrinsic'][ia])
    world_b = unproject(points_b, db, pred['K'][ib], pred['extrinsic'][ib])
    target_a, z_b = project(world_a, pred['K'][ib], pred['extrinsic'][ib])
    target_b, z_a = project(world_b, pred['K'][ia], pred['extrinsic'][ia])
    residual_ab = np.linalg.norm((target_a - points_b) * [1000 / aw, 563 / ah], axis=1)
    residual_ba = np.linalg.norm((target_b - points_a) * [1000 / aw, 563 / ah], axis=1)
    relative_depth = np.abs(z_b - db) / np.maximum(np.abs(db), 1e-8)
    distance = np.linalg.norm(world_a - world_b, axis=1) / np.maximum((da + db) / 2, 1e-8)
    rotation = pred['extrinsic'][ib, :, :3] @ pred['extrinsic'][ia, :, :3].T
    translation = pred['extrinsic'][ib, :, 3] - rotation @ pred['extrinsic'][ia, :, 3]
    f_model = np.linalg.inv(pred['K'][ib]).T @ skew(translation) @ rotation @ np.linalg.inv(pred['K'][ia])
    model_epipolar = sampson(f_model, points_a, points_b) * (1000 / aw)
    confidence_keep = ((ca >= np.percentile(pred['confidence'][ia], 40)) &
                       (cb >= np.percentile(pred['confidence'][ib], 40)))
    valid = selected & np.isfinite(residual_ab) & np.isfinite(residual_ba) & (z_b > 0) & (z_a > 0)
    confident = valid & confidence_keep
    coverage_a = len(np.unique(np.floor(a[selected] / [1000 / 6, 563 / 4]), axis=0))
    coverage_b = len(np.unique(np.floor(b[selected] / [1000 / 6, 563 / 4]), axis=0))
    result.update(empirical_f_inliers=int(selected.sum()),
                  source_occupied_cells_of_24=coverage_a, target_occupied_cells_of_24=coverage_b,
                  empirical_f_error_px=summary(sampson(fundamental, a[selected], b[selected])),
                  vggt_forward_reprojection_px=summary(residual_ab[valid]),
                  vggt_reverse_reprojection_px=summary(residual_ba[valid]),
                  vggt_confident_reprojection_px=summary(residual_ab[confident]),
                  vggt_pose_epipolar_px=summary(model_epipolar[valid]),
                  relative_target_depth_error=summary(relative_depth[valid]),
                  relative_world_point_disagreement=summary(distance[valid]),
                  behind_camera_count=int((selected & ((z_b <= 0) | (z_a <= 0))).sum()),
                  forward_fraction_within_5px=float(np.mean(residual_ab[valid] <= 5)) if valid.any() else None,
                  forward_fraction_over_15px=float(np.mean(residual_ab[valid] > 15)) if valid.any() else None)
    sufficient = selected.sum() >= 20 and min(coverage_a, coverage_b) >= 4 and valid.sum() >= 15
    median = result['vggt_forward_reprojection_px']['median']
    if not sufficient:
        result.update(status='insufficient_overlap', reason='Sparse or concentrated evidence; do not infer a structural conflict')
    elif median > 15 or result['forward_fraction_over_15px'] > .5:
        result.update(status='conflict_candidate', reason='Fixed VGGT predictions disagree with independently matched image points')
    elif median <= 5 and result['vggt_forward_reprojection_px']['p90'] <= 15:
        result.update(status='locally_supported', reason='Some matched image regions support the prediction; not a whole-scene pass')
    else:
        result.update(status='needs_review', reason='Mixed reprojection support; inspect marked regions')
    records = []
    for k in selected_ids:
        records.append({'source_xy_1000': a[k].tolist(), 'target_xy_1000': b[k].tolist(),
                        'vggt_projection_xy_1000': (target_a[k] * [1000 / aw, 563 / ah]).tolist(),
                        'source_region': region(id_a, original_a[k], size_a),
                        'error_px': float(residual_ab[k]) if np.isfinite(residual_ab[k]) else None,
                        'reverse_error_px': float(residual_ba[k]) if np.isfinite(residual_ba[k]) else None,
                        'depth_relative_error': float(relative_depth[k]) if np.isfinite(relative_depth[k]) else None,
                        'source_confidence': float(ca[k]), 'target_confidence': float(cb[k]),
                        'above_relative_confidence_cut': bool(confidence_keep[k]),
                        'in_front_of_both_cameras': bool(z_a[k] > 0 and z_b[k] > 0),
                        'keypoint_indices': [int(ids_a[k]), int(ids_b[k])]})
    return result, records


def relative_camera(a, b, depth_scale):
    ca, cb = -a[:, :3].T @ a[:, 3], -b[:, :3].T @ b[:, 3]
    rotation = b[:, :3] @ a[:, :3].T
    angle = np.degrees(np.arccos(np.clip((np.trace(rotation) - 1) / 2, -1, 1)))
    return {'center_distance_in_predicted_units': float(np.linalg.norm(ca - cb)),
            'distance_over_reference_median_depth': float(np.linalg.norm(ca - cb) / depth_scale),
            'rotation_degrees': float(angle)}


def main():
    pred = dict(np.load(OUT / 'joint/prediction.npz'))
    ids = CFG['groups'][0]['view_ids']
    views = {view['id']: view for view in CFG['views']}
    height, width = pred['depth'].shape[1:]
    prepared = {key: prepare(views[key]) for key in ids}
    report = {'evaluation_size_wh': [1000, 563],
              'method': 'Mutual SIFT .72 + independent two-view F screening; fixed VGGT camera/depth projection, no fitting to the correspondences',
              'thresholds': {'sufficient_f_inliers': 20, 'minimum_occupied_cells_of_24': 4,
                             'local_median_px': 5, 'local_p90_px': 15, 'conflict_median_px': 15,
                             'confidence_cut': '40th percentile per image, not a calibrated confidence probability'},
              'view_ids': ids, 'camera_predictions': {}, 'pairs': [],
              'feature_counts': {key: item['count'] for key, item in prepared.items()},
              'scale': 'Arbitrary VGGT gauge, no metres or recovered true dimensions',
              'limitations': [
                  'VGGT can assign poses even to incompatible generated images; pose output is not success.',
                  'A conflict may come from generated geometry, wrong descriptor matches, glass/reflections or VGGT estimation error.',
                  'Low overlap is unverified evidence, not proof of inconsistency.',
                  'Independent F screening can miss along-epipolar-line edits; repeated objects can still mismatch.',
                  'Confidence values are not calibrated correctness probabilities.',
                  'No genuine novel-view photos, measured dimensions or depth truth exist for this AI image.',
              ]}
    for index, key in enumerate(ids):
        report['camera_predictions'][key] = camera(pred['K'][index], pred['extrinsic'][index], width, height)
        report['camera_predictions'][key]['depth_median'] = float(np.median(pred['depth'][index]))
        # Coordinate-implementation sanity check, not geometric validation.
        points = np.array([[20.5, 30.5], [width / 2, height / 2], [width - 25.5, height - 20.5]])
        xyz = unproject(points, sample(pred['depth'][index], points), pred['K'][index], pred['extrinsic'][index])
        back, _ = project(xyz, pred['K'][index], pred['extrinsic'][index])
        error = float(np.max(np.linalg.norm(points - back, axis=1)))
        report['camera_predictions'][key]['self_projection_max_px'] = error
        if error > .01:
            raise RuntimeError(('Coordinate convention mismatch', key, error))
    correspondences = {}
    for a, b in itertools.combinations(ids, 2):
        record, points = analyze_pair(a, b, prepared, pred, ids)
        report['pairs'].append(record)
        if points:
            correspondences[a + '--' + b] = points
        metric = record.get('vggt_forward_reprojection_px', {})
        print('PAIR', a, b, record['status'], record['empirical_f_inliers'], metric.get('median'), flush=True)
    reference_scale = float(np.median(pred['depth'][0]))
    report['intended_camera_checks'] = {
        'inside_to_reverse': relative_camera(pred['extrinsic'][ids.index('inside')], pred['extrinsic'][ids.index('reverse')], reference_scale),
        'meaning': 'Compare with prompt intention of same standing location and 180-degree turn; not measured pose truth.'}
    lighting = dict(np.load(OUT / 'lighting/prediction.npz'))
    report['lighting_control'] = relative_camera(lighting['extrinsic'][0], lighting['extrinsic'][1], float(np.median(lighting['depth'][0])))
    report['lighting_control']['focal_ratio_off_to_on'] = (lighting['K'][1, [0, 1], [0, 1]] / lighting['K'][0, [0, 1], [0, 1]]).tolist()
    report['lighting_control']['relative_depth_difference_median'] = float(np.median(
        np.abs(lighting['depth'][0] - lighting['depth'][1]) / np.maximum(lighting['depth'][0], 1e-8)))
    report['lighting_control']['note'] = 'On/off pair was requested at same pose. Displacement indicates model sensitivity and/or image edits, not independently measured camera motion.'
    report['decision'] = 'Shared complete 3D space not established by prediction alone; inspect pair support and conflicts.'
    (OUT / 'correspondences.json').write_text(json.dumps(correspondences, ensure_ascii=False), encoding='utf-8')
    (OUT / 'analysis.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    (ASSETS / 'analysis.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print('CAMERA_CHECKS', json.dumps(report['intended_camera_checks']), flush=True)
    print('LIGHTING', json.dumps(report['lighting_control']), flush=True)


if __name__ == '__main__':
    main()
