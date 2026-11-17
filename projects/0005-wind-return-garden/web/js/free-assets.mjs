const BASE = new URL('../assets/free-samples/', import.meta.url);

export function frameRect(state, time = 0) {
  const frame = Math.floor(Math.max(0, time) * state.fps) % state.frames;
  return [frame * state.frameWidth, 0, state.frameWidth, state.frameHeight];
}

export async function loadFreeAssets() {
  const response = await fetch(new URL('manifest.json', BASE));
  if (!response.ok) throw new Error('免费素材清单未能读取，请检查本地文件。');
  const manifest = await response.json(), images = new Map();
  await Promise.all(manifest.files.filter(f => f.file.endsWith('.png')).map(async f => {
    const image = new Image(); image.src = new URL(f.file, BASE).href;
    try { await image.decode(); } catch { throw new Error(`免费素材缺失：${f.file}`); }
    if (image.naturalWidth !== f.width || image.naturalHeight !== f.height) throw new Error(`免费素材尺寸不符：${f.file}`);
    images.set(f.file, image);
  }));
  return { manifest, images, entries: Object.fromEntries(manifest.assets.map(a => [a.id, a])) };
}

// The game and the material ledger use exactly the same frame, scale and anchor.
export function drawSample(c, assets, id, x, y, { time = 0, state = 'idle', face = 1, scale, tone = true } = {}) {
  const entry = assets.entries[id], pose = entry.states[state] || entry.states.idle;
  const s = scale ?? pose.scale, [ax, ay] = pose.anchor;
  c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(face < 0 ? -1 : 1, 1);
  c.imageSmoothingEnabled = false;
  if (tone) c.filter = 'saturate(0.68) brightness(0.98)';
  c.drawImage(assets.images.get(pose.file), ...frameRect(pose, time), Math.round(-ax*s), Math.round(-ay*s), Math.round(pose.frameWidth*s), Math.round(pose.frameHeight*s));
  c.restore();
}

export const GARDEN_PROPS = [
  { id:'well', x:326, y:373, radius:17 },
  { id:'barrel', x:669, y:350, radius:12 },
  { id:'crate', x:853, y:348, radius:13 },
  { id:'pot', x:834, y:378, radius:10 },
  { id:'bread', x:423, y:485, radius:0 },
  { id:'apple', x:438, y:484, radius:0 }
];
export const CARE_SPOTS = [
  { id:'well', x:326, y:399, name:'井边小记', note:'井沿已经擦净，小桶留在门边。今天不用急着做什么，听一会儿水声也很好。' },
  { id:'pantry', x:855, y:398, name:'门前生活角', note:'木桶、木箱和旧陶盆都还在原处。有人把日子照料得很小，也很认真。' },
  { id:'picnic', x:427, y:509, name:'椅边的小点心', note:'面包和苹果留在椅边。给晚归的人一点寻常的照料，不用完成什么也值得歇息。' }
];
