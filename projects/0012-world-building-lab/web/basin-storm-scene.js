import * as THREE from 'three';
import {terrainHeight} from './large-world.js';
import {hash} from './vegetation-rules.js';
import {stormCatchment,runStormComparison} from './basin-storm.js';
import {estuaryPlantPlot} from './estuary-layout.js';
import {wetlandPlotAt} from './wetland-layout.js';
import {buildShoreEvolution,makeShoreSurvey,stormSediment} from './storm-sediment.js';
import {createStormSedimentScene} from './storm-sediment-scene.js';
import {growNewShore,surveyNewShore,testNewShore} from './shore-succession.js';
import {createShoreSuccessionScene} from './shore-succession-scene.js';
import {compareSeaChange,moveShorePlants} from './shore-sea-change.js';
import {createShoreSeaScene} from './shore-sea-scene.js';

const flowLayers=new Set(['surface','ground']);
const plot=(x,z)=>wetlandPlotAt(x,z)||estuaryPlantPlot(x,z);
const seasonFor=event=>event.settings.month===7?'wet':'dry';

function rainFootprint(catchment){
  const v=[],indices=[],half=catchment.grid.step/2,step=half/2;
  for(const cell of catchment.cells){
    const base=v.length/3;
    for(let j=0;j<=4;j++)for(let i=0;i<=4;i++){
      const x=cell.x-half+i*step,z=cell.z-half+j*step;
      v.push(x,terrainHeight(x,z)+1.3,z);
      if(i<4&&j<4){
        const n=base+j*5+i;indices.push(n,n+5,n+1,n+1,n+5,n+6);
      }
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(indices);
  return new THREE.Mesh(g,new THREE.MeshBasicMaterial({
    color:'#ffd27f',transparent:true,opacity:.29,depthWrite:false,toneMapped:false,side:THREE.DoubleSide
  }));
}

function section(samples){
  const root=new THREE.Group();
  const points=samples.filter(p=>p.d>11&&p.d<47).map(p=>{
    const x=p.x,z=p.z+49,base=terrainHeight(x,z)+.16;
    return {x,z,base,top:base+15+(p.d-11)*.085};
  });
  const tiltedZ=(p,height)=>p.z-(height-p.base)*1.05;
  function strip(a,b,color,offset){
    const v=[],indices=[];
    for(const [i,p] of points.entries()){
      const low=a(p),high=b(p);
      v.push(p.x,low,tiltedZ(p,low)+offset,p.x,high,tiltedZ(p,high)+offset);
      if(i){const n=i*2;indices.push(n-2,n-1,n,n,n-1,n+1);}
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(indices);
    const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,toneMapped:false}));
    root.add(mesh);return mesh;
  }
  strip(p=>p.base,p=>p.top,'#a38760',0);
  strip(p=>p.base-.6,p=>p.base+1.25,'#6b5e59',.08);
  const water=strip(p=>p.base+1.22,p=>p.base+1.23,'#76e2e5',.17);
  const position=water.geometry.getAttribute('position');
  water.frustumCulled=false;
  const p=points[Math.floor(points.length/2)];
  return {root,label:{text:'浅层蓄水 · 放大剖面',x:p.x,z:tiltedZ(p,p.top),y:p.top+4,color:'#a0f1e3'},
    set(ratio){
      water.visible=ratio>.005;
      points.forEach((p,i)=>{
        const upper=p.base+1.23+ratio*(p.top-p.base-1.57);
        position.setXYZ(i*2+1,p.x,upper,tiltedZ(p,upper)+.17);
      });
      position.needsUpdate=true;
    }
  };
}

export function createBasinStormScene(scene,balance,{exchange,wetland,estuary,vegetation,reduced=false}){
  const root=new THREE.Group();
  root.visible=false;root.name='single northern storm from rain to central bay';scene.add(root);
  const sedimentScene=createStormSedimentScene(scene);
  const successionScene=createShoreSuccessionScene(scene);
  const seaScene=createShoreSeaScene(scene);
  const evolution=new WeakMap(),habitats=new WeakMap();
  let catchment,footprint,streaks,samples,attribute,gauge,time=0,source=null;
  let cachedSource,cachedStudy,wetResult,coastResult,survey;
  function initialize(){
    if(catchment)return;
    catchment=stormCatchment(balance.model);
    footprint=rainFootprint(catchment);root.add(footprint);
    samples=catchment.cells.flatMap((p,i)=>Array.from({length:4},(_,n)=>{
      const x=p.x+(hash(i,n,13)-.5)*35,z=p.z+(hash(i,n,14)-.5)*35;
      return {x,z,y:terrainHeight(x,z),phase:hash(i,n,18)};
    }));
    const geometry=new THREE.BufferGeometry();
    attribute=new THREE.BufferAttribute(new Float32Array(samples.length*6),3);
    geometry.setAttribute('position',attribute);
    streaks=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({
      color:'#cfefff',transparent:true,opacity:.75,depthWrite:false,toneMapped:false
    }));
    streaks.frustumCulled=false;root.add(streaks);
    gauge=section(exchange.model.profile);root.add(gauge.root);
  }
  function paintRain(){
    if(!source?.rainRate)return;
    const amount=Math.min(samples.length,Math.floor(46+source.rainRate*4));
    streaks.geometry.setDrawRange(0,amount*2);
    for(let i=0;i<amount;i++){
      const {x,y,z,phase}=samples[i],lift=3+THREE.MathUtils.euclideanModulo(phase-time*1.64,1)*65;
      attribute.setXYZ(i*2,x,y+lift,z);
      attribute.setXYZ(i*2+1,x-1.3,y+lift-5,z+.6);
    }
    attribute.needsUpdate=true;
  }
  function activate(){
    initialize();
    if(root.visible)return;
    root.visible=true;vegetation?.setLocalMask(plot);
  }
  function getSurvey(){
    survey??=makeShoreSurvey(estuary.model);
    return survey;
  }
  function coastalShape(trial,count){
    const model=estuary.model,plots=getSurvey();
    if(!evolution.has(trial)){
      evolution.set(trial,buildShoreEvolution(model,plots,[trial.sediments.flood,trial.sediments.ebb]));
    }
    return evolution.get(trial).at(count);
  }
  function prepareCoast(){
    activate();
    source=null;cachedSource=null;
    footprint.visible=false;streaks.visible=false;gauge.root.visible=false;
    exchange.hide();wetland.hide();
  }
  function plantStage(shape,years){
    const model=estuary.model,plots=getSurvey();
    if(!habitats.has(shape))habitats.set(shape,{habitat:surveyNewShore(model,plots,shape),stages:new Map()});
    const {habitat,stages}=habitats.get(shape);
    if(!stages.has(years))stages.set(years,{growth:growNewShore(habitat,years),controls:new Map(),seaTrials:new Map()});
    return {habitat,...stages.get(years)};
  }
  return {
    get catchment(){initialize();return catchment;},
    run(settings){
      initialize();
      const trial=runStormComparison(balance.model,catchment,settings);
      const sediments=Object.fromEntries(Object.entries(trial.scenarios).map(([id,event])=>[id,stormSediment(event)]));
      return {...trial,sediments};
    },
    read(event,hour){
      const source=event.frames[hour];
      const wetState=wetland.model.frameForEvent(source,event),coastModel=estuary.model;
      const frame=coastModel.frame(seasonFor(event),'ebb',source);
      return {wetland:wetState,estuary:frame,shore:coastModel.eventShore(event,source,frame)};
    },
    show(event,frame,station,sediment=null){
      activate();
      successionScene.hide();seaScene.hide();
      source=frame;
      footprint.visible=true;
      const season=seasonFor(event);
      if(cachedSource!==frame||cachedStudy!==sediment){
        const layer=sediment?(sediment.marsh[0]+sediment.marsh[1]>0?'sediment':'natural'):'storm';
        wetResult=wetland.show({overlay:true,event,source:frame,layer,managePlants:false});
        coastResult=estuary.show({season,tide:'ebb',event:sediment?null:event,source:frame,
          layer:sediment?'sediment':'salt',managePlants:false,plume:sediment});
        cachedSource=frame;cachedStudy=sediment;
      }
      const upper=exchange.show({season,overlay:true,layers:flowLayers,source:frame});
      streaks.visible=frame.rainRate>0;
      footprint.material.opacity=frame.rainRate>0?.36:.15;
      gauge.root.visible=station==='ground';
      if(gauge.root.visible)gauge.set(Math.min(1,frame.groundwater/2200));
      paintRain();
      let labels=station==='ground'?[gauge.label,...upper.labels.filter(p=>p.id==='spring')]:
        station==='rain'?upper.labels.filter(p=>p.id==='recharge'):
          station==='wetland'?wetResult.labels:coastResult.labels.filter(p=>p.id==='salt'||p.id==='shore'||p.id==='flat');
      if(sediment){
        const downstream=sedimentScene.event({...coastResult,model:estuary.model},getSurvey(),sediment);
        if(station==='estuary')labels=downstream;
      }else sedimentScene.hide();
      return {wetland:wetResult.frame,estuary:coastResult.frame,shore:coastResult.shore,labels};
    },
    evolve(trial,count){
      prepareCoast();
      successionScene.hide();seaScene.hide();
      const model=estuary.model,plots=getSurvey(),season=seasonFor(trial.scenarios.fixed);
      const shape=coastalShape(trial,count),base=model.frame(season,'ebb');
      const coast=estuary.show({season,tide:'ebb',layer:'sediment',managePlants:false,
        bedChange:count?shape.bedChange:null});
      return {shape,...sedimentScene.evolution({...coast,model},plots,base,shape)};
    },
    succeed(trial,count,years,scenario,variant){
      prepareCoast();
      seaScene.hide();
      const model=estuary.model,plots=getSurvey(),shape=coastalShape(trial,count);
      const {habitat,growth,controls}=plantStage(shape,years);
      if(!controls.has(scenario)){
        controls.set(scenario,testNewShore(model,plots,habitat,growth,trial.scenarios[scenario],trial.sediments[scenario]));
      }
      const result=controls.get(scenario);
      const land=variant==='grow'?shape:result[variant].shape;
      const coast=estuary.show({season:'dry',tide:'ebb',layer:'succession',managePlants:false,
        bedChange:count?land.bedChange:null});
      sedimentScene.evolution({...coast,model},plots,habitat.start,land);
      return {...successionScene.show(model,coast.frame,land,growth,variant),habitat,growth,result};
    },
    shiftSea(trial,count,years,settings,phase){
      prepareCoast();
      const model=estuary.model,plots=getSurvey(),shape=coastalShape(trial,count);
      const {habitat,growth,seaTrials}=plantStage(shape,years);
      const key=settings.rise+'/'+settings.surge;
      if(!seaTrials.has(key)){
        if(seaTrials.size>=4)seaTrials.delete(seaTrials.keys().next().value);
        seaTrials.set(key,{coastal:compareSeaChange(model,plots,shape,habitat,growth,settings)});
      }
      const entry=seaTrials.get(key),{coastal}=entry;
      const moving=phase==='migration';
      if(moving&&!entry.migration)entry.migration=moveShorePlants(model,plots,growth,coastal,settings);
      const stage=coastal.stages[moving?'after':phase],migration=moving?entry.migration:null;
      const coast=estuary.show({season:'dry',tide:'ebb',layer:'succession',managePlants:false,
        source:stage.source,bedChange:stage.shape.bedChange});
      sedimentScene.evolution({...coast,model},plots,habitat.start,stage.shape);
      const plantView=successionScene.show(model,coast.frame,stage.shape,migration?.growth??growth,'grow');
      const labels=seaScene.show(model,coastal,coast.frame,phase,migration);
      return {coastal,habitat,migration,labels:phase==='before'?plantView.labels:labels};
    },
    hide(){
      if(!root.visible)return;
      root.visible=false;cachedSource=null;
      exchange.hide();wetland.hide();estuary.hide();sedimentScene.hide();successionScene.hide();seaScene.hide();
      vegetation?.setLocalMask(null);
    },
    update(dt){
      if(!root.visible||reduced)return;
      time+=dt;paintRain();
      exchange.update(dt);estuary.update(dt);sedimentScene.update(dt);
    }
  };
}
