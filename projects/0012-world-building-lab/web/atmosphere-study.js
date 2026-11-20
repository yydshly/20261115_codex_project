import {terrainHeight} from './large-world.js';
import {skyStops} from './sky-learning.js';
import {weatherFrame} from './world-weather.js';

export const atmosphereHref='expedition.html?plan=atmosphere#build-1';
export const opticalAngles={rainbow:42,halo:22};
export const tornadoCenter={x:-176,z:1040};
export const cycloneCenter={x:1530,z:1020};
export const mirageEye={x:16,z:1164};
export const mirageSheet={x:-58,z:1164};

export const atmosphereStops=[
  {id:'rainbow',name:'草原阵雨 · 彩虹',hour:7.6,weather:'clear',condition:'远处有雨滴',baseline:'移去远处雨滴',
    detail:'太阳在身后，亮弧出现在雨幕方向。主虹以反太阳点为圆心，外缘偏红，内缘偏蓝紫。',
    check:'移去雨滴后，草原和太阳方向保持固定，虹弧随雨幕消失。',
    source:['NWS · 彩虹几何','https://www.weather.gov/fgz/Rainbow']},
  {id:'halo',name:'草原高空 · 22° 日晕',hour:7.95,weather:'clear',condition:'高空有冰晶薄云',baseline:'移去冰晶薄云',
    detail:'六角冰晶让阳光折射，在太阳周围形成约 22° 的光环，边缘的淡红色靠近太阳。',
    check:'切掉薄云后太阳仍在原位，光环消失。拖动可把彩虹和日晕的朝向区分开。',
    source:['NWS · 冰晶与日晕','https://www.weather.gov/arx/why_halos_sundogs_pillars']},
  {id:'mirage',name:'戈壁低视线 · 下蜃景',hour:11.9,weather:'clear',condition:'近地空气显著受热',baseline:'近地温差减弱',
    detail:'晴天砾地受热后，贴地空气比上方更热。光线弯曲，近地亮带能出现像水光的天空颜色或颠倒的远景轮廓。',
    check:'保持戈壁干燥和视线不变，减弱温差，贴地的亮带消退。拉高视角也会削弱低视线效果。',
    source:['英国气象局馆藏 · 下蜃景观测与试算','https://library.metoffice.gov.uk/portal/Default/en-GB/RecordView/Index/471177']},
  {id:'tornado',name:'草地强对流 · 龙卷',hour:13.8,weather:'storm',condition:'个案中涡旋触地',baseline:'只有雷暴',
    detail:'湿暖空气、强上升气流和随高度变化的风可支持旋转雷暴。这里展示一个近地涡旋发展并触地的案例，底部尘土跟着环流旋转。',
    check:'切回普通雷暴，云底和远处雨幕仍在，地面旋涡与漏斗消退。旋转雷暴能否产生龙卷还受其他近地条件影响。',
    source:['NOAA · 龙卷和风切变','https://www.noaa.gov/education/resource-collections/weather-atmosphere/tornadoes']},
  {id:'cyclone',name:'暖海外侧 · 热带气旋',hour:11.5,weather:'overcast',condition:'暖海上有组织环流',baseline:'暖海补给减弱',
    detail:'暖海供给水汽和热量，组织好的气旋可形成风眼、眼墙和螺旋雨带。北半球示例中近海面气流逆时针并向内汇入，眼墙附近更强。',
    check:'减弱暖海供给后，按一个逐步减弱的状态展示眼墙与雨带松散。可切到海岸低视角看外围风雨。',
    source:['NOAA · 热带气旋结构','https://www.noaa.gov/jetstream/tropical/tropical-cyclone-introduction/tropical-cyclone-structure']}
];

export const findAtmosphereStop=id=>atmosphereStops.find(stop=>stop.id===id)??atmosphereStops[0];

function look(eye,target,fov){
  return [target.x,target.z,Math.max(0,terrainHeight(target.x,target.z)),
    Math.hypot(eye.x-target.x,eye.z-target.z,eye.y-target.y),undefined,{...eye,targetY:target.y,fov}];
}

export function atmosphereView(stop,coast=false){
  if(stop.id==='mirage'){
    const {x,z}=mirageEye,y=terrainHeight(x,z)+3.7;
    return look({x,z,y},{x:x-155,z,y:y+2.5});
  }
  if(stop.id==='tornado'){
    const {x,z}=tornadoCenter,eye={x:x-154,z:z+155};
    return look({...eye,y:terrainHeight(eye.x,eye.z)+10},{x,z,y:terrainHeight(x,z)+45});
  }
  if(stop.id==='cyclone'){
    const {x,z}=cycloneCenter;
    return coast?look({x:1100,y:32,z:746},{x:x-100,z:z-75,y:63}):
      look({x:x-260,y:840,z:z+410},{x,z:z+56,y:60},73);
  }
  const {x,z}=skyStops[0],y=terrainHeight(x,z)+6;
  const direction=weatherFrame(stop).sunDirection;
  const heading=stop.id==='rainbow'?-1:1;
  const length=Math.hypot(direction[0],direction[2]);
  const targetY=y+(stop.id==='rainbow'?57:91);
  return look({x,z,y},{x:x+direction[0]/length*heading*220,z:z+direction[2]/length*heading*220,y:targetY},
    stop.id==='halo'?86:undefined);
}

// Relative circulation on the map. Positive Z is south.
export function cycloneWind(x,z,organized=true){
  const dx=x-cycloneCenter.x,dz=z-cycloneCenter.z,radius=Math.hypot(dx,dz);
  const wall=Math.exp(-((radius-117)**2)/5900),outer=Math.exp(-((radius-280)**2)/63000);
  const speed=organized?(.76*wall+.28*outer)*Math.min(1,radius/64):.19*outer;
  if(!radius)return {x:0,z:0,speed:0};
  return {x:(dz-.27*dx)/radius*speed,z:(-dx-.27*dz)/radius*speed,speed};
}

export const atmospherePath=[
  ...skyStops.slice(0,3).map(({x,z})=>[x,z]),
  [mirageEye.x,mirageEye.z],[tornadoCenter.x,tornadoCenter.z],[1100,746],
  [cycloneCenter.x,cycloneCenter.z]
];
