# Imported natural model assets

Retrieved on **2026-11-15** from Poly Haven's public model catalog and file manifests. These are downloaded, textured glTF mesh assets, not locally generated placeholder primitives. Existing scene assets and `vegetation.js` were not changed.

All four assets are **CC0 1.0**. Poly Haven explicitly permits commercial use and redistribution, including shipping assets with a project. Attribution is not required by CC0; the original artists are credited below. Official [Poly Haven asset license](https://polyhaven.com/license) and [CC0 1.0 legal text](https://creativecommons.org/publicdomain/zero/1.0/legalcode).

| Asset / original artist | Entrypoint relative to this directory | Downloaded glTF triangles | Bundle size |
| --- | --- | ---: | ---: |
| [Rock 07](https://polyhaven.com/a/rock_07) — Jenelle van Heerden | `rock_07/rock_07_1k.gltf` | 14,844 | 2,184,088 bytes |
| [Rock Moss Set 01](https://polyhaven.com/a/rock_moss_set_01) — Kless Gyzen | `rock_moss_set_01/rock_moss_set_01_1k.gltf` | 63,127 across six rocks | 1,937,065 bytes |
| [Shrub 03](https://polyhaven.com/a/shrub_03) — Rico Cilliers | `shrub_03/shrub_03_1k.gltf` | 8,287 across four botanical variants | 1,707,862 bytes, including supplemental opacity PNG |
| [Pine Sapling Small](https://polyhaven.com/a/pine_sapling_small) — Rob Tuytel (photography), Rico Cilliers (modeling) | `pine_sapling_small/pine_sapling_small_1k.gltf` | 398,144 across three complete young trees | 22,051,235 bytes, including supplemental opacity PNG |

**Total: 27,880,250 bytes (26.59 MiB), 25 files.** Each bundle includes the official glTF JSON, its binary geometry buffer, and 1k JPEG PBR textures (three per rock/shrub asset, six for the pine). Shrub and pine also include their official 1k PNG opacity maps, assigned by the scene at runtime. Relative URIs and original filenames remain unchanged. Nothing has been resampled, simplified, recolored or repackaged; glTF JSON files remain unchanged.

## Source and integrity record

- Catalog: <https://api.polyhaven.com/assets?t=models>
- Asset manifests: <https://api.polyhaven.com/files/rock_07>, <https://api.polyhaven.com/files/rock_moss_set_01>, <https://api.polyhaven.com/files/shrub_03>, <https://api.polyhaven.com/files/pine_sapling_small>
- Download origins: `https://dl.polyhaven.org/file/ph-assets/Models/...`
- [`manifest.json`](manifest.json) records every exact source URL, original MD5, local SHA-256, byte length, author and license reference.
- All 25 downloaded file lengths and MD5 values matched the public download manifests. Local SHA-256 values were calculated after downloading.
- glTF buffers and images were checked for missing local dependencies; all 19 external dependency references resolve. The two supplemental runtime opacity textures are also present and verified.
- Triangle counts below come from this downloaded glTF's index accessors and default scene node instances, rather than the catalog's broader source-model polycount.

## Three.js import notes

Use Three.js **0.180.0 `GLTFLoader`**. These files contain ordinary glTF 2.0 buffers and JPEG images. No Draco, Meshopt, Basis/KTX2 or other special decoder is required. The rock/shrub models use no extensions; the pine uses `KHR_materials_specular` and `KHR_materials_ior`, both supported directly by the installed Three.js loader. No model has required extensions. Keep the model directories and their `textures/` subdirectories intact. Use a local HTTP server rather than opening the glTF through `file://`.

Rock materials are double-sided opaque PBR materials. Shrub leaves and pine needles use double-sided `MASK` materials. Retain imported UVs, normals and PBR textures; apply the official opacity maps below to remove the black diffuse-background rectangles in the JPEG glTF export.

### Required runtime opacity maps

The official glTF packages use JPEG diffuse textures. JPEG has no alpha channel, even when the glTF material declares `MASK`. Consequently, loading only the original glTF dependency set can render black rectangular leaf cards. The following **additional official, unmodified PNG opacity maps** are included for runtime assignment; they are not referenced by a rewritten glTF.

| PNG relative to this directory | Exact imported material name | Size |
| --- | --- | ---: |
| `shrub_03/textures/shrub_03_alpha_1k.png` | `shrub_03` | 79,069 bytes |
| `pine_sapling_small/textures/pine_sapling_small_twig_alpha_1k.png` | `pine_sapling_small_twig` | 159,896 bytes |

Do **not** assign the pine opacity map to `pine_sapling_small_bark`, which remains opaque. Both PNGs are 1024 × 1024, single-channel 16-bit grayscale with a source range of 0–65535. Browser PNG decoding supplies grayscale values to RGB, so the green channel read by Three.js `alphaMap` is the intended opacity channel: white is opaque, black is transparent. The shrub map's leaf/twig silhouettes and the pine map's authored UV opacity layout were visually inspected.

For each mapped material, load the corresponding PNG and set:

```js
opacityTexture.colorSpace = THREE.NoColorSpace;
opacityTexture.flipY = false;
material.alphaMap = opacityTexture;
material.alphaTest = 0.35;
material.transparent = false;
material.opacity = 1;
material.needsUpdate = true;
```

These values and per-file SHA-256 checksums are recorded in `manifest.json` under `opacity_override`. Images must be treated as linear opacity data, without sRGB conversion. The selected pine map is the API's `twig_alpha` PNG; the separately listed `twig_mask` texture is not used here.

The multi-model assets contain individual variants arranged side by side for presentation. Select a child, clone it, calculate its bounding box, and normalize its horizontal centre and lowest Y before placing it into the scene. Loading the full group as one shrub/tree would also include the presentation offsets.

### Rock 07

- Node: `rock_07`; mesh: `realCap_Model_3`.
- Default-scene bounding size: **0.1689 × 0.1437 × 0.3203 m** (X × Y × Z).
- Small rock/stone model; scale deliberately if using it as a larger riverbank rock.

### Rock Moss Set 01

| Child node | Triangles | Bounding size in metres, X × Y × Z |
| --- | ---: | --- |
| `rock_moss_set_01_rock01` | 11,000 | 2.2376 × 1.4727 × 3.3688 |
| `rock_moss_set_01_rock02` | 10,996 | 2.6554 × 1.2620 × 3.2637 |
| `rock_moss_set_01_rock03` | 5,000 | 2.1086 × 1.0997 × 2.0796 |
| `rock_moss_set_01_rock04` | 10,589 | 2.1276 × 1.7683 × 1.9647 |
| `rock_moss_set_01_rock05` | 16,548 | 1.8173 × 1.2055 × 2.9987 |
| `rock_moss_set_01_rock06` | 8,994 | 2.1260 × 1.2619 × 2.7573 |

### Shrub 03

| Child node | Triangles | Bounding size in metres, X × Y × Z |
| --- | ---: | --- |
| `shrub_03_a` | 2,385 | 0.2006 × 0.4028 × 0.1512 |
| `shrub_03_b` | 2,134 | 0.1843 × 0.3525 × 0.1226 |
| `shrub_03_c` | 1,790 | 0.0958 × 0.3044 × 0.1132 |
| `shrub_03_d` | 1,978 | 0.1128 × 0.2556 × 0.0893 |

These are imported botanical mesh variants, suitable for small detailed foreground plants. They are not a mature tree or a flowering hydrangea. Their scale and species should not be represented as a literal match for the reference video.

Bounds were calculated from glTF POSITION accessor bounds with default-scene node transforms applied. glTF defines metre-based units; no independent physical measurement was performed.

### Pine Sapling Small

| Child node | Triangles | Bounding size in metres, X × Y × Z |
| --- | ---: | --- |
| `pine_sapling_small_a` | 142,506 | 0.7877 × 1.2990 × 0.7274 |
| `pine_sapling_small_b` | 122,235 | 0.5288 × 1.0456 × 0.7303 |
| `pine_sapling_small_c` | 133,403 | 0.5128 × 0.9613 × 0.5800 |

These are complete imported young pine models, including bark, branching structure and needles. Select one named variant (a group containing two material primitives), normalize its presentation translation, then scale intentionally for scene use. The native asset represents young pines rather than a mature spreading deciduous or flowering tree. There are no LODs in this downloaded set. Limit the number of simultaneously visible high-detail copies; each selected tree is roughly 122–143k triangles and two draw calls before shadows.

## Focused tree selection checks

The initially considered [Jacaranda Tree](https://polyhaven.com/a/jacaranda_tree) was inspected through its small official glTF JSON only. It contains one `jacaranda_tree_LOD0` node, three material primitives with **1,231,286 + 230,112 + 2,402,434 = 3,863,832 triangles**, and no complete lower-detail variant. Its 1k manifest references a **208,307,808-byte geometry binary**, before approximately 6.3 MB of textures. The middle primitive's buffer data occupy bytes 55,248,568–63,350,543 (inclusive), but that is only one structural portion of the tree, not a complete tree with canopy. Its large binary was **not downloaded**.

Other catalog-listed candidates were checked through official file manifests: Fir Sapling (21,677,180-byte binary), Quiver Tree 02 (2,060,604-byte binary; desert succulent appearance), and Searsia Lucida (17,913,396-byte binary; dry-region bush/tree). The pine's **17,771,796-byte binary**, three complete variants and closer forest/valley appearance made it the selected actual tree set. The downloaded set now includes **two rock assets, a botanical shrub set and an actual tree set**. Candidate inspection facts and URLs are recorded in `manifest.json`.

## Verification boundary

File integrity, dependency presence, material flags, accessor triangle counts and default-scene bounds were checked. Final appearance, orientation, placement, repeated-instance performance and browser loading are verified by the owning scene integration; no browser rendering claim is made here.
