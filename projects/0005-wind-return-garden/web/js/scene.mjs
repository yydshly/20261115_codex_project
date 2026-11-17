import { makeTree, drawTree } from './assets.mjs';
import { riverX } from './navigation.mjs';
import { BEDS, catActivity } from './garden-life.mjs';
import { drawBed } from './life-drawing.mjs';
import { environmentAt } from './atmosphere.mjs';
import { drawSkyMood, drawRain } from './sky-drawing.mjs';
import { STATIONS } from './state.mjs';
import { drawSample, GARDEN_PROPS } from './free-assets.mjs';
export function rng(seed = 42) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
const rect = (c, color, x, y, w, h) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function ellipse(c, color, x, y, rx, ry) { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
function poly(c, color, pts) { c.fillStyle = color; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); }
import {TREE_LAYOUT} from './courtyard-config.mjs';
export {TREE_LAYOUT} from './courtyard-config.mjs';
import {createLayout,layoutProps} from './arrangement.mjs';
import {drawPaths,drawFurniture,drawMailbox} from './arranging-drawing.mjs';
export class GardenScene {
  constructor(assets) {
    this.assets = assets;
    this.trees = TREE_LAYOUT.map(([kind, x, y, s]) => makeTree(assets, kind, x, y, s));
    this.ground = document.createElement('canvas'); this.ground.width = 960; this.ground.height = 600;
    this.bakeGround(); this.leaves = []; this.spawnClock = 0; this.rand = rng(874);

  }
  bakeGround() {
    const c = this.ground.getContext('2d'), random = rng(83);
    const sky = c.createLinearGradient(0, 0, 0, 230); sky.addColorStop(0, '#d8d9b9'); sky.addColorStop(1, '#acb89a');
    c.fillStyle = sky; c.fillRect(0, 0, 960, 600);
    for (let layer = 0; layer < 4; layer++) {
      c.fillStyle = ['#aebda4', '#94ab98', '#809b86', '#6c8973'][layer];
      c.beginPath(); c.moveTo(0, 230);
      for (let x = 0; x <= 980; x += 20) c.lineTo(x, 95 + layer * 25 + Math.sin(x / (100 + layer * 20) + layer) * 23 + Math.cos(x / 50) * 6);
      c.lineTo(960, 600); c.lineTo(0, 600); c.fill();
    }
    const land = c.createLinearGradient(0, 205, 0, 600); land.addColorStop(0, '#7a9572'); land.addColorStop(.5, '#91a17a'); land.addColorStop(1, '#7a946d');
    c.fillStyle = land; c.fillRect(0, 240, 960, 360);
    for (let i = 0; i < 23000; i++) {
      const x = random() * 960, y = 215 + random() * 385;
      rect(c, ['#b8b98a25', '#3f6a531a', '#d2cd9730'][i % 3], x, y, 1 + random() * 3, 1);
    }
    // The channel and collision use exactly the same centerline.
    for (let y = 210; y < 600; y++) {
      const x = riverX(y); rect(c, '#617e6b', x - 40, y, 80, 1); rect(c, '#739d94', x - 33, y, 66, 1); rect(c, '#83aaa0', x - 25, y, 45, 1);
      if (y % 9 === 0) for (let j = 0; j < 3; j++) { const dx = random() * 58 - 29; rect(c, '#cbd2b07a', x + dx, y, random() * 7 + 2, 1); }
    }
    for (let i = 0; i < 2600; i++) {
      const x = random() * 960, y = random() * 390 + 215;
      if (Math.abs(x - riverX(y)) < 43 || (x > 675 && x < 840 && y < 340)) continue;
      rect(c, ['#587957', '#b9bc89', '#799462'][i % 3], x, y, 1, 2 + random() * 3);
    }
    for (const [cx, cy, rx, ry, color] of [[180, 451, 115, 47, '#c7a78d'], [711, 483, 81, 48, '#d4c39a'], [858, 376, 62, 63, '#bbabbe']]) {
      for (let i = 0; i < 180; i++) {
        const a = random() * Math.PI * 2, r = Math.sqrt(random()), x = cx + Math.cos(a) * r * rx, y = cy + Math.sin(a) * r * ry;
        if (Math.abs(x - riverX(y)) < 45) continue;
        rect(c, '#506e4b', x, y, 1, 5); rect(c, color, x - 1, y - 2, 3, 2);
        if (i % 3 === 0) rect(c, '#e8dfb5', x, y - 2, 1, 1);
      }
    }
    // Back fence, bridge and stepping stones are intentionally quiet shapes.
    for (let x = 25; x < 450; x += 21) { rect(c, '#a19d75', x, 279, 5, 24); rect(c, '#c4bf98', x, 277, 4, 22); }
    rect(c, '#b4ad87', 20, 286, 438, 3); rect(c, '#a6a180', 20, 296, 438, 2);
    rect(c, '#526e5d77', 461, 411, 133, 30);
    for (let x = 464; x <= 586; x += 9) { rect(c, '#b9ac86', x, 405, 8, 33); rect(c, '#d2c29b', x, 406, 7, 3); }
    rect(c, '#8e8165', 460, 401, 135, 4); rect(c, '#8e8165', 460, 435, 135, 4);
    for (let x = 461; x <= 594; x += 33) { rect(c, '#8a8063', x, 394, 4, 14); rect(c, '#d5c8a3', x, 393, 4, 2); }

  }
  update(dt, wind) {
    this.trees.forEach(t => t.update(dt, wind));
    this.spawnClock += dt;
    if (this.spawnClock > .16) {
      this.spawnClock = 0;
      for (const t of this.trees) {
        const f = wind.sample(t.x, t.y);
        if (f.energy > .3 && this.rand() < .32) this.leaves.push({ x: t.x + (this.rand() - .5) * 80 * t.scale, y: t.y - 60 * t.scale, z: 0, age: 0, life: 4 + this.rand() * 2, drift: this.rand() * 6 });
      }
    }
    for (const l of this.leaves) { const f = wind.sample(l.x, l.y); l.x += dt * (8 + f.dx * f.energy * 34); l.y += dt * (9 + Math.sin(l.age * 3 + l.drift) * 6); l.age += dt; }
    this.leaves = this.leaves.filter(l => l.age < l.life).slice(-100);
  }
  drawHouse(c, progress, time) {
    ellipse(c, '#345b4936', 760, 334, 93, 21);
    drawSample(c, this.assets.free, 'cottage', 760, 335, {time});
    if (progress === 3) {
      const pose=this.assets.free.entries.cottage.states.idle, scale=pose.scale;
      for (const [nx,ny] of [[85,207],[227,194]]) {
        const x=760+(nx-pose.anchor[0])*scale,y=335+(ny-pose.anchor[1])*scale;
        c.save();c.globalCompositeOperation='screen';
        const glow=c.createRadialGradient(x,y,1,x,y,20);
        glow.addColorStop(0,'#ffce8277');glow.addColorStop(1,'#ffce8200');
        ellipse(c,glow,x,y,20,24);c.restore();
      }
    }
  }
  drawChime(c, s, done, active, wind, time) {
    const energy = wind.sample(s.x, s.y).energy;
    const sway = Math.sin(time * 5 - s.x * .03) * energy * 5;
    ellipse(c, '#33564026', s.x, s.y + 6, 17, 5);
    rect(c, '#817a55', s.x - 15, s.y - 42, 3, 48); rect(c, '#b2a474', s.x - 14, s.y - 43, 3, 47);
    rect(c, '#ae9e73', s.x - 14, s.y - 43, 32, 3);
    c.save(); c.translate(s.x + 8, s.y - 40); c.rotate(sway * .035);
    rect(c, '#736f51', 0, 0, 1, 7); rect(c, done ? '#e6c783' : '#bab895', -4, 6, 10, 8); rect(c, '#796f50', -5, 13, 12, 2);
    rect(c, '#6e775c', 0, 15, 1, 9); rect(c, done ? '#eedab0' : '#d8d4b8', -3, 23, 8, 15); rect(c, '#a4956d', 0, 26, 1, 7); c.restore();
    if (!done) { c.save(); c.globalAlpha = .55 + .2 * Math.sin(time * 2); ellipse(c, active ? '#f5dda0' : '#e7e8bc', s.x + 9, s.y - 18, 2, 2); c.restore(); }
    if (done) { c.strokeStyle = '#e6cd8780'; c.lineWidth = 1; c.beginPath(); c.ellipse(s.x, s.y + 5, 21, 8, 0, 0, Math.PI * 2); c.stroke(); }
  }
  drawPlayer(c, p, time, charging, sitting) {
    const x=Math.round(p.x), y=Math.round(p.y);
    ellipse(c, '#314d3d55', x, y+1, 10, 3);
    // The supplied monk has an idle loop only. Movement is world translation;
    // the bench is a resting placement, without claiming a supplied seated pose.
    drawSample(c,this.assets.free,'traveler',x,y,{time,face:p.face});
    if (charging) {
      c.strokeStyle='#f2e9bdaa';c.lineWidth=1;c.beginPath();
      c.ellipse(x,y-19,18+Math.sin(time*3),22,0,-.7,1.1);c.stroke();
    }
    c.strokeStyle = '#f2e9bd80'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y+2, 14, 5, 0, 0, Math.PI*2); c.stroke();
  }
  draw(c, { time, wind, player, completed, read, charge, cameraX, width, path, sitting, life, now = Date.now(), env = environmentAt(life.atmosphere,now) }) {
    c.save(); c.translate(-cameraX, 0); c.imageSmoothingEnabled = false; c.drawImage(this.ground, 0, 0);
    const layout=life?.layout||createLayout();drawPaths(c,layout);
    // Distant copies of the very same source assets establish the forest edge.
    const r = this.assets.rigs.pine, image = this.assets.images.get(r.full);
    c.save(); c.globalAlpha = .4;
    for (let i = 0; i < 20; i++) c.drawImage(image, i * 53 - 18, 120 + Math.sin(i) * 8, 40, 131);
    c.restore();
    // Light flecks follow the same gust field as the actual tree rigs.
    for (let y = 288; y < 570; y += 27) for (let x = 40; x < 940; x += 34) {
      const f = wind.sample(x, y);
      if (f.energy > .16 && Math.abs(x - riverX(y)) > 42) { c.save(); c.globalAlpha = f.energy * .13; rect(c, '#f0dfa5', x, y, 8 + f.energy * 11, 2); c.restore(); }
    }
    for (let i = 0; i < 28; i++) {
      const y = 246 + ((i * 17 + time * 11) % 350), x = riverX(y) + Math.sin(i * 7) * 24;
      rect(c, '#d4dfbd70', x, y, 5 + i % 8, 1);
    }
    if(life)for(const bed of BEDS)drawBed(c,bed,life.plots[bed.id],time,wind,now,false,env);
    const drawables = [
      ...(life?BEDS.map(bed=>({y:bed.y+5,run:()=>drawBed(c,bed,life.plots[bed.id],time,wind,now,true,env)})):[]),
      ...this.trees.map(t => ({ y: t.y, run: () => {
        const cover = player.y < t.y && player.y > t.y - t.rig.height * t.scale && Math.abs(player.x - t.x) < t.rig.width * t.scale * .43;
        drawTree(c, t, this.assets, { alpha: cover ? .58 : 1 });
      }})),
      { y: 331, run: () => this.drawHouse(c, completed.size, time) },
      {y:layout.bench.y,run:()=>drawFurniture(c,layout,this.assets.free,time)},
      {y:375,run:()=>drawMailbox(c,life?.story)},
      ...layoutProps(layout).filter(p=>!['bench','table','mailbox'].includes(p.id)).map(p => ({ y:p.y, run:()=>{
        if(p.radius) ellipse(c,'#345b492c',p.x,p.y+1,p.radius,4);
        drawSample(c,this.assets.free,p.id,p.x,p.y,{time});
      }})),
      ...STATIONS.map(s => ({ y: s.y, run: () => this.drawChime(c, s, completed.has(s.id), read.has(s.id), wind, time) })),
      ...(life?.home.inside?[]:[{ y: player.y, run: () => this.drawPlayer(c, player, time, charge > 0, sitting) }])
    ];
    const cat=life?.cat.unlocked&&life.cat.space!=='inside'?life.cat:null;
    if (cat) drawables.push({ y:cat.y, run:()=>{
      ellipse(c,'#3b5e4033',cat.x,cat.y+1,9,3);
      const resting=cat.mode==='nap'&&!cat.moving;
      drawSample(c,this.assets.free,'cat',cat.x,cat.y,{time:resting?0:time,state:cat.moving?'walk':'idle',face:cat.face});
      if(resting){c.save();c.globalAlpha=.55;c.fillStyle='#f0e4bc';c.font='9px Georgia';c.fillText('z',cat.x+9,cat.y-29-Math.sin(time)*2);c.restore();}
      if(cat.mode==='affection'&&now-cat.lastPetAt<8000){
        rect(c,'#e4c398',cat.x-3,cat.y-34,3,3);rect(c,'#e4c398',cat.x+1,cat.y-34,3,3);rect(c,'#e4c398',cat.x-1,cat.y-31,3,3);
      }
      if(Math.hypot(player.x-cat.x,player.y-cat.y)<100){c.save();c.fillStyle='#f7efd5cc';c.font='9px "Microsoft YaHei"';c.textAlign='center';c.fillText(catActivity(cat),cat.x,cat.y+15);c.restore();}
    }});
    drawables.sort((a, b) => a.y - b.y).forEach(d => d.run());
    for (const l of this.leaves) { c.save(); c.globalAlpha = Math.min(1, l.life - l.age); rect(c, l.age % .8 > .4 ? '#b8b16d' : '#dec48b', l.x, l.y, Math.sin(l.age * 10) > 0 ? 3 : 1, 2); c.restore(); }
    if (path.length) { const end = path.at(-1); c.strokeStyle = '#f3e7b6aa'; c.lineWidth = 1; c.beginPath(); c.ellipse(end.x, end.y, 9 + Math.sin(time * 4), 4, 0, 0, Math.PI * 2); c.stroke(); }
    for (const g of wind.packets) {
      const x = g.x + g.dx * g.speed * g.age, y = g.y + g.dy * g.speed * g.age;
      c.save(); c.globalAlpha = Math.min(.4, (8 - g.age) / 6) * .65;
      for (let i = 0; i < 5; i++) { const xx = x - g.dy * (i - 2) * 11, yy = y + g.dx * (i - 2) * 11; c.strokeStyle = '#fff0bb'; c.beginPath(); c.moveTo(xx - g.dx * 17, yy - g.dy * 17); c.quadraticCurveTo(xx, yy - 4, xx + g.dx * 14, yy + g.dy * 14); c.stroke(); }
      c.restore();
    }
    // A gradual, restrained warmth answers the player's care.
    c.fillStyle = `rgba(246, 205, 126, ${.015 + completed.size * .014})`; c.fillRect(cameraX, 0, width, 600);
    drawSkyMood(c,env,cameraX,width,time);
    if(env.night>.2&&life.home.lampOn){
      const pose=this.assets.free.entries.cottage.states.idle;
      for(const [nx,ny] of [[85,207],[227,194]]){
        const x=760+(nx-pose.anchor[0])*pose.scale,y=335+(ny-pose.anchor[1])*pose.scale;
        const glow=c.createRadialGradient(x,y,1,x,y,30);glow.addColorStop(0,'#f4c47799');glow.addColorStop(1,'#f4c47700');
        c.fillStyle=glow;c.fillRect(x-30,y-30,60,60);
      }
    }
    drawRain(c,env,cameraX,width,time);
    c.restore();
  }
}
