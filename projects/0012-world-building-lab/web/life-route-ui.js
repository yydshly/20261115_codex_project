import {FootpathWalk} from './benchmark-trail.js';
import {lifePoint,lifeLength,lifeStops,lifeNear,lifeStation} from './life-route.js';
import {terrainHeight,walkingSurface} from './large-world.js';
import {FREIGHT_DOCK} from './transport-layout.js';
import {TOWN_BRIDGE} from './settlement-layout.js';
import {FARM} from './production-layout.js';
import {riverBridge} from './water-system.js';
import {outletRise} from './life-inundation.js';

const metres=value=>value.toFixed(1)+' m';
function siteReading(index,flood){
  const {id,at}=lifeStops[index],p=lifePoint(at),elevation=walkingSurface(p.x,p.z);
  const delta=flood?outletRise:0;
  if(id==='farm'){
    const heights=[-1,0,1].flatMap(u=>[-1,0,1].map(v=>
      terrainHeight(FARM.x+FARM.width*u/2,FARM.z+FARM.depth*v/2)));
    return '田面高程约 '+metres(Math.min(...heights))+' 至 '+metres(Math.max(...heights));
  }
  if(id==='bridge'||id==='dock'){
    const base=id==='bridge'?TOWN_BRIDGE.level:FREIGHT_DOCK.river.level;
    return '脚下 '+metres(elevation)+' · 对照水位 '+metres(base+delta)+' · 高出水面 '+metres(elevation-base-delta);
  }
  if(id==='join')return '中央河常水位 '+metres(riverBridge.level)+' · 主河桥面 '+metres(riverBridge.y);
  if(id==='wetland')return flood?'蓝色为 7 月相对 1 月新增淹水的岸滩':'脚下 '+metres(elevation)+' · 岸路沿苇泽北侧高地';
  if(id==='bay'||id==='mouth')return '脚下 '+metres(elevation)+' · 海面基准 0 m';
  return '脚下 '+metres(elevation)+' · 临村出湖河从澄镜内陆湖获得补给';
}

export function mountLifeRoute(document,{visuals,pose,place,step,aim,onDisplay,onStation}){
  const panel=document.createElement('section');
  panel.id='life-walk-panel';panel.hidden=true;panel.setAttribute('aria-label','河谷到海湾生活线');
  panel.innerHTML=`
    <header><h2>河谷到海湾生活线</h2><button type="button" id="life-walk-close" aria-label="收起生活线">×</button></header>
    <label class="life-select">定位观察点<select id="life-walk-station">${lifeStops.map((s,i)=>
      `<option value="${i}">${s.name} · ${Math.round(s.at)} m</option>`).join('')}</select></label>
    <p id="life-walk-reason"></p>
    <p id="life-walk-reading"></p>
    <div class="life-actions">
      <button type="button" id="life-walk-guide">开始步行导览</button>
      <button type="button" id="life-walk-flood" aria-pressed="false">洪泛对照</button>
      <button type="button" id="life-walk-reset">回农田起点</button>
    </div>
    <p id="life-walk-flood-note" hidden>蓝色标新增淹水。榆湾沿出湖河加水位 ${outletRise} m 做对照，苇泽用原有丰枯水期。通行仍按平水状态。</p>
    <progress id="life-walk-progress" max="${lifeLength}" value="0" aria-label="生活线里程"></progress>
    <p id="life-walk-status" role="status"></p>
    <p class="life-help">跟地上金色虚线走。WASD 或方向键接管，拖动转向。</p>`;
  document.body.append(panel);
  const node=id=>panel.querySelector('#life-walk-'+id),button=document.getElementById('life-walk-controls');
  const mapLabel=document.getElementById('navigation-place');
  const walk=new FootpathWalk(lifeLength,lifePoint);
  let flooded=false,continuous=false,offRoute=false,lastStation=-1,lastFlood=null;
  const write=(target,text)=>{if(text!==target.textContent)target.textContent=text;};

  function render(){
    if(panel.hidden)return;
    const index=lifeStation(walk.distance),stop=lifeStops[index];
    if(index!==lastStation||lastFlood!==flooded){
      write(node('reason'),stop.reason);write(node('reading'),siteReading(index,flooded));
      if(index!==lastStation)onStation?.(index);
      lastStation=index;lastFlood=flooded;node('station').value=String(index);
    }
    write(mapLabel,stop.name);
    node('progress').value=walk.distance;
    const at=Math.round(walk.distance),total=Math.round(lifeLength);
    const text=walk.obstacle?`在 ${at} m 遇到阻挡。可手动绕行，或定位到下一处观察点。`:
      offRoute?'已离开标记路线，可沿金线走回或选择观察点。':
      walk.done?`已${continuous?'全程步行':''}抵达中央海湾 · ${total} m`:
      `${walk.playing?'步行导览':'自由步行'} · ${at} / ${total} m · 下一站 ${lifeStops[index+1]?.name??stop.name}`;
    write(node('status'),text);
    write(node('guide'),walk.playing?'暂停导览':walk.done?'从头步行导览':walk.distance>0?'继续步行导览':'开始步行导览');
    node('guide').disabled=offRoute;
  }
  function setFlood(on){
    flooded=on;visuals.flood(on);node('flood').setAttribute('aria-pressed',String(on));
    node('flood-note').hidden=!on;render();
  }
  function placeAt(index){
    const station=lifeStops[index],point=lifePoint(station.at);
    if(!place(point))return false;
    walk.reset(point.at);continuous=index===0;offRoute=false;
    aim(station.target,station.targetHeight,true);
    lastStation=-1;render();return true;
  }
  function setVisible(on){
    panel.hidden=!on;visuals.show(on);button.setAttribute('aria-expanded',String(on));
    document.documentElement.dataset.lifeWalk=on?'open':'closed';onDisplay(on);
  }
  function close(){
    if(panel.hidden)return;
    walk.pause();setFlood(false);setVisible(false);
  }
  function guide(){
    if(walk.playing){walk.pause();render();return;}
    if(walk.done&&!placeAt(0))return;
    walk.obstacle=null;walk.playing=true;render();
  }
  function manual(){
    if(panel.hidden)return;
    walk.pause();
    const p=pose(),at=lifeNear(p.x,p.z,7,walk.distance);
    offRoute=at===null;
    if(!offRoute)walk.reset(at);
    else continuous=false;
    render();
  }
  node('close').addEventListener('click',()=>{close();button.focus({preventScroll:true});});
  node('guide').addEventListener('click',guide);
  node('flood').addEventListener('click',()=>{walk.pause();setFlood(!flooded);});
  node('reset').addEventListener('click',()=>placeAt(0));
  node('station').addEventListener('change',e=>placeAt(Number(e.target.value)));
  return {
    get active(){return !panel.hidden;},
    get station(){return lifeStation(walk.distance);},
    open(index=0){
      const routeIndex=Number.isInteger(index)&&lifeStops[index]?index:0;
      if(!placeAt(routeIndex))return false;
      setVisible(true);render();return true;
    },
    close,manual,jump:placeAt,
    pause(){walk.pause();render();},
    tick(metresToWalk){
      if(panel.hidden||!walk.playing)return;
      const from=pose(),onLine=lifePoint(walk.distance),gap=Math.hypot(from.x-onLine.x,from.z-onLine.z);
      // Join the centreline on foot when resuming from a manual detour.
      if(gap>.22){
        const stride=Math.min(.22,gap,metresToWalk),u=stride/gap;
        if(!step({x:from.x+(onLine.x-from.x)*u,z:from.z+(onLine.z-from.z)*u})){
          walk.obstacle=onLine;walk.pause();
        }else aim(onLine,1.72,false);
        render();return;
      }
      walk.advance(metresToWalk,step);
      if(walk.done){
        const end=lifeStops.at(-1);aim(end.target,end.targetHeight,false);
      }else aim(lifePoint(walk.distance+10),1.72,false);
      render();
    }
  };
}
