"""Recover native-grid sprites and masks from two author-provided diagram images.

This is asset preparation, not new artwork generation. Needs Pillow and numpy.
Usage: python scripts/prepare_assets.py --oak <diagram.png> --pine <diagram.png>
Article artwork is attributed research material; see THIRD_PARTY_NOTICES.md.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'web/assets/trees'
SOURCES = ROOT / 'web/assets/local-source'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def palette_clusters(data, count):
    """Deterministic farthest-point colour clustering of the tinted diagram."""
    centers = [np.median(data, axis=0)]
    for _ in range(count - 1):
        d = ((data[:, None] - np.array(centers)[None]) ** 2).sum(2).min(1)
        centers.append(data[d.argmax()])
    centers = np.array(centers)
    for _ in range(40):
        labels = ((data[:, None] - centers[None]) ** 2).sum(2).argmin(1)
        updated = np.array([np.median(data[labels == n], axis=0)
                            if (labels == n).any() else centers[n]
                            for n in range(count)])
        if np.max(abs(updated - centers)) < .01:
            break
        centers = updated
    return labels


def write_rig(kind, original, labels, count, origin, source):
    bg = np.array([40, 62, 54])
    solid = np.max(abs(original.astype(float) - bg), axis=2) > 6
    labels[~solid] = -1
    rgba = np.concatenate([original, (solid * 255).astype('uint8')[..., None]], 2)
    Image.fromarray(rgba).save(OUT / f'{kind}-full.png')
    trunk = rgba.copy()
    trunk[labels >= 0] = 0
    Image.fromarray(trunk).save(OUT / f'{kind}-trunk.png')
    inside = rgba.copy()
    inside[..., :3] = (inside[..., :3].astype(float) * .58).astype('uint8')
    # Full, darker source fills gaps; the original fixed trunk is drawn on top.
    Image.fromarray(inside).save(OUT / f'{kind}-inside.png')
    clumps = []
    for n in range(count):
        mask = labels == n
        if not mask.any():
            raise ValueError(f'{kind}: empty clump {n}')
        ys, xs = np.where(mask)
        layer = rgba.copy()
        layer[~mask] = 0
        name = f'{kind}-clump-{n:02d}.png'
        Image.fromarray(layer).save(OUT / name)
        clumps.append({'file': name, 'cx': round(float(xs.mean()), 2),
                       'cy': round(float(ys.mean()), 2), 'pixels': int(mask.sum())})
    reconstructed = trunk.copy()
    for n in range(count):
        reconstructed[labels == n] = rgba[labels == n]
    if not np.array_equal(reconstructed, rgba):
        raise ValueError('Layer reconstruction differs from source sprite')
    return {'kind': kind, 'width': int(original.shape[1]), 'height': int(original.shape[0]),
            'origin': origin, 'full': f'{kind}-full.png', 'trunk': f'{kind}-trunk.png',
            'inside': f'{kind}-inside.png', 'clumps': clumps,
            'source': source, 'reconstructionExact': True}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--oak', required=True, type=Path)
    ap.add_argument('--pine', required=True, type=Path)
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    SOURCES.mkdir(parents=True, exist_ok=True)
    oak_path = SOURCES / 'oak-diagram.png'
    pine_path = SOURCES / 'pine-diagram.png'
    for src, dest in [(args.oak, oak_path), (args.pine, pine_path)]:
        if src.resolve() != dest.resolve():
            shutil.copyfile(src, dest)
    # Author's figures are nearest-neighbour enlarged by four; use native pixels.
    oak = np.asarray(Image.open(oak_path).convert('RGB'))[::4, ::4]
    original = oak[:, :105].copy()
    tinted = np.roll(oak[:, 105:210], 2, axis=1).astype(float)
    moving = np.max(abs(tinted - original.astype(float)), axis=2) > 8
    # Recover the author diagram's colour overlay, then its fourteen regions.
    colors = (tinted - original.astype(float) * .45) / .55
    labels = np.full(moving.shape, -1, dtype=int)
    labels[moving] = palette_clusters(colors[moving], 14)
    rigs = [write_rig('oak', original, labels, 14, [55, 100], 'oak-diagram.png')]
    pine = np.asarray(Image.open(pine_path).convert('RGB'))[::4, ::4]
    original = pine[:, :66].copy()
    yy, xx = np.indices(original.shape[:2])
    solid = np.max(abs(original.astype(float) - [40, 62, 54]), axis=2) > 6
    hsv = np.asarray(Image.fromarray(original).convert('HSV'))
    foliage = solid & (yy < 168) & ~((hsv[..., 0] < 30) & (hsv[..., 1] > 55))
    # Pine's branch tiers are the eight visibly separated regions in the figure.
    boundaries = [68, 80, 94, 108, 124, 141, 158]
    labels = np.full(solid.shape, -1, dtype=int)
    labels[foliage] = np.digitize(yy[foliage], boundaries)
    rigs.append(write_rig('pine', original, labels, 8, [35, 203], 'pine-diagram.png'))
    files = sorted(OUT.glob('*.png'))
    manifest = {'version': 1, 'prepared': '2026-11-15',
                'article': 'https://www.spritecook.ai/blog/pixel-art-trees-wind-animation',
                'usage': 'Attributed article-art study and comparison; no standalone asset pack or third-party relicensing.',
                'sources': [{'file': p.name, 'sha256': sha(p), 'bytes': p.stat().st_size}
                            for p in [oak_path, pine_path]],
                'rigs': rigs,
                'files': [{'file': p.name, 'sha256': sha(p), 'bytes': p.stat().st_size} for p in files]}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'rigs': [(r['kind'], len(r['clumps'])) for r in rigs],
                      'images': len(files), 'bytes': sum(p.stat().st_size for p in files),
                      'exactReconstruction': True}))


if __name__ == '__main__':
    main()
