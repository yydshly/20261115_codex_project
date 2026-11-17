export const DAY_MS=1080000, WEATHER_MS=720000, RAIN_START=420000, RAIN_END=600000;
export const TIME_OPTIONS=[['auto','随小庭慢慢流转'],['dawn','清晨'],['afternoon','午后'],['dusk','黄昏'],['night','夜晚']];
export const WEATHER_OPTIONS=[['auto','自然晴雨'],['clear','晴朗'],['cloudy','薄云'],['rain','细雨']];
const HOURS={dawn:6.3,afternoon:14.5,dusk:18.5,night:22};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
export function createAtmosphere(now=Date.now()) {return {timeMode:'auto',hour:14.5,timeEpoch:now,weatherMode:'auto',weatherEpoch:now};}
export function readAtmosphere(value,now=Date.now()) {
  const e=createAtmosphere(now),s=value||{};
  if(TIME_OPTIONS.some(([id])=>id===s.timeMode))e.timeMode=s.timeMode;
  if(WEATHER_OPTIONS.some(([id])=>id===s.weatherMode))e.weatherMode=s.weatherMode;
  if(Number.isFinite(s.hour))e.hour=clamp(s.hour,0,23.999);
  for(const k of ['timeEpoch','weatherEpoch'])if(Number.isFinite(s[k]))e[k]=clamp(s[k],0,now);
  return e;
}
export function environmentAt(e,now=Date.now()) {
  const hour=e.timeMode==='auto'?(e.hour+Math.max(0,now-e.timeEpoch)/DAY_MS*24)%24:HOURS[e.timeMode]??14.5;
  const phase=Math.max(0,now-e.weatherEpoch)%WEATHER_MS;
  const weather=e.weatherMode==='auto'?(phase<240000?'clear':phase<RAIN_START?'cloudy':phase<RAIN_END?'rain':phase<660000?'cloudy':'clear'):e.weatherMode;
  const darkness=hour<4.5||hour>=20?1:hour<7?1-smooth((hour-4.5)/2.5):hour>16.5?smooth((hour-16.5)/3.5):0;
  const warmth=Math.max(Math.exp(-(((hour-18)/1.5)**2))*.55,Math.exp(-(((hour-6.3)/1.2)**2))*.25);
  const period=hour<4.5||hour>=20?'夜晚':hour<8?'清晨':hour<12?'上午':hour<16.5?'午后':'黄昏';
  return {hour,period,weather,weatherLabel:{clear:'晴朗',cloudy:'薄云',rain:'细雨'}[weather],rain:weather==='rain'?1:0,
    cloud:weather==='rain'?.85:weather==='cloudy'?.5:0,night:darkness,warmth,
    label:`${period} · ${{clear:'晴朗',cloudy:'薄云',rain:'细雨'}[weather]}`};
}
export function setAtmosphere(e,type,mode,now=Date.now()) {
  if(type==='time'&&TIME_OPTIONS.some(([id])=>id===mode)){
    e.hour=environmentAt(e,now).hour;e.timeEpoch=now;e.timeMode=mode;return true;
  }
  if(type==='weather'&&WEATHER_OPTIONS.some(([id])=>id===mode)){e.weatherMode=mode;e.weatherEpoch=now;return true;}
  return false;
}
// Rain plus a short period of retained soil moisture, bounded even for years away.
export function rainSpans(e,from,to,retention=180000) {
  if(!e||to<=from||e.weatherMode==='clear'||e.weatherMode==='cloudy')return [];
  const spans=[];
  if(e.weatherMode==='rain'){
    if(to>e.weatherEpoch)spans.push([Math.max(from,e.weatherEpoch),to]);
    return spans;
  }
  const start=Math.max(from,to-WEATHER_MS*2-retention);
  const first=Math.max(0,Math.floor((start-e.weatherEpoch-RAIN_END-retention)/WEATHER_MS));
  const last=Math.floor((to-e.weatherEpoch-RAIN_START)/WEATHER_MS);
  for(let k=first;k<=last;k++){
    const a=e.weatherEpoch+k*WEATHER_MS+RAIN_START,b=e.weatherEpoch+k*WEATHER_MS+RAIN_END+retention;
    if(b>from&&a<to)spans.push([Math.max(from,a),Math.min(to,b)]);
  }
  return spans;
}
export function unionDuration(spans) {
  let end=-Infinity,total=0;
  for(const [a,b] of spans.filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0])){total+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}
  return total;
}
export function lastRainAt(e,from,to) {
  if(!e||e.weatherMode==='clear'||e.weatherMode==='cloudy')return 0;
  if(e.weatherMode==='rain')return to>=e.weatherEpoch?to:0;
  const k=Math.floor((to-e.weatherEpoch-RAIN_START)/WEATHER_MS);
  if(k<0)return 0;
  const end=Math.min(to,e.weatherEpoch+k*WEATHER_MS+RAIN_END);
  return end>from?end:0;
}
