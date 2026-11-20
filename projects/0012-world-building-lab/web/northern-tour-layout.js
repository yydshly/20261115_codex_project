import {northSample} from './northern-watershed.js';
import {strataRiver} from './strata-layout.js';
import {fanProfile} from './fan-layout.js';
import {riverSample,waterAt} from './water-system.js';
import {terrainHeight} from './large-world.js';

function route(kind){const path=[],marks=[];const add=(title,anchor,explanation)=>marks.push({pointIndex:path.length,index:marks.length,title,anchor,explanation});const line=(sample,n=120)=>{for(let i=0;i<n;i++)path.push(sample(i/n));};
 if(kind==='fan'){
  add('山口上游集水凹谷',90,'先有较高的集水凹谷和碎屑坡，再沿下行槽道到40米扇顶。地形为固定创作形体，未模拟降雨和物源产出。');line(t=>northSample('fan-head',t));
  add('山口与原冲积扇',90,'新增上游与原扇顶同位相接，保留原来的扇面和四个观察站。');line(t=>{const z=-1030+75*t,p=fanProfile(z);return {x:p.channels[0],z,level:p.level};},70);
  add('原分汊与沙砾洲',91,'三股分汊共用原纵向水位，沙砾洲和手动常水、涨水参考继续保留。');line(t=>{const z=-955+106*t,p=fanProfile(z);return {x:p.channels[0],z,level:p.level};},90);
  add('18米扇尾与出流口',93,'扇尾接入东支谷，避免把低水位出口接回更高扇顶。');line(t=>northSample('fan-out',t*.55),90);
  add('绕过高台林地的东支谷',93,'水路从原寒温带高台林地东侧绕行，保留原林地和通路。较低河槽、湿岸与高台分开。');line(t=>northSample('fan-out',.55+t*.45),90);
 }else{
  add('岩层上游集水凹谷',86,'新增上游凹谷从34米降到24米原溪流起点，岩层区原位置和层序展示保留。');line(t=>northSample('strata-head',t));
  add('24米原上游塘盆',89,'上游与原塘盆同水位相接，池盆、床底和岸坡仍是实体高度场。');line(t=>strataRiver(-1460+100*t),90);
  add('原岩层溪流与阶地',89,'沿原岩层溪流下行，比较水平层位、岸坡与分级阶地。');line(t=>strataRiver(-1360+100*t),90);
  add('18米阶地出流口',89,'原末端塘盆接向西支谷，水面继续降低。');line(t=>northSample('strata-out',t*.65),100);
  add('绕过高台林地的西支谷',89,'西支谷绕过原高台森林，与东侧扇面支流在林地下方汇合。没有切穿或重置原森林。');line(t=>northSample('strata-out',.65+t*.35),90);
 }
 add('两支谷同位汇合',93,'西侧岩层支流与东侧扇面支流在8米同位汇合；两股出流先汇合，再共同向中央主河下降。');line(t=>northSample('trunk',t*.72),100);
 add('原岸路跨越新支流',16,'新支流进入中央主河前从原岸路下方通过。步桥保持旧路线的平面位置，河床在桥下留出水路。');line(t=>northSample('trunk',.72+t*.28),60);
 add('接入原中央主河',16,'汇口与原主河0.62处相接，水位约2.19米；之后继续沿原湿地、分汊与海湾出海。');line(t=>riverSample(.62+t*.18),100);
 add('原湿地与分汊',17,'沿原低地水网继续，不另造一个河口。原水系和观察点继续保留。');line(t=>riverSample(.8+t*.2),100);
 add('原河口与海湾',18,'两条北部支流现在都能沿原中央水系到海面。高原—雨林水系仍是另一条外流系统，盐盆仍保持内流。');path.push(riverSample(1));
 let total=0;const distances=[0];for(let i=1;i<path.length;i++){total+=Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z);distances.push(total);}const stops=marks.map(m=>({...m,...path[m.pointIndex],distance:distances[m.pointIndex]}));
 function sample(distance){let d=Math.max(0,Math.min(total,distance));for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],length=distances[i]-distances[i-1];if(d<=length||i===path.length-1){const u=Math.min(1,d/(length||1));return {x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u};}d-=length;}}
 return {kind:'north-'+kind,title:kind==='fan'?'冲积扇到中央海湾':'岩层溪流到中央海湾',scope:'沿上游、原场景、出流谷地、汇口与原主河巡看；这是沿真实水路的教学飞行镜头，不是地面步行。',stops,length:total,sample};
}
export const NORTHERN_TOURS={ 'north-fan':route('fan'),'north-strata':route('strata') };
export function northSurveyFrame(tour){const r=tour.route,stop=r.stops[tour.section],raw=r.sample(tour.distance),ahead=r.sample(Math.min(r.length,tour.distance+((tour.hold>0||!tour.playing)?0:30))),w=waterAt(raw.x,raw.z);return {...stop,p:{x:raw.x+24,z:raw.z+25,y:Math.max(terrainHeight(raw.x+24,raw.z+25),w?.level??0)+28},look:{...ahead,targetY:(waterAt(ahead.x,ahead.z)?.level??0)+.3},progress:tour.distance/r.length,playing:tour.playing,active:tour.active,done:tour.done,survey:true};}
