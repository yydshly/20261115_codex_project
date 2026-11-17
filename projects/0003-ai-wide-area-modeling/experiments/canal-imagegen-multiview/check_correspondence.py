"""2D-only correspondence screening. No camera pose solving or 3D reconstruction.

F is fitted on a spatially split subset of tentative SIFT matches. Held-out
residuals screen matching/image inconsistencies; they are not ground-truth
geometry errors. A good F may also fit planar/degenerate data.
"""
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np

PROJECT = Path(__file__).resolve().parents[2]
ASSETS = PROJECT / "assets" / "canal-imagegen-multiview"
FILES = {
    "original": PROJECT / "assets" / "canal-single-vggt" / "reference.png",
    "left": ASSETS / "left-v1.png",
    "right": ASSETS / "right-v1.png",
}
PAIR_MATCHES = {}


def sampson_pixels(fundamental, points_a, points_b):
    a = np.column_stack((points_a, np.ones(len(points_a))))
    b = np.column_stack((points_b, np.ones(len(points_b))))
    fa = a @ fundamental.T
    fb = b @ fundamental
    numerator = np.sum(b * fa, axis=1) ** 2
    denominator = fa[:, 0] ** 2 + fa[:, 1] ** 2 + fb[:, 0] ** 2 + fb[:, 1] ** 2
    return np.sqrt(numerator / np.maximum(denominator, 1e-20))


def prepare(path):
    image = cv2.imread(str(path))
    if image is None:
        raise RuntimeError(f"Cannot read {path}")
    height, width = image.shape[:2]
    mask = np.zeros((height, width), np.uint8)
    # Broad architecture and bridge regions; these are not semantic truth masks.
    # Avoid most sky, water reflections and trees when comparing image geometry.
    for x0, y0, x1, y1 in [(0.035, 0.20, 0.60, 0.70), (0.62, 0.49, 0.94, 0.69)]:
        mask[int(y0 * height):int(y1 * height), int(x0 * width):int(x1 * width)] = 255
    keypoints, descriptors = cv2.SIFT_create(nfeatures=7000).detectAndCompute(
        cv2.cvtColor(image, cv2.COLOR_BGR2GRAY), mask
    )
    points = np.float64([point.pt for point in keypoints])
    return image.shape[:2], points, descriptors


def pair(name_a, name_b, prepared):
    shape_a, points_a, desc_a = prepared[name_a]
    shape_b, points_b, desc_b = prepared[name_b]
    matcher = cv2.BFMatcher(cv2.NORM_L2)
    forward = matcher.knnMatch(desc_a, desc_b, k=2)
    backward = matcher.knnMatch(desc_b, desc_a, k=2)
    reverse = {m.queryIdx: m.trainIdx for m, n in backward if m.distance < 0.72 * n.distance}
    matches = [m for m, n in forward if m.distance < 0.72 * n.distance
               and reverse.get(m.trainIdx) == m.queryIdx]
    PAIR_MATCHES[(name_a, name_b)] = {m.queryIdx: m.trainIdx for m in matches}
    a = np.float64([points_a[m.queryIdx] for m in matches])
    b = np.float64([points_b[m.trainIdx] for m in matches])
    # Deterministic spatial block split, not an independent observed-view test.
    blocks = np.floor(a / 64).astype(int)
    is_test = ((blocks[:, 0] + 2 * blocks[:, 1]) % 3) == 0
    train = ~is_test
    cv2.setRNGSeed(20261116)
    f, mask = cv2.findFundamentalMat(a[train], b[train], cv2.USAC_MAGSAC,
                                    1.5, 0.999, 10000)
    h, hmask = cv2.findHomography(a[train], b[train], cv2.USAC_MAGSAC,
                                 3.0, maxIters=10000, confidence=0.999)
    if f is None or f.shape != (3, 3):
        return {"pair": [name_a, name_b], "mutual_ratio_matches": len(matches),
                "status": "no fundamental fit"}
    error = sampson_pixels(f, a, b)
    test_error = error[is_test]
    prediction = cv2.perspectiveTransform(a.reshape(-1, 1, 2), h).reshape(-1, 2)
    herror = np.linalg.norm(prediction - b, axis=1)
    report = {
        "pair": [name_a, name_b],
        "mutual_ratio_matches": len(matches),
        "fit_matches": int(train.sum()),
        "held_out_matches": int(is_test.sum()),
        "fundamental_fit_inlier_fraction": float(mask.mean()),
        "held_out_sampson_median_px": float(np.median(test_error)),
        "held_out_sampson_p90_px": float(np.percentile(test_error, 90)),
        "held_out_fraction_within_1_5px": float(np.mean(test_error <= 1.5)),
        "held_out_fraction_over_5px": float(np.mean(test_error > 5)),
        "homography_fit_inlier_fraction": float(hmask.mean()),
        "held_out_homography_median_px": float(np.median(herror[is_test])),
        "fundamental_matrix": f.tolist(),
        "regional_screening": {},
    }
    for region, selection in {
        "architecture_rectangle": a[:, 0] < shape_a[1] * 0.62,
        "bridge_rectangle": a[:, 0] >= shape_a[1] * 0.62,
    }.items():
        held = selection & is_test
        report["regional_screening"][region] = {
            "tentative_matches": int(selection.sum()),
            "held_out_matches": int(held.sum()),
            "held_out_median_px": float(np.median(error[held])) if held.any() else None,
        }
    # Save actual sparse matches for optional independent inspection.
    np.savez(ASSETS / f"matches-{name_a}-{name_b}.npz", a=a, b=b,
             held_out=is_test, sampson_error=error)
    return report


def main():
    prepared = {name: prepare(path) for name, path in FILES.items()}
    report = {
        "method": "2D mutual SIFT matching, ratio 0.72; spatial 2/3 fit, 1/3 check; F and H RANSAC",
        "opencv_version": cv2.__version__,
        "no_3d_reconstruction": True,
        "no_model_files_modified": True,
        "limitations": [
            "Tentative feature matches can be incorrect, especially repeated windows or generated textures.",
            "A low fundamental residual is necessary only for reliable rigid point correspondences, not sufficient to prove a shared 3D world.",
            "Large homography support or near-zero baseline can make the test degenerate.",
            "Generated views and assumed camera instructions are not independent geometric ground truth.",
            "No real camera intrinsics/extrinsics, depth, metric scale or hidden surfaces are verified.",
            "Near-horizontal epipolar lines are insensitive to horizontal shape edits; this screen cannot certify rigid geometry.",
        ],
        "images": {name: {"path": str(path), "shape_hw": list(prepared[name][0]),
                           "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                           "sift_keypoints": len(prepared[name][1])}
                   for name, path in FILES.items()},
        "pairs": [pair(a, b, prepared) for a, b in
                  [("original", "left"), ("original", "right"), ("left", "right")]],
    }
    original_left = PAIR_MATCHES[("original", "left")]
    original_right = PAIR_MATCHES[("original", "right")]
    left_right = PAIR_MATCHES[("left", "right")]
    common = set(original_left) & set(original_right)
    closed = [point for point in common
              if left_right.get(original_left[point]) == original_right[point]]
    report["three_view_match_cycles"] = {
        "original_keypoints_matched_to_both": len(common),
        "also_closed_by_direct_left_right_matching": len(closed),
        "meaning": "2D descriptor track agreement only; no 3D point or pose was reconstructed.",
    }
    (ASSETS / "correspondence-report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"pairs": report["pairs"]}, indent=2))


if __name__ == "__main__":
    main()
