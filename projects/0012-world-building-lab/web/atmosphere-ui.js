import {atmosphereStops,atmosphereView,cycloneWind,findAtmosphereStop,cycloneCenter,opticalAngles} from './atmosphere-study.js';
import {createAtmosphereScene} from './atmosphere-scene.js';
import {constructionStops} from './construction-learning.js';

const skyHref='expedition.html#build-'+(constructionStops.findIndex(stop=>stop.id==='sky-cloud')+1);
const readings={
  rainbow:()=>`主虹外缘距反太阳点约 ${opticalAngles.rainbow}° · 背向太阳观察`,
  halo:()=>`光环距太阳约 ${opticalAngles.halo}° · 面向太阳方向观察`,
  mirage:()=> '比较近地亮带和同一块干燥砾地',
  tornado:enabled=>enabled?'地面尘土旋转 · 漏斗连到低云':'雷暴云和远处雨幕仍在',
  cyclone:enabled=>{
    const eye=cycloneWind(cycloneCenter.x,cycloneCenter.z,enabled);
    const wall=cycloneWind(cycloneCenter.x+117,cycloneCenter.z,enabled);
    return `眼区风速指数 ${eye.speed.toFixed(2)} · 眼墙半径处 ${wall.speed.toFixed(2)}`;
  }
};

export function mountAtmosphereStudy(panel,scene,sky,reduced){
  const model=createAtmosphereScene(scene,sky,{reduced});
  panel.innerHTML=`
    <h3>天空与风场</h3>
    <div class="cold-nav">
      <select id="atmosphere-stop" aria-label="天气观测点">
        ${atmosphereStops.map(({id,name})=>`<option value="${id}">${name}</option>`).join('')}
      </select>
      <button id="atmosphere-next" type="button">下一站 →</button>
    </div>
    <div class="formation-actions" aria-label="形成条件">
      <button id="atmosphere-on" type="button"></button>
      <button id="atmosphere-off" type="button"></button>
    </div>
    <div class="formation-actions" id="atmosphere-cyclone" aria-label="气旋观察方式" hidden>
      <button id="atmosphere-view" type="button"></button>
      <button id="atmosphere-wind" type="button">叠加近海面风向</button>
    </div>
    <p id="atmosphere-reading" class="plan-present" role="status"></p>
    <p id="atmosphere-detail"></p>
    <p class="plan-note" id="atmosphere-check"></p>
    <p class="plan-note">观测点沿用现有大地图。蜃景用贴地折射的视觉近似，风场、水汽和尺度采用教学设定。</p>
    <div class="plan-sources"><a id="atmosphere-source" target="_blank" rel="noopener"></a></div>
    <a class="plan-catalog-link" href="${skyHref}">返回云层、雷暴、沙尘和夜空路线 ↗</a>`;
  const find=id=>panel.querySelector('#atmosphere-'+id);
  let stop=atmosphereStops[0],enabled=true,wind=false,coast=false,view=null,weather=null;

  function paint(){
    weather={hour:stop.hour,weather:stop.id==='cyclone'&&coast&&enabled?'storm':stop.weather,season:1};
    find('on').textContent=stop.condition;
    find('off').textContent=stop.baseline;
    find('on').setAttribute('aria-pressed',String(enabled));
    find('off').setAttribute('aria-pressed',String(!enabled));
    find('stop').value=stop.id;
    find('next').textContent=stop.id==='cyclone'?'回草原 ↗':'下一站 →';
    find('cyclone').hidden=stop.id!=='cyclone';
    find('view').textContent=coast?'切到气旋俯视':'切到海岸低视角';
    find('wind').setAttribute('aria-pressed',String(wind&&!coast));
    find('wind').disabled=coast;
    find('reading').textContent=readings[stop.id](enabled);
    find('detail').textContent=stop.detail;
    find('check').textContent=stop.check;
    find('source').textContent=stop.source[0]+' ↗';
    find('source').href=stop.source[1];
    model.show(stop.id,enabled,wind,coast);
  }

  function select(id,condition=true,shore=false){
    stop=findAtmosphereStop(id);
    enabled=condition;
    coast=stop.id==='cyclone'&&shore;
    wind=false;
    view=atmosphereView(stop,coast);
    paint();
  }

  find('stop').addEventListener('change',e=>select(e.target.value));
  find('next').addEventListener('click',()=>select(atmosphereStops[(atmosphereStops.indexOf(stop)+1)%atmosphereStops.length].id));
  find('on').addEventListener('click',()=>{enabled=true;paint();});
  find('off').addEventListener('click',()=>{enabled=false;paint();});
  find('wind').addEventListener('click',()=>{wind=!wind;paint();});
  find('view').addEventListener('click',()=>{coast=!coast;view=atmosphereView(stop,coast);paint();});

  return {
    show(context={}){select(context.station,context.condition!=='off',context.view==='coast');},
    hide(){model.hide();},
    update(dt){model.update(dt);},
    project(camera){model.project(camera);},
    get view(){return view;},
    get weather(){return weather;}
  };
}
