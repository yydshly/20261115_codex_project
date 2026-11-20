import assert from 'node:assert/strict';
import {register} from 'node:module';
import {BenchmarkWalk,benchmarkLength,benchmarkPoint,benchmarkStops} from '../web/benchmark-trail.js';
import {walkingSurface,terrainHeight,plots} from '../web/large-world.js';
import {moveInWorld} from '../web/cave-navigation.js';
import {foundationScale,foundationSeams} from '../web/geographic-foundation.js';
import {surveyFoundationPassage} from '../web/foundation-passage.js';
import {waterAt} from '../web/water-system.js';

register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('three');
const {buildGlacial}=await import('../web/glacial-scene.js');
const {boulders}=buildGlacial(new THREE.Scene(),{textures:false});

const step=(from,x,z)=>{
  if(boulders.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+.32))return null;
  if(plots.some(p=>Math.abs(x-p.x)<p.halfX+.3&&Math.abs(z-p.z)<p.halfZ+.3))return null;
  return moveInWorld(from,x,z);
};
const placement=point=>({...point,y:walkingSurface(point.x,point.z),underground:false});
let strides=0,deckSteps=0,maxGrade=0,maxAboveGround=0;
const walk=new BenchmarkWalk();
let current=placement(benchmarkPoint(0));
walk.playing=true;
while(walk.playing)walk.advance(2.4,target=>{
  const moved=step(current,target.x,target.z);
  assert.ok(moved&&!moved.underground&&!moved.indoor&&!moved.survey,`blocked at ${target.at.toFixed(2)} m`);
  const width=Math.hypot(moved.x-current.x,moved.z-current.z);
  const rise=Math.abs(moved.y-current.y);
  maxGrade=Math.max(maxGrade,rise/Math.max(.001,width));
  const water=waterAt(moved.x,moved.z);
  if(water){
    assert.ok(moved.y>=water.level+.35,'physical support keeps feet above water');
    deckSteps++;
  }
  maxAboveGround=Math.max(maxAboveGround,moved.y-terrainHeight(moved.x,moved.z));
  current=moved;strides++;
  return true;
});
assert.ok(walk.done&&walk.obstacle===null);
assert.ok(strides>10000);
assert.ok(benchmarkLength>2400&&benchmarkLength<2600);
assert.equal(benchmarkStops.length,10);
assert.ok(Math.hypot(current.x-benchmarkPoint(benchmarkLength).x,current.z-benchmarkPoint(benchmarkLength).z)<.0001);

// Check continuous walking at the smaller stride expected on a high-refresh display.
for(const [start,end] of [[0,benchmarkLength],[benchmarkLength,0]]){
  const n=Math.ceil(Math.abs(end-start)/.09);
  let p=placement(benchmarkPoint(start));
  for(let i=1;i<=n;i++){
    const q=benchmarkPoint(start+(end-start)*i/n),next=step(p,q.x,q.z);
    assert.ok(next&&!next.underground&&!next.indoor&&!next.survey,`direction check at ${q.at.toFixed(2)} m`);
    p=next;
  }
}

assert.deepEqual([foundationScale.width,foundationScale.depth,foundationScale.length],[3840,3120,1000]);
const seams=foundationSeams.map(seam=>{
  const {runs,walked,total,longest}=surveyFoundationPassage(seam.section,step);
  assert.ok(walked>0&&walked<total&&longest);
  assert.equal(runs[0].points[0].at,0);
  assert.equal(runs.at(-1).points.at(-1).at,total);
  assert.ok(runs.every((run,i)=>i===0||run.points[0]===runs[i-1].points.at(-1)));
  // Sample the terrain itself, including stretches where steep slopes or water prevent walking.
  let maxRiseOverQuarterMetre=0;
  for(let i=1;i<seam.section.length;i++){
    const a=seam.section[i-1],b=seam.section[i];
    const count=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.25);
    let previous=terrainHeight(a.x,a.z);
    for(let j=1;j<=count;j++){
      const t=j/count,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      const height=terrainHeight(x,z);
      const rise=Math.abs(height-previous);
      assert.ok(Number.isFinite(height)&&rise<1,`${seam.id} height step ${rise.toFixed(3)} m at ${x.toFixed(2)}, ${z.toFixed(2)}`);
      maxRiseOverQuarterMetre=Math.max(maxRiseOverQuarterMetre,rise);
      previous=height;
    }
  }
  return {id:seam.id,metres:Math.round(total),walking:Math.round(walked),
    aerial:Math.round(total-walked),longestWalk:Math.round(longest.length),
    maxRiseOverQuarterMetre:+maxRiseOverQuarterMetre.toFixed(2)};
});
console.log(JSON.stringify({trailMetres:Math.round(benchmarkLength),strides,deckSteps,maxGrade:+maxGrade.toFixed(2),
  maxAboveGround:+maxAboveGround.toFixed(2),bothWalkingDirections:true,seams},null,2));
