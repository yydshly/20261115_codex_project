// Authored presentation parameters, not astronomy, climate or fluid simulation.
export const weatherTypes={clear:'晴朗',overcast:'阴天',rain:'降雨',snow:'降雪',fog:'浓雾',storm:'雷暴',dust:'沙尘'};
export const seasons=['春','夏','秋','冬'];
export const climateStations=new Set(['plain','forest-dense','lake','ice-lake','marsh','marine-shallow']);
export const climateCues=[
 {id:'spring-dawn',name:'春日清晨',hour:7,season:0,weather:'clear',focus:'低角度晨光与新绿：比较树影、草地和水面的暖冷关系。'},
 {id:'summer-noon',name:'夏日正午',hour:12,season:1,weather:'clear',focus:'高处日光与浓绿：比较明亮地表、林下阴影和清楚的远景。'},
 {id:'summer-dusk',name:'夏日暮色',hour:18,season:1,weather:'overcast',focus:'太阳接近地平线，天空变暖、直接光减弱；水面也随天空变色。'},
 {id:'autumn-rain',name:'秋日风雨',hour:15,season:2,weather:'rain',focus:'阔叶与草地转暖，雨线、风动、湿地表与较粗糙水面共同形成雨景。'},
 {id:'winter-snow',name:'冬日降雪',hour:10,season:3,weather:'snow',focus:'地表与植被上表面出现薄雪，水面保持水位，淡水的寒冷色调与海水分开。'},
 {id:'winter-night',name:'冬夜晴空',hour:23,season:3,weather:'clear',focus:'日光退去，月光和星点出现；低亮度仍保留通行与水岸轮廓。'}
];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
const blend=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
const palette=[[.69,1.12,.68],[.76,1,.7],[2.6,.8,.3],[.8,.86,.81]];
const weatherParams={clear:[0,0,0,.18],overcast:[.8,0,0,.4],rain:[1,1,0,.85],snow:[.85,0,1,.45],fog:[.72,0,0,.1],storm:[1,1,0,1],dust:[.65,0,0,.95]};
export function normalizeWeather(input={}){return {hour:Number.isFinite(input.hour)?((input.hour%24)+24)%24:10.5,season:clamp(Number.isFinite(input.season)?input.season:1,0,3),weather:weatherTypes[input.weather]?input.weather:'clear',playing:!!input.playing,rate:clamp(Number.isFinite(input.rate)?input.rate:.25,.05,2)};}
export function weatherFrame(input){const s=normalizeWeather(input),angle=(s.hour-6)/24*Math.PI*2,elevation=Math.sin(angle),day=clamp((elevation+.08)/.32),twilight=clamp(1-Math.abs(elevation)/.32),night=1-day,[cloud,rain,snow,wind]=weatherParams[s.weather],i=Math.min(2,Math.floor(s.season)),u=s.season-i,leafTint=blend(palette[i],palette[i+1],u),winter=clamp(s.season-2),spring=clamp(1-s.season),dust=s.weather==='dust'?1:0,storm=s.weather==='storm'?1:0,fog=dust?.009:storm?.0032:s.weather==='fog'?.006:s.weather==='rain'?.0018:s.weather==='snow'?.0023:.00075+cloud*.00035;
 const noon=[.34,.57,.76],nightSky=[.018,.035,.085],warm=[.69,.37,.24],top=blend(blend(nightSky,noon,day),[.38,.44,.49],cloud*day*.65),horizon=blend(blend([.045,.075,.13],[.75,.84,.78],day),warm,twilight*day*.7);
 return {...s,elevation,day,night,cloud,rain,snow,wind,fog,leafTint,winter,spring,dust,storm,top:blend(top,[.48,.34,.21],dust*.8),horizon:blend(horizon,[.63,.48,.3],dust*.85),sunIntensity:3.2*day*(1-cloud*.78)*(1-dust*.6),ambientIntensity:.24+day*1.56*(1-cloud*.18),sunColor:blend([1,.49,.23],[1,.93,.77],clamp(elevation/.65)),sunDirection:[Math.cos(angle)*.8,elevation,.55*Math.cos(angle)],moonIntensity:.3*night*(1-cloud*.9)*(1-dust*.9),stars:night*(1-cloud)*(1-dust*.99),wetness:rain*.85,snowCover:winter*.8+snow*.16,waterChop:.02+wind*.09,waterTint:blend([.24,.48,.48],[.19,.27,.31],cloud*.45+night*.35)};
}
export function advanceWeather(state,dt){const s=normalizeWeather(state);return {...s,hour:(s.hour+(s.playing?clamp(dt,0,1)*s.rate:0))%24};}
export function interpolateFrame(a,b,u){u=clamp(u);const out={...b};for(const key of Object.keys(b))if(typeof b[key]==='number'&&typeof a[key]==='number')out[key]=mix(a[key],b[key],u);else if(Array.isArray(b[key]))out[key]=blend(a[key],b[key],u);return out;}
export function climateContext(stop){const id=stop?.id||'',name=stop?.name||'当前环境';return {name,detail:stop?.geology?'海洞和分支洞网有实际洞顶，洞内抑制外部降水，使用教学补光；热泉和蒸汽为表现样本，天气不改变水位或产生地热循环。':stop?.polar?'极地冰雪与苔原共用昼夜和天气；晴夜显示动态极光，白昼、阴云与雾使光带减弱。海冰与冰山目前静态，融水池冻结为表现层。':stop?.settlement?'聚落沿街组织生活，门洞连接室内；比较屋面薄雪、街道雨景与夜间灯光，室内不落雨雪。':stop?.cave?'洞内没有直接降水；对照入口亮度和原有地下照明，洞顶阻挡外部天气。':stop?.marine?'沿海床观察天空光照减弱后的水下色调。雨雪只发生在海面以上，海水不铺雪或随季节抬升。':stop?.glacial?'比较已有冰体、积雪与新增表面薄雪；本轮不让冰川移动或凭切季节消失。':id.startsWith('forest')?'重点看阔叶树冠、常绿针叶、林下与地被的不同响应；季节改变外观，树干和可通行空间保留。':id==='lake'||id==='marsh'||id==='river'?'重点看岸上植被、湿地表、水面粗糙度和倒映色调；床底与既有水位保持连续。':'重点看太阳方向、山体阴影、地表覆盖和远景能见度；观察位置与地形骨架保持一致。'};}
export class WeatherSequence{
 constructor(){this.elapsed=0;this.index=-1;this.running=false;}
 start(){this.elapsed=0;this.index=0;this.running=true;return climateCues[0];}
 tick(dt,allowed=true){if(!this.running||!allowed)return null;this.elapsed+=Math.max(0,Math.min(1,dt));const index=Math.min(5,Math.floor(this.elapsed/8));if(this.elapsed>=48){this.running=false;return {done:true};}if(index!==this.index){this.index=index;return climateCues[index];}return null;}
 stop(){this.running=false;}
}
