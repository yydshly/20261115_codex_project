const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
const gaussian=n=>Math.exp(-n*n);

export const cambrianSources={
  delta:{name:'澄江三角洲 · 沉积岩芯与古环境研究',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8943010/'},
  slope:{name:'皇家安大略博物馆 · 布尔吉斯页岩古环境',url:'https://burgess-shale.rom.on.ca/science/the-burgess-shale/geological-background/palaeoenvironmental-setting/'}
};

export const cambrianCase={
  name:'寒武纪近岸到崖脚',age:'寒武纪 · 澄江三角洲前缘与布尔吉斯页岩崖坡类比',
  start:'usual',center:[1330,570],overview:[-13,875],profileName:'河口砂泥、碳酸盐台地与崖脚盆底',
  intro:'同一教学剖面串起两类海底环境。近岸看河流带来的砂泥，外海看台地、陡崖和盆底。两个化石地点各有自己的地层证据。',
  phases:{
    usual:{name:'平常水况',detail:'先比较河口含沙水、较清的台地浅水和崖脚泥底。由浅入深，水体透明度和海床材料都在变化。'},
    flood:{name:'河洪送沙',detail:'河水高流量时，河口浑浊水带伸得更远。较粗颗粒主要留在前缘坡上，细泥继续向外扩散。这里对照的是河口端的一次高供沙状态。'},
    slide:{name:'崖脚泥流',detail:'在外海看另一次局地事件。细泥悬浮流沿台缘下方移入崖脚低地，随后沉积成薄层。布尔吉斯页岩各化石层的埋藏过程有差异。'},
    now:{name:'现代对照',detail:'恢复当前大地图中东部岩岸、群岛和陆架。观察坐标一致，古深度、岸线和底质采用独立场景。'}
  },
  stops:[
    {id:'channel',name:'古河槽与分流',x:928,z:365,range:208,
      detail:'抬高视角看水从槽内汇到两个浅的分流口，旁边是没有现代林木覆盖的泥砂平原。'},
    {id:'mouth',name:'分流口砂坝',x:1068,z:414,range:172,
      detail:'河道展宽，水流减慢。比较水下砂坝顶部和两侧仍能向外通水的低槽。'},
    {id:'front',name:'澄江类比 · 浅海三角洲前缘',x:1192,z:485,range:189,dive:true,
      detail:'由河口砂坝进入斜缓前缘，地表转为砂泥混合。切到河洪送沙，查看浑浊度上升、海床上粗细沉积的位置。'},
    {id:'prodelta',name:'前三角洲细泥带',x:1324,z:560,range:184,dive:true,
      detail:'离开来水主轴后，粗颗粒减少，更细的颗粒可以抵达缓坡外侧。平常与洪水状态的界线随来水改变。'},
    {id:'platform',name:'较清的碳酸盐台地',x:1446,z:640,range:183,dive:true,
      detail:'越过主要泥沙影响区后，底质以较浅色的碳酸盐为主。水较清，仍可见台面纹理和小起伏。'},
    {id:'rim',name:'台地外缘与海底崖坡',x:1544,z:715,range:224,
      detail:'这里沿浅色台缘进入明显的折坡。揭开水面可以看到平缓台面怎样转为陡坡，以及崖脚相对台面的落差。'},
    {id:'foot',name:'布尔吉斯类比 · 崖脚泥底',x:1659,z:791,range:205,dive:true,
      detail:'把视线朝向上方台缘，可同时看到浅色岩体和崖脚深色细泥。在此原位切换平常水况与崖脚泥流。'},
    {id:'basin',name:'外侧盆底与泥层',x:1810,z:878,range:206,dive:true,
      detail:'崖脚以外坡降减小。沉积物逐次覆盖已有泥床，形成本场景用于解释埋藏环境的细层。'}
  ]
};

export const cambrianAxis=x=>365+.58*(x-930)+28*Math.sin((x-930)/155);
const shoreX=z=>1034+37*Math.sin((z-440)/125)+15*Math.sin(z*.057);
const rimX=z=>1530+22*Math.cos((z-710)/95)+8*Math.sin(z*.032);

export function cambrianBed(x,z){
  const d=z-cambrianAxis(x),shore=shoreX(z),rim=rimX(z);
  const inland=6+116*smooth((shore-x+30)/920);
  const platform=-8-10*smooth((x-1100)/350);
  const tidal=smooth((x-shore+82)/221);
  const cut=(16.5*gaussian(d/(23+.045*Math.max(0,x-940)))+
    10*gaussian((d-42*Math.sin((x-925)/120))/18))*smooth((1165-x)/157);
  const delta=gaussian((x-1127)/124)*(3.7*gaussian((d-36)/24)+3.5*gaussian((d+26)/20));
  const bench=3.9*gaussian((x-rim+24)/38);
  const drop=94*smooth((x-rim)/117);
  const steps=1.75*Math.sin((x-rim)*.16)*gaussian((x-rim-63)/67);
  const distal=13*smooth((x-1686)/220);
  const headland=18*gaussian((x-965)/149)*(1-gaussian(d/143));
  const grain=(.62*Math.sin(x*.041+z*.044)+.34*Math.cos(x*.126-z*.077));
  return inland*(1-tidal)+platform*tidal-cut+delta+bench-drop+steps-distal+headland+grain;
}

export function cambrianPoint(phase,x,z){
  const bed=cambrianBed(x,z),depth=Math.max(0,-bed);
  const relative=z-cambrianAxis(x),fromMouth=Math.max(0,x-1030),rim=rimX(z);
  const flood=phase==='flood',slide=phase==='slide';
  const spread=26+fromMouth*(flood?.56:.38);
  const plume=depth>0?smooth((x-999)/65)*smooth((1430+(flood?29:0)-x)/152)*
    gaussian((relative+17*Math.sin(x*.026))/spread)*(flood?.98:.43):0;
  const sand=smooth((1265-x)/180)*gaussian((relative-9)/101);
  const carbonate=smooth((x-1355)/108)*(1-smooth((x-rim-103)/55));
  const runout=(slide?.94:.13)*smooth((x-rim-20)/113)*gaussian((x-1744)/126)*
    gaussian((z-805-(x-1630)*.50)/86);
  const habitat=!depth?(x<970?'古河岸与裸露泥地':'出露砂泥滩'):x<1009?'古河槽':x<1120?'分流槽与河口砂坝':
    x<1270?'三角洲前缘砂泥':x<1380?'前三角洲细泥':x<=rim-12?'碳酸盐台面':
    x<rim+110?'台缘崖坡':runout>.37?'崖脚泥流覆盖带':'盆地细泥底';
  return {bed,level:0,depth,habitat,plume,sand,carbonate,runout};
}

export function cambrianClarity(phase,x,z){
  const q=cambrianPoint(phase,x,z);
  const nearRiver=(1-smooth((x-1130)/400))*.24;
  const attenuation=.020+.109*q.plume+.076*q.runout+nearRiver*.074;
  return {attenuation,visibility:1.98/attenuation,bottomLight:Math.exp(-attenuation*q.depth)};
}

export function cambrianDive(phase,stop){
  const target={x:stop.x,z:stop.z,y:cambrianBed(stop.x,stop.z)+2.1};
  const atFoot=stop.id==='foot'||stop.id==='basin';
  const x=target.x+(atFoot?22:-9),z=target.z+(atFoot?15:24);
  const y=Math.min(-1.4,Math.max(target.y+4.5,cambrianBed(x,z)+6));
  const q=cambrianClarity(phase,x,z),bottom=cambrianPoint(phase,x,z);
  return {target,eye:{x,y,z,targetY:target.y},style:{
    surface:0,deep:bottom.depth>32,light:q.bottomLight*.28,density:Math.min(.018,.0055+.090*q.attenuation),
    ambient:.98+q.bottomLight*.42,fill:1.38+q.bottomLight*.56,tintHorizon:true,
    color:bottom.runout>.31?'#59726a':bottom.plume>.26?'#587a6e':'#296373'
  }};
}

export function cambrianDiveClear(eye,target){
  return [eye,target].every(p=>p.x>=-1920&&p.x<=1920&&p.z>=-1560&&p.z<=1560)&&
    Array.from({length:13},(_,i)=>i/12).every(t=>{
      const x=eye.x+(target.x-eye.x)*t,y=eye.y+(target.y-eye.y)*t,z=eye.z+(target.z-eye.z)*t;
      return y<-.45&&y>cambrianBed(x,z)+.75;
    });
}
