"""Read-only audit of existing assets, geometry overlap, and recorded tour.

Gaussian-center overlap is a diagnostic, not a ground-truth segmentation or
proof that removing those primitives would preserve the source appearance.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument('--results', required=True)
parser.add_argument('--support', required=True)
parser.add_argument('--out', required=True)
args = parser.parse_args()
sys.path.insert(0, args.support)
from plyfile import PlyData

root = Path(args.results)
layout = json.loads((root / 'layout.json').read_text(encoding='utf-8'))
binding = json.loads((root / 'binding.json').read_text(encoding='utf-8'))
tour = json.loads((root / 'tour-report.json').read_text(encoding='utf-8'))
base = np.asarray(layout['cv_to_three_matrix'], dtype=np.float64)
room = binding['room']

overlap = {}
for name in ['background.ply', 'door-skin.ply']:
    vertices = PlyData.read(root / name)['vertex'].data
    source = np.column_stack([vertices[k] for k in ['x', 'y', 'z']])
    three = source @ base[:3, :3].T + base[:3, 3]
    local = np.column_stack([three[:, 0], -three[:, 2], three[:, 1]])
    # Leave margins at the facade, floor, walls and ceiling. This isolates
    # centers clearly inside the newly designed room, rather than surface tails.
    inside = (
        (local[:, 0] > room['x'][0] + .1)
        & (local[:, 0] < room['x'][1] - .1)
        & (local[:, 1] > .2)
        & (local[:, 1] < room['y'][1] - .1)
        & (local[:, 2] > .1)
        & (local[:, 2] < room['height'] - .1)
    )
    alpha = 1 / (1 + np.exp(-np.clip(vertices['opacity'], -40, 40)))
    selected = np.flatnonzero(inside & (alpha > .1))
    samples = selected[::max(1, len(selected) // 6)][:6]
    overlap[name] = {
        'total': len(vertices),
        'centersInsideDesignedRoom': int(inside.sum()),
        'insideWithOpacityAbovePointOne': len(selected),
        'samplePositionsBlender': local[samples].tolist(),
    }

trace = tour['trace']
crossings = [t for t in trace if -t['position'][2] >= .2]
entry = crossings[0] if crossings else None
fields = ['hybrid', 'backgroundVisible', 'skinVisible', 'light', 'hiddenProxyMaterialCount']
states = {json.dumps({key: t[key] for key in fields}, sort_keys=True) for t in trace}
asset_names = ['cafe-hybrid-prototype.blend', 'cafe-structure.glb', 'background.ply',
               'door-skin.ply', 'layout.json', 'binding.json']
hashes = {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in asset_names}
unchanged = all(hashes[name] == tour['assetsBefore'][name] for name in asset_names)

report = {
    'scope': 'Read-only inspection of existing scene; no new image, model generation, training, clipping, or scene repair',
    'sourceAssetsMatchRecordedBaseline': unchanged,
    'assetSha256': hashes,
    'gaussianCenterOverlap': overlap,
    'roomBlender': room,
    'tour': {
        'framesInspected': len(trace),
        'constantLayerStateCount': len(states),
        'layerStates': [json.loads(state) for state in sorted(states)],
        'firstCameraInsideRoomMargin': None if entry is None else {
            'seconds': entry['time'], 'doorAngleDegrees': entry['doorAngle'] * 180 / np.pi,
            'cameraBlender': [entry['position'][0], -entry['position'][2], entry['position'][1]],
        },
    },
    'interpretation': [
        'Background primitives inside the designed room can contaminate interior views; this count is not a validated removal mask.',
        'Hidden facade and door-wood proxy materials leave only the Gaussian representation for those surfaces in the recorded hybrid tour.',
        'A correct door transform and continuous camera do not establish complete geometry or appearance coverage.',
        'No unseen view generation or multi-view scene reconstruction has been implemented in this experiment.',
    ],
}
Path(args.out).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({
    'sourceAssetsMatchRecordedBaseline': unchanged,
    'gaussianCenterOverlap': overlap,
    'firstEntry': report['tour']['firstCameraInsideRoomMargin'],
}, ensure_ascii=False, indent=2))
