import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createValleyLife} from './valley-life.js';
import {heightAt} from './terrain.js';

const loader=new GLTFLoader();loader.register(()=>({name:'CPUSoleInspection',loadTexture:async()=>new THREE.Texture()}));
const assets={};for(const name of ['gardener','cow']){
  const b=await readFile(new URL(`./assets/models/life/${name}.glb`,import.meta.url)),a=await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
  a.scene.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(a.scene,true);assets[name]={...a,bounds,size:bounds.getSize(new THREE.Vector3())};
}
const life=createValleyLife(new THREE.Scene(),assets,{heightAt,walkHeight:heightAt}),point=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3(),terrainCache=new Map();
const checkedHeight=(x,z)=>{const key=Math.round(x*1e6)+':'+Math.round(z*1e6);if(!terrainCache.has(key))terrainCache.set(key,heightAt(x,z));return terrainCache.get(key);};
const report=[];
for(const c of life.cattle){
  const cow=c.behavior,g=cow.mesh.geometry,p=g.attributes.position,skin=g.attributes.skinIndex,weight=g.attributes.skinWeight;
  const cells=Array.from({length:4},()=>new Map());
  for(let i=0;i<p.count;i++)if(p.getY(i)<.09)for(let j=0;j<4;j++){
    const bone=skin.getComponent(i,j),leg=(bone-7)/3;if(!Number.isInteger(leg)||leg<0||leg>3||weight.getComponent(i,j)<.99)continue;
    const key=Math.floor(p.getX(i)/.015)+':'+Math.floor(p.getZ(i)/.015),old=cells[leg].get(key);
    if(old===undefined||p.getY(i)<p.getY(old))cells[leg].set(key,i);
  }
  const probes=cells.map(map=>[...map.values()]),standing=[],phaseMetrics={};let maxStanceGap=-Infinity,minClearance=Infinity,maxDrift=0,previous=[];
  for(let frame=0;frame<90*30;frame++){
    const t=frame/30,m=c.roaming.sample(t);m.predict=seconds=>c.roaming.sample(t+seconds);
    const sx=(heightAt(m.x+.8,m.z)-heightAt(m.x-.8,m.z))/1.6,sz=(heightAt(m.x,m.z+.8)-heightAt(m.x,m.z-.8))/1.6;
    normal.set(-sx,1,-sz).normalize();c.group.quaternion.setFromUnitVectors(up,normal);c.group.rotateY(m.heading);c.group.position.set(m.x,heightAt(m.x,m.z)+.005,m.z);cow.update(t,m);
    if(frame%3!==0)continue;
    const clear=probes.map(indices=>{let min=Infinity;for(const i of indices){cow.mesh.getVertexPosition(i,point).applyMatrix4(cow.mesh.matrixWorld);min=Math.min(min,point.y-checkedHeight(point.x,point.z));}return min;});
    const planted=cow.gait.feet.map(f=>!f.swing),metric=phaseMetrics[m.phase]??={min:Infinity,maxPlanted:-Infinity};
    for(let i=0;i<4;i++){
      minClearance=Math.min(minClearance,clear[i]);metric.min=Math.min(metric.min,clear[i]);
      if(planted[i]){maxStanceGap=Math.max(maxStanceGap,clear[i]);metric.maxPlanted=Math.max(metric.maxPlanted,clear[i]);}
      cow.legBones[i].hoof.getWorldPosition(point);if(previous[i]?.planted&&planted[i])maxDrift=Math.max(maxDrift,point.distanceTo(previous[i].point));previous[i]={planted:planted[i],point:point.clone()};
    }
    if(frame===0)standing.push(...clear);
  }
  report.push({anchor:c.anchor,height:c.height,samples:probes.map(a=>a.length),initialSoleClearance:standing,minClearance,maxStanceGap,maxDrift,phaseMetrics});
}
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--baseline'))await writeFile(new URL('../../assets/qa-20261116-cow-grounding/before-metrics.json',import.meta.url),JSON.stringify(report,null,2));
else for(const c of report){assert(c.minClearance>-.006,'A hoof penetrates the actual valley surface');assert(c.maxStanceGap<.008,'A planted hoof floats above the actual valley surface');assert(c.maxDrift<.005,'A planted hoof moves in world space');}
