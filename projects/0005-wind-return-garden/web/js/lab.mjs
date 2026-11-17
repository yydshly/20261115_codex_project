import { loadAssets, makeTree, drawTree } from './assets.mjs';
import { WindField } from './wind.mjs';
const $ = id => document.getElementById(id);
const canvases = ['still','whole','layered'].map(id => $(id));
let assets, trees = [], wind = new WindField({ ambient: false }), paused = false, gain = 1.3, last = performance.now(), nextGust = 7, clock = 0;
function make() {
  const kind = $('species').value;
  trees = canvases.map(() => makeTree(assets, kind, 180, 255, kind === 'pine' ? 1.05 : 1.9));
  $('clump-count').textContent = assets.rigs[kind].clumps.length;
}
function emit() { wind.emit(-70, 255, 1, 0, 1.1); }
$('gust').addEventListener('click', emit);
$('species').addEventListener('change', () => { if (assets) make(); });
$('strength').addEventListener('input', () => { gain = Number($('strength').value); $('strength-value').value = gain.toFixed(1); });
$('lab-pause').addEventListener('click', () => { paused = !paused; $('lab-pause').textContent = paused ? '继续动画' : '暂停动画'; $('lab-pause').setAttribute('aria-pressed', String(paused)); });
$('random-timing').addEventListener('change', () => { $('layer-caption').textContent = $('random-timing').checked ? '对照：同一风场中给每个叶团加入随机相位，观察跳动感。庭院实际使用位置相关的行波。' : '固定树干，树冠按位置延迟；整像素移动，10 次/秒更新姿态。风停后逐渐归于静止。'; });
function frame(now) {
  const dt = Math.min((now - last) / 1000, .05); last = now;
  if (!paused) {
    wind.update(dt); clock += dt;
    if (wind.time > nextGust) { emit(); nextGust = wind.time + 10; }
    trees.forEach(t => t.update(dt, wind, gain, $('random-timing').checked ? 'random' : 'layered'));
  }
  canvases.forEach((canvas, i) => {
    const c = canvas.getContext('2d'); c.clearRect(0, 0, 360, 290); c.imageSmoothingEnabled = false;
    const gr = c.createLinearGradient(0,0,0,290);gr.addColorStop(0,'#e8eddf');gr.addColorStop(1,'#c6d2b6');c.fillStyle=gr;c.fillRect(0,0,360,290);
    c.strokeStyle = '#b7c5a67a'; c.lineWidth=1;
    for(let x=0;x<360;x+=20){c.beginPath();c.moveTo(x,262);c.lineTo(x,290);c.stroke();}
    for(let y=262;y<290;y+=7){c.beginPath();c.moveTo(0,y);c.lineTo(360,y);c.stroke();}
    drawTree(c,trees[i],assets,{mode:['static','whole','layered'][i],split:i===2&&$('split').checked});
    const f=wind.sample(180,255);c.globalAlpha=Math.min(f.energy*.4,.5);c.fillStyle='#f6edcd';c.fillRect(8,269,Math.round(344*f.energy/2),2);c.globalAlpha=1;
  });
  if(clock>.15){clock=0;$('moving-count').textContent=trees[2].offsets.filter(([x,y])=>x||y).length;$('wind-energy').textContent=wind.sample(180,255).energy.toFixed(2);}
  requestAnimationFrame(frame);
}
try { assets = await loadAssets(); $('asset-count').textContent = assets.images.size; make(); emit(); requestAnimationFrame(frame); }
catch(e){$('asset-error').hidden=false;$('asset-error').textContent=e.message;console.error(e);}
