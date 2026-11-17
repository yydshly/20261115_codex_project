// Independently implemented from SpriteCook's traveling-wave explanation.
// Positions are world pixels. Art poses are quantized separately from simulation.
export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export class WindField {
  constructor({ ambient = true } = {}) { this.time = 0; this.packets = []; this.ambient = ambient; }
  emit(x, y, dx = 1, dy = 0, strength = 1) {
    const n = Math.hypot(dx, dy) || 1;
    this.packets.push({ x, y, dx: dx / n, dy: dy / n, strength, age: 0, speed: 110, width: 74 });
  }
  update(dt) {
    this.time += dt;
    for (const g of this.packets) g.age += dt;
    this.packets = this.packets.filter(g => g.age < 8);
  }
  sample(x, y) {
    let energy = 0, vx = 0, vy = 0;
    const add = (e, dx, dy) => { energy += e; vx += dx * e; vy += dy * e; };
    if (this.ambient) {
      // Short, separated weather fronts; quiet intervals remain genuinely still.
      for (const [start, yy, height, amp] of [[0, 300, 230, .65], [5.2, 470, 95, .45]]) {
        const phase = ((this.time - start) % 17 + 17) % 17;
        const center = -160 + phase * 115;
        add(amp * Math.exp(-(((x - center) / 100) ** 2) - ((y - yy) / height) ** 2), 1, .12);
      }
    }
    for (const g of this.packets) {
      const px = x - g.x - g.dx * g.speed * g.age;
      const py = y - g.y - g.dy * g.speed * g.age;
      const along = px * g.dx + py * g.dy;
      const across = -px * g.dy + py * g.dx;
      const e = g.strength * Math.exp(-((along / g.width) ** 2) - (across / 105) ** 2) * Math.min(1, (8 - g.age) / 2);
      add(e, g.dx, g.dy);
    }
    if (energy < .012) return { energy: 0, dx: 1, dy: 0, breeze: 0 };
    const len = Math.hypot(vx, vy) || 1;
    return { energy: Math.min(energy, 2.4), dx: vx / len, dy: vy / len, breeze: clamp(energy * 1.7) };
  }
  phase(x, y, dx = 1, dy = .12) { return TAU * (this.time / 1.54 - (x * dx + y * dy) / 138); }
}

export class TreeMotion {
  constructor(rig, x, y, scale = 1) {
    Object.assign(this, { rig, x, y, scale, lean: 0, velocity: 0, clock: 0, offsets: rig.clumps.map(() => [0, 0]) });
  }
  update(dt, wind, gain = 1, mode = 'layered') {
    const field = wind.sample(this.x, this.y);
    const target = field.energy * (this.rig.kind === 'pine' ? 4.3 : 2.2) * gain;
    const omega = TAU / (this.rig.kind === 'pine' ? 2.8 : 2.2);
    this.velocity += (omega ** 2 * (target - this.lean) - 2 * .38 * omega * this.velocity) * dt;
    this.lean += this.velocity * dt;
    this.clock += dt;
    if (this.clock < .1) return;
    this.clock %= .1;
    for (let i = 0; i < this.offsets.length; i++) {
      const c = this.rig.clumps[i];
      const edge = clamp(Math.hypot((c.cx - this.rig.origin[0]) / (this.rig.width * .5), (c.cy - this.rig.height * .3) / (this.rig.height * .45)));
      const w = this.rig.kind === 'pine' ? clamp(1 - c.cy / this.rig.height, .12, 1) : .28 + .72 * edge;
      const phase = wind.phase(this.x + c.cx * this.scale, this.y + c.cy * this.scale, field.dx, field.dy);
      let dx = w * (this.lean + gain * (field.breeze + field.energy * 1.4) * (.5 - .5 * Math.cos(phase)));
      let dy = -w * gain * (field.breeze + field.energy * .5) * Math.max(0, Math.sin(phase));
      if (mode === 'random') dx = w * this.lean + Math.sin(phase + i * 2.37) * field.energy * gain * 2;
      this.offsets[i] = [Math.round(dx * field.dx), Math.round(dy + dx * field.dy)];
    }
  }
}
