export const riverX = y => 522 + Math.sin((y - 100) / 77) * 26;
export function makeWalkable(trees = [], props = []) {
  return (x, y) => {
    if (!Number.isFinite(x)||!Number.isFinite(y)) return false;
    if (x < 38 || x > 925 || y < 282 || y > 571) return false;
    if (Math.abs(x - riverX(y)) < 39 && !(y > 407 && y < 437)) return false;
    if (x > 681 && x < 827 && y < 330) return false;
    if (props.some(p => p.rx ? ((x-p.x)/(p.rx+5))**2+((y-p.y)/(p.ry+5))**2<1 : p.radius && Math.hypot(x-p.x,y-p.y) < p.radius+5)) return false;
    return !trees.some(t => Math.hypot(x - t.x, y - t.y) < (t.rig.kind === 'pine' ? 9 : 13) * t.scale);
  };
}
export function findPath(start, goal, walkable) {
  const step = 12, key = (x, y) => `${x},${y}`;
  const sx = Math.round(start.x / step), sy = Math.round(start.y / step);
  let gx = Math.round(goal.x / step), gy = Math.round(goal.y / step);
  if (!walkable(gx * step, gy * step)) {
    let best = Infinity, target;
    for (let dx = -7; dx <= 7; dx++) for (let dy = -7; dy <= 7; dy++) {
      const x = gx + dx, y = gy + dy;
      if (walkable(x * step, y * step) && dx * dx + dy * dy < best) { best = dx * dx + dy * dy; target = [x, y]; }
    }
    if (!target) return [];
    [gx, gy] = target;
  }
  const first = { x: sx, y: sy, cost: 0, score: 0, prev: null };
  const open = [first], costs = new Map([[key(sx, sy), 0]]);
  let examined = 0;
  while (open.length && examined++ < 7000) {
    open.sort((a, b) => a.score - b.score);
    const c = open.shift();
    if (c.x === gx && c.y === gy) {
      const path = []; let n = c;
      while (n.prev) { path.push({ x: n.x * step, y: n.y * step }); n = n.prev; }
      return path.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const x = c.x + dx, y = c.y + dy;
      if (!walkable(x * step, y * step)) continue;
      if (dx && dy && (!walkable(c.x * step, y * step) || !walkable(x * step, c.y * step))) continue;
      const cost = c.cost + Math.hypot(dx, dy)*(walkable.cost?.(x*step,y*step)??1), k = key(x, y);
      if (cost >= (costs.get(k) ?? Infinity)) continue;
      costs.set(k, cost);
      open.push({ x, y, cost, score: cost + Math.hypot(gx - x, gy - y)*(walkable.minCost??1), prev: c });
    }
  }
  return [];
}
