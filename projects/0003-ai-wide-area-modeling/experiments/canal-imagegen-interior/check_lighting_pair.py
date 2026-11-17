"""Screen generated on/off images in 2D; do not estimate/reconstruct 3D."""
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "assets" / "canal-imagegen-interior"
NAMES = ["approach", "interior-on-v1-threshold", "interior-on", "interior-off", "reverse"]


def load(name):
    image = cv2.imread(str(ASSETS / f"{name}.png"))
    if image is None:
        raise RuntimeError(name)
    return image


def luminance(image):
    rgb = image[:, :, ::-1].astype(np.float64) / 255
    linear = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    return linear @ np.array([0.2126, 0.7152, 0.0722])


def main():
    images = {name: load(name) for name in NAMES}
    on, off = images["interior-on"], images["interior-off"]
    ah, aw = on.shape[:2]
    bh, bw = off.shape[:2]
    sift = cv2.SIFT_create(nfeatures=9000)
    ka, da = sift.detectAndCompute(cv2.cvtColor(on, cv2.COLOR_BGR2GRAY), None)
    kb, db = sift.detectAndCompute(cv2.cvtColor(off, cv2.COLOR_BGR2GRAY), None)
    matcher = cv2.BFMatcher(cv2.NORM_L2)
    reverse = {m.queryIdx: m.trainIdx for m, n in matcher.knnMatch(db, da, k=2)
               if m.distance < 0.72 * n.distance}
    pairs = [m for m, n in matcher.knnMatch(da, db, k=2)
             if m.distance < 0.72 * n.distance and reverse.get(m.trainIdx) == m.queryIdx]
    a = np.float64([ka[m.queryIdx].pt for m in pairs])
    b = np.float64([kb[m.trainIdx].pt for m in pairs]) * [aw / bw, ah / bh]
    raw_error = np.linalg.norm(a - b, axis=1)
    blocks = np.floor(a / 64).astype(int)
    held = ((blocks[:, 0] + 2 * blocks[:, 1]) % 3) == 0
    cv2.setRNGSeed(20261116)
    homography, inliers = cv2.findHomography(a[~held], b[~held], cv2.USAC_MAGSAC,
                                            2.0, maxIters=10000, confidence=0.999)
    predicted = cv2.perspectiveTransform(a.reshape(-1, 1, 2), homography).reshape(-1, 2)
    residual = np.linalg.norm(predicted - b, axis=1)
    bins = np.floor(a / [aw / 8, ah / 5]).astype(int)
    geometry = {
        "method": "2D SIFT mutual ratio 0.72, raw displacement and spatially held-out homography check",
        "matched_features": len(pairs),
        "occupied_cells_of_8_by_5_grid": len(np.unique(bins, axis=0)),
        "raw_displacement_median_px": float(np.median(raw_error)),
        "raw_displacement_p90_px": float(np.percentile(raw_error, 90)),
        "raw_fraction_within_2px": float(np.mean(raw_error <= 2)),
        "homography": homography.tolist(),
        "fit_inlier_fraction": float(inliers.mean()),
        "held_out_features": int(held.sum()),
        "held_out_residual_median_px": float(np.median(residual[held])),
        "held_out_residual_p90_px": float(np.percentile(residual[held], 90)),
        "limitations": "Only matched visible texture is checked. Low-light regions may be absent; identities and full geometry are not certified.",
    }
    on_y, off_y = luminance(on), luminance(off)
    regions = {
        "nearest_pendant_bulb": [0.399, 0.133, 0.424, 0.173],
        "front_counter": [0.16, 0.69, 0.32, 0.76],
        "rear_shelves": [0.77, 0.39, 0.90, 0.56],
        "floor_aisle": [0.69, 0.79, 0.80, 0.94],
    }
    lighting = {}
    for name, (x0, y0, x1, y1) in regions.items():
        region_on = on_y[int(y0 * ah):int(y1 * ah), int(x0 * aw):int(x1 * aw)]
        region_off = off_y[int(y0 * bh):int(y1 * bh), int(x0 * bw):int(x1 * bw)]
        baseline = float(np.mean(region_on))
        edited = float(np.mean(region_off))
        lighting[name] = {"rectangle_normalized": [x0, y0, x1, y1],
                          "on_mean_linear_luminance": baseline,
                          "off_mean_linear_luminance": edited,
                          "off_to_on_ratio": edited / max(baseline, 1e-9)}
    report = {
        "scope": "Generated image lighting counterfactual and 2D layout screening, not 3D relighting",
        "opencv_version": cv2.__version__,
        "images": {name: {"shape_hw": list(im.shape[:2]),
                           "sha256": hashlib.sha256((ASSETS / f"{name}.png").read_bytes()).hexdigest()}
                   for name, im in images.items()},
        "same_camera_image_pair": geometry,
        "luminance_samples": lighting,
        "luminance_limit": "Image-domain measurements only. No calibrated exposure, light transport, albedo recovery or physical light control is established.",
        "spatial_consistency": "Not established. Reverse-view actual pose and continuity of counter/appliance positions remain unverified.",
        "native_3d_or_gaussian_light_control": False,
        "old_models_modified": False,
    }
    (ASSETS / "image-check.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"geometry": geometry, "luminance": lighting}, indent=2))


if __name__ == "__main__":
    main()
