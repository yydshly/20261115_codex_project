"""Read-only VGGT multi-view inference with explicit mixed-precision staging.

No optimization, Gaussian training, Blender access, downloads or source edits.
Aggregates all group views jointly in BF16, then evaluates the existing camera
and depth heads in FP32, one depth frame at a time to reduce peak GPU memory.
"""
import argparse
import functools
import gc
import hashlib
import importlib.util
import json
import os
import struct
import sys
import time
from pathlib import Path

os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
import numpy as np
from PIL import Image
import torch


def sha256(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as stream:
        for block in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--width', type=int, default=518)
    args = parser.parse_args()
    cfg = json.loads(Path(args.manifest).read_text(encoding='utf-8'))
    out = Path(cfg['out'])
    out.mkdir(parents=True, exist_ok=True)
    cfg['width'] = args.width
    (out / 'manifest.json').write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding='utf-8')
    sys.path.insert(0, cfg['model_source'])
    # Reuse the already installed pure-Python einops package without changing
    # either venv or placing the CPU torch environment ahead of CUDA packages.
    einops_origin = Path(cfg['weights']).parents[1] / '.venv/Lib/site-packages/einops'
    if importlib.util.find_spec('einops') is None:
        spec = importlib.util.spec_from_file_location('einops', einops_origin / '__init__.py',
                                                      submodule_search_locations=[str(einops_origin)])
        module = importlib.util.module_from_spec(spec)
        sys.modules['einops'] = module
        spec.loader.exec_module(module)
    from vggt.models.vggt import VGGT
    from vggt.utils.load_fn import load_and_preprocess_images
    from vggt.utils.pose_enc import pose_encoding_to_extri_intri

    torch.set_num_threads(6)
    if not torch.cuda.is_available():
        raise RuntimeError('Existing CUDA runtime is required for this staged runner')
    before = {path: sha256(path) for path in cfg['protected_sources']}
    for view in cfg['views']:
        view['sha256'] = sha256(view['path'])
        view['original_size_wh'] = list(Image.open(view['path']).size)
    source_hashes = {str(path.relative_to(cfg['model_source'])): sha256(path)
                     for path in Path(cfg['model_source']).rglob('*.py')}
    started = time.perf_counter()
    print('BUILD_META', flush=True)
    linspace = torch.linspace
    torch.linspace = functools.partial(linspace, device='cpu')
    try:
        with torch.device('meta'):
            model = VGGT(enable_point=False, enable_track=False)
    finally:
        torch.linspace = linspace
    names = set(model.state_dict())
    state = {}
    print('LOAD_EXISTING_WEIGHTS', len(names), flush=True)
    with open(cfg['weights'], 'rb') as stream:
        header_length = struct.unpack('<Q', stream.read(8))[0]
        header = json.loads(stream.read(header_length))
        data_start = 8 + header_length
        for name in sorted(names):
            info = header[name]
            if info['dtype'] != 'F32':
                raise RuntimeError((name, info['dtype']))
            start, end = info['data_offsets']
            stream.seek(data_start + start)
            array = np.fromfile(stream, dtype='<f4', count=(end - start) // 4).reshape(info['shape'])
            dtype = torch.bfloat16 if name.startswith('aggregator.') else torch.float32
            state[name] = torch.from_numpy(array).to(device='cuda', dtype=dtype)
    del array
    model.load_state_dict(state, assign=True)
    del state
    # The upstream normalization constants are non-persistent CPU buffers and
    # are not present in the checkpoint state dict loaded above.
    model.aggregator._resnet_mean = torch.tensor([0.485, 0.456, 0.406], device='cuda').view(1, 1, 3, 1, 1)
    model.aggregator._resnet_std = torch.tensor([0.229, 0.224, 0.225], device='cuda').view(1, 1, 3, 1, 1)
    model.eval()
    gc.collect()
    torch.cuda.empty_cache()
    print('MODEL_READY_GIB', torch.cuda.memory_allocated() / 2**30, flush=True)
    by_id = {view['id']: view for view in cfg['views']}
    records = []
    for group in cfg['groups']:
        dest = out / group['id']
        dest.mkdir(exist_ok=True)
        if (dest / 'prediction.npz').exists():
            raise RuntimeError('Refusing to overwrite completed inference: ' + str(dest))
        views = [by_id[key] for key in group['view_ids']]
        images = load_and_preprocess_images([view['path'] for view in views], mode='crop')
        if args.width != 518:
            height = round(images.shape[-2] * args.width / 518 / 14) * 14
            images = torch.nn.functional.interpolate(images, size=(height, args.width), mode='bilinear', align_corners=False)
        if images.shape[-2] % 14 or images.shape[-1] % 14:
            raise RuntimeError('Patch-grid incompatible image size')
        height, width = images.shape[-2:]
        rgb = (images.permute(0, 2, 3, 1).numpy() * 255).round().astype('uint8')
        images = images[None].to('cuda')
        torch.cuda.reset_peak_memory_stats()
        t = time.perf_counter()
        print('GROUP_START', group['id'], list(images.shape), flush=True)
        with torch.inference_mode(), torch.autocast('cuda', dtype=torch.bfloat16):
            tokens, patch_start = model.aggregator(images)
        torch.cuda.synchronize()
        print('AGGREGATED', group['id'], round(time.perf_counter() - t, 2), flush=True)
        tokens = [value.float() if value is not None else None for value in tokens]
        with torch.inference_mode(), torch.autocast('cuda', enabled=False):
            pose = model.camera_head(tokens)[-1]
            extrinsic, intrinsic = pose_encoding_to_extri_intri(pose.float(), (height, width))
            depth, confidence = model.depth_head(tokens, images=images, patch_start_idx=patch_start, frames_chunk_size=1)
        torch.cuda.synchronize()
        np.savez_compressed(dest / 'prediction.npz', rgb=rgb,
                            depth=depth[0, :, :, :, 0].float().cpu().numpy(),
                            confidence=confidence[0].float().cpu().numpy(),
                            K=intrinsic[0].float().cpu().numpy(),
                            extrinsic=extrinsic[0].float().cpu().numpy(),
                            pose_encoding=pose[0].float().cpu().numpy())
        for index, view in enumerate(views):
            Image.fromarray(rgb[index]).save(dest / (view['id'] + '-input.png'))
        record = {'group': group['id'], 'view_ids': group['view_ids'], 'shape_bschw': list(images.shape),
                  'seconds': time.perf_counter() - t,
                  'peak_allocated_gib': torch.cuda.max_memory_allocated() / 2**30,
                  'finite_depth': bool(torch.isfinite(depth).all().item()),
                  'finite_pose': bool(torch.isfinite(pose).all().item())}
        records.append(record)
        (dest / 'inference.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
        print('GROUP_DONE', json.dumps(record), flush=True)
        del images, tokens, depth, confidence, pose, extrinsic, intrinsic
        gc.collect()
        torch.cuda.empty_cache()
    after = {path: sha256(path) for path in cfg['protected_sources']}
    report = {'model': 'facebook/VGGT-1B', 'source_commit_name': Path(cfg['model_source']).name,
              'source_file_sha256': source_hashes, 'weights_sha256': sha256(cfg['weights']),
              'torch': torch.__version__, 'device': torch.cuda.get_device_name(),
              'reused_pure_python_dependency': str(einops_origin),
              'precision': 'BF16 aggregator, FP32 camera and depth heads, one depth frame per chunk',
              'source_note': 'Read existing local source; cached layer policy, if present, is recorded by file hashes. No upstream source edited.',
              'view_manifest': cfg['views'], 'groups': records,
              'total_seconds': time.perf_counter() - started,
              'protected_sources_before': before, 'protected_sources_after': after,
              'all_protected_unchanged': before == after,
              'gaussian_training': False, 'old_model_edits': False,
              'scale': 'Joint inferred gauge, no independent metric calibration'}
    (out / 'inference.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print('ALL_DONE', round(report['total_seconds'], 2), 'PROTECTED', before == after, flush=True)


if __name__ == '__main__':
    main()
