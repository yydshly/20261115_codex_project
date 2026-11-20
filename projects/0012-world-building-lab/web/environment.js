import {groups,modern,ancient} from './environment-catalog.js';

const $=id=>document.getElementById(id);
const escapeHTML=value=>String(value).replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[char]);
const search=$('environment-search'),hasScene=$('has-scene'),groupBar=$('environment-groups');
let selected='all';
groupBar.innerHTML=[['all','全部'],...groups].map(([id,name])=>
  `<button type="button" data-group="${id}" aria-pressed="${id==='all'}">${name}</button>`).join('');

function modernCard(item){
  const {title,conditions,look,href,image}=item;
  return `<article class="card">
    ${image?`<img src="${image}" loading="lazy" alt="${escapeHTML(title)}的项目既有图像">`:''}
    <div class="card-body"><span class="state ${href?'available':''}">${href?'有 3D 样本':'待构建样本'}</span>
      <h4>${escapeHTML(title)}</h4>
      <dl><div><dt>条件</dt><dd>${escapeHTML(conditions)}</dd></div><div><dt>观察</dt><dd>${escapeHTML(look)}</dd></div></dl>
      ${href?`<a class="card-link" href="${href}">在大地图查看 ↗</a>`:''}
    </div>
  </article>`;
}

function renderModern(){
  const query=search.value.trim().toLocaleLowerCase();
  const visible=modern.filter(item=>(selected==='all'||item.group===selected)&&(!hasScene.checked||item.href)
    &&(!query||[item.title,item.conditions,item.look].some(text=>text.toLocaleLowerCase().includes(query))));
  $('environment-count').textContent=`显示 ${visible.length} / ${modern.length} 项 · ${visible.filter(item=>item.href).length} 项有 3D 样本`;
  $('environment-list').innerHTML=groups.map(([id,name])=>{
    const entries=visible.filter(item=>item.group===id);
    return entries.length?`<section class="catalog-group"><h3>${name}</h3><div class="cards">${entries.map(modernCard).join('')}</div></section>`:'';
  }).join('')||'<p class="empty">没有匹配的环境。可改关键词或查看全部分类。</p>';
}
search.addEventListener('input',renderModern);
hasScene.addEventListener('change',renderModern);
groupBar.addEventListener('click',event=>{
  const button=event.target.closest('button[data-group]');
  if(!button)return;
  selected=button.dataset.group;
  for(const option of groupBar.children)option.setAttribute('aria-pressed',String(option===button));
  renderModern();
});
renderModern();

const diagrams={
  snowball:{labels:['低纬冰缘','近海冰','开水面假设'],sky:'#d6e2e4',earth:'#849a9e',water:'#72a1a9',profile:[41,59,91,129,141,148,150]},
  ice:{labels:['陆冰','露出陆架','海面'],sky:'#ccdce1',earth:'#7b9297',water:'#729fac',profile:[21,37,85,115,121,146,150]},
  delta:{labels:['河口来水','沉积羽','古海床'],sky:'#e1d4b2',earth:'#a2825f',water:'#72a4a0',profile:[47,62,71,109,135,151,154]},
  shelf:{labels:['浅水台地','台缘','细泥海底'],sky:'#c8d7d8',earth:'#6a8586',water:'#5a939d',profile:[87,89,91,94,135,151,156]},
  seaway:{labels:['大陆低岸','内陆浅海','对岸'],sky:'#d9d9bf',earth:'#948b6d',water:'#70aaa7',profile:[64,89,116,122,115,93,60]},
  forest:{labels:['较高地面','古河滩','季节浅洼'],sky:'#d9dec2',earth:'#869264',water:'#89a8a0',profile:[71,74,91,98,108,103,88]},
  swamp:{labels:['石松类树形','涝洼','有机质层'],sky:'#ced6ba',earth:'#7c8057',water:'#8ea6a2',profile:[85,90,100,102,106,98,94]},
  dunes:{labels:['砂源与风','背风落砂','交错层理'],sky:'#f0dcc0',earth:'#c59161',water:null,profile:[86,31,87,55,103,72,110]},
  flood:{labels:['高滩','河道','低岸洪泛'],sky:'#e0dfc6',earth:'#9b8e69',water:'#8bb2ae',profile:[70,76,94,117,115,91,87]},
  lava:{labels:['火山坡','湖盆','灰层与泥层'],sky:'#d8d6cd',earth:'#8e796c',water:'#85acb1',profile:[79,28,88,109,129,132,94]}
};

function drawDiagram(canvas,kind){
  const {sky,earth,water,profile}=diagrams[kind],ctx=canvas.getContext('2d');
  const w=360,h=162,step=w/(profile.length-1);
  const shape=points=>{
    ctx.beginPath();
    for(const [i,[x,y]] of points.entries())if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  };
  const ridge=profile.map((y,i)=>[i*step,y]);
  ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#faf0c8';ctx.beginPath();ctx.arc(276,30,13,0,Math.PI*2);ctx.fill();
  if(water){
    ctx.fillStyle=water;ctx.globalAlpha=.8;
    ctx.fillRect(0,kind==='shelf'?55:kind==='ice'?116:kind==='snowball'?89:kind==='lava'?97:kind==='delta'?65:99,w,h);
    ctx.globalAlpha=1;
  }
  shape([...ridge,[w,h],[0,h]]);ctx.closePath();
  ctx.fillStyle=earth;ctx.fill();ctx.save();ctx.clip();
  if(kind==='swamp'){ctx.fillStyle='#495244';ctx.fillRect(0,129,w,13);}
  for(let j=0;j<7;j++){
    const y=99+j*10;
    const line=kind==='dunes'?[[0,y+8],[72,y-11],[181,y+21],[247,y+7],[360,y+23]]:
      [[0,y],[78,y+3],[172,y-1],[268,y+5],[360,y+1]];
    shape(line);ctx.strokeStyle=j%2?'#e8d8bc80':'#513e3750';ctx.lineWidth=kind==='lava'&&j%2?4:1.25;ctx.stroke();
  }
  ctx.restore();
  if(kind==='ice'||kind==='snowball'){
    const edge=kind==='ice'?143:226;
    shape([[0,0],[0,28],[52,36],[84,59],[109,86],[edge,104],[edge-17,112],[78,89],[41,69],[0,54]]);
    ctx.fillStyle='#edf5f3';ctx.fill();
  }
  if(kind==='delta'){
    shape([[93,66],[147,64],[233,77],[274,98],[167,91]]);
    ctx.fillStyle='#d7bd86aa';ctx.fill();
  }
  if(['forest','swamp','flood'].includes(kind))for(const [x,i] of [[22,0],[73,1],[113,2],[262,4],[306,5],[331,5]]){
    const y=profile[i],size=kind==='swamp'?42:i%2?24:31;
    shape([[x,y],[x-2,y-size]]);ctx.strokeStyle='#554c36';ctx.lineWidth=3;ctx.stroke();
    for(const swing of [-11,0,11]){
      shape([[x-2,y-size+9],[x+swing,y-size]]);
      ctx.strokeStyle=kind==='swamp'?'#566e42':'#587a50';ctx.lineWidth=5;ctx.stroke();
    }
  }
  if(kind==='dunes'){
    shape([[97,25],[139,25],[130,20]]);ctx.strokeStyle='#665447';ctx.lineWidth=1.5;ctx.stroke();
  }
}

$('ancient-list').innerHTML=ancient.map(({kind,era,age,title,conditions,look,source,url,href})=>`<article class="card ancient">
  <figure><canvas width="360" height="162" data-kind="${kind}" aria-label="${escapeHTML(title)}环境概念剖面"></canvas>
    <figcaption>${diagrams[kind].labels.join(' · ')}</figcaption>
  </figure>
  <div class="card-body"><span class="state">${era} · ${age}</span><h3>${title}</h3>
    <p>${conditions}</p><p class="ancient-look">${look}</p>${href?`<a class="card-link" href="${href}">进入该时期的 3D 大地图 ↗</a>`: ''}<a class="card-link" href="${url}">${source} ↗</a>
  </div>
</article>`).join('');
for(const canvas of document.querySelectorAll('canvas[data-kind]'))drawDiagram(canvas,canvas.dataset.kind);

const latitude=$('latitude'),seasons=document.querySelectorAll('[data-declination]');
const radians=angle=>angle*Math.PI/180;
let declination=-23.44;
function daylight(north,sunLatitude){
  const cosH=-Math.tan(radians(north))*Math.tan(radians(sunLatitude));
  return 24/Math.PI*Math.acos(Math.min(1,Math.max(-1,cosH)));
}
function renderSun(){
  const north=Number(latitude.value);
  $('latitude-output').value=north+'°';
  $('sun-results').innerHTML=[[23,'低纬参考'],[north,'当前纬度']].map(([lat,label])=>{
    const altitude=90-Math.abs(lat-declination),duration=daylight(lat,declination);
    return `<div><strong>${label} · 北纬 ${lat}°</strong>
      <span>正午太阳 ${altitude>0?altitude.toFixed(1)+'°':'在地平线下'}</span>
      <span>昼长 ${duration.toFixed(1)} 小时</span>
      <meter min="0" max="24" value="${duration}" aria-label="${label}昼长"></meter>
    </div>`;
  }).join('');
}
latitude.addEventListener('input',renderSun);
for(const button of seasons)button.addEventListener('click',()=>{
  declination=Number(button.dataset.declination);
  for(const other of seasons)other.setAttribute('aria-pressed',String(other===button));
  renderSun();
});
renderSun();
