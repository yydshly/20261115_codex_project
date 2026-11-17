import { TreeMotion } from './wind.mjs';
import { loadFreeAssets } from './free-assets.mjs';
const BASE = new URL('../assets/trees/', import.meta.url);
export async function loadAssets() {
  const response = await fetch(new URL('manifest.json', BASE));
  if (!response.ok) throw new Error('找不到本地素材清单。请先运行素材准备脚本。');
  const manifest = await response.json();
  const images = new Map();
  await Promise.all(manifest.files.map(async ({ file }) => {
    const image = new Image(); image.src = new URL(file, BASE).href;
    try { await image.decode(); } catch { throw new Error(`本地素材 ${file} 未准备好。请按项目说明准备原文素材。`); }
    images.set(file, image);
  }));
  return { manifest, rigs: Object.fromEntries(manifest.rigs.map(r => [r.kind, r])), images, free: await loadFreeAssets() };
}
export function makeTree(assets, kind, x, y, scale = 1) { return new TreeMotion(assets.rigs[kind], x, y, scale); }
export function drawTree(ctx, tree, assets, { alpha = 1, split = false, mode = 'layered', shadow = true } = {}) {
  const { rig, x, y, scale: s, offsets } = tree;
  const ox = rig.origin[0], oy = rig.origin[1];
  ctx.save(); ctx.globalAlpha *= alpha; ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y)); ctx.scale(s, s);
  if (shadow) {
    ctx.save(); ctx.globalAlpha *= .18; ctx.transform(1, -.02, -.65, -.22, 5, 2);
    ctx.drawImage(assets.images.get(rig.full), -ox, -oy);
    ctx.restore();
  }
  if (mode === 'static') ctx.drawImage(assets.images.get(rig.full), -ox, -oy);
  else if (mode === 'whole') {
    const image = assets.images.get(rig.full);
    for (let row = 0; row < rig.height; row++) {
      const shift = Math.round(tree.lean * 1.8 * (1 - row / rig.height) ** 1.5);
      ctx.drawImage(image, 0, row, rig.width, 1, -ox + shift, row - oy, rig.width, 1);
    }
  } else {
    ctx.drawImage(assets.images.get(rig.inside), -ox, -oy);
    ctx.drawImage(assets.images.get(rig.trunk), -ox, -oy);
    rig.clumps.forEach((c, i) => {
      const [dx, dy] = offsets[i];
      const extraX = split ? (c.cx - ox) * .35 : 0;
      const extraY = split ? (c.cy - rig.height * .3) * .28 - 8 : 0;
      ctx.drawImage(assets.images.get(c.file), Math.round(-ox + dx + extraX), Math.round(-oy + dy + extraY));
      if (split) {
        ctx.fillStyle = `hsl(${i * 137.5} 65% 70% / .8)`;
        ctx.fillRect(Math.round(c.cx - ox + dx + extraX), Math.round(c.cy - oy + dy + extraY), 2, 2);
      }
    });
  }
  ctx.restore();
}
