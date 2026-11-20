import {benchmarkLength} from './benchmark-trail.js';
import {epochs} from './ice-age.js';
import {lifeStops} from './life-route.js';
import {mainlineLessons} from './mainline-lessons.js';
import {validScene} from './world-progress-data.js';

const planParameters={
  '':['zone'],
  '1':['zone'],
  map:['zone'],
  logic:[],
  annual:[],
  gaps:['focus'],
  geography:['focus'],
  balance:['focus'],
  sediment:['focus'],
  soil:['focus'],
  lines:['focus','month'],
  foundation:['focus','month','seam'],
  tectonics:['focus'],
  cold:['focus','station','month'],
  'rain-shadow':['station','month'],
  'fluid-vents':['route','station','view'],
  'scrub-recovery':['station','stage','season'],
  atmosphere:['station','condition','view'],
  'coast-sea':['station','tide','view'],
  groundwater:['focus'],
  'ridge-bay':['station','month','compare'],
  exchange:['focus'],
  wetland:['focus'],
  estuary:['focus'],
  formation:['focus','month','study'],
  timeline:['focus','epoch','station'],
  'deep-time':['case','phase','station','view','focus'],
  legacy:['epoch','station','view'],
  storm:['focus','study']
};

export function resumeExpedition(scene,search){
  const from=validScene(scene);
  if(!from)return null;

  const input=new URLSearchParams(search),query=new URLSearchParams();
  const plan=input.get('plan'),walk=input.get('walk');
  if(plan!==null&&Object.hasOwn(planParameters,plan)){
    query.set('plan',plan||'map');
    for(const key of planParameters[plan]){
      const value=input.get(key);
      if(value&&/^[a-z\d][a-z\d_-]{0,48}$/i.test(value))query.set(key,value);
    }
  }else if(walk==='snow-to-deep'||walk==='snow-to-bay'){
    const epoch=input.get('epoch'),station=input.get('station'),at=input.get('at');
    const guided=walk==='snow-to-deep'||input.get('guide')==='main';
    query.set('walk',walk);
    if(guided&&walk==='snow-to-bay')query.set('guide','main');
    if(Object.hasOwn(epochs,epoch)&&epoch!=='now')query.set('epoch',epoch);
    if(guided&&mainlineLessons.some(lesson=>lesson.id===station))query.set('station',station);
    if(!query.has('station')&&/^\d{1,4}(\.\d{1,2})?$/.test(at)&&Number(at)<=Math.ceil(benchmarkLength*100)/100)query.set('at',at);
  }else if(walk==='valley-life'){
    const stop=input.get('stop');
    query.set('walk',walk);
    query.set('stop',/^\d{1,3}$/.test(stop)&&Number(stop)<lifeStops.length?String(Number(stop)):'0');
  }

  const view=query.toString();
  const context=new URLSearchParams({from});
  if(view)context.set('view',view);
  return {href:`expedition.html${view?'?'+view:''}#${from}`,context:context.toString()};
}

export function clearWorldPlanQuery(url){
  const params=url.searchParams,plan=params.get('plan');
  if(plan===null)return url;

  const walk=params.get('walk');
  const snowWalk=walk==='snow-to-deep'||walk==='snow-to-bay';
  const snowStation=walk==='snow-to-deep'||(snowWalk&&params.get('guide')==='main');
  for(const key of Object.hasOwn(planParameters,plan)?planParameters[plan]:[]){
    if((key==='epoch'&&snowWalk)||(key==='station'&&snowStation))continue;
    params.delete(key);
  }
  params.delete('plan');
  return url;
}

export function setRidgeBayQuery(url,state){
  const params=url.searchParams;
  if(!state){
    return params.get('plan')==='ridge-bay'?clearWorldPlanQuery(url):url;
  }
  clearWorldPlanQuery(url);
  for(const key of ['walk','guide','stop','station','epoch','at','connection'])params.delete(key);
  params.set('plan','ridge-bay');
  params.set('station',state.station);
  params.set('month',String(state.month));
  params.set('compare',state.compare?'1':'0');
  return url;
}

export function setValleyLifeQuery(url,station){
  const params=url.searchParams,previousWalk=params.get('walk');
  if(station===null){
    if(previousWalk==='valley-life'){
      params.delete('walk');
      params.delete('stop');
    }
    return url;
  }
  if(!Number.isSafeInteger(station)||station<0)return url;

  clearWorldPlanQuery(url);
  if(previousWalk!==null&&previousWalk!=='valley-life'){
    for(const key of ['at','epoch','station','guide'])params.delete(key);
  }
  // This startup selector opens a separate connection tour alongside the walk.
  params.delete('connection');
  params.set('walk','valley-life');
  params.set('stop',String(station));
  return url;
}
