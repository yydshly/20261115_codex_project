import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);
const {progressItems,progressStatuses,progressCounts,progressRoadmap,worldSummary,filterProgress,validScene,sceneHref}=await import('../web/world-progress-data.js');
const {mountOverview,progressCard,roadmapHTML,renderWorldAudit}=await import('../web/world-progress.js');
const {resumeExpedition,setRidgeBayQuery}=await import('../web/expedition-url.js');
const {mountFoundationMap}=await import('../web/geographic-foundation-ui.js');
const {auditCounts,auditRegions,auditSeams,coverageAudit,formationAudit}=await import('../web/world-audit-data.js');
const {environmentGaps,gapFor,gapKinds,gapMapHref}=await import('../web/environment-gaps.js');
const {ancient,modern}=await import('../web/environment-catalog.js');
const {planBounds}=await import('../web/world-logic-data.js');
const {geographyLegs}=await import('../web/regional-geography.js');
const {constructionStops,constructionObservation}=await import('../web/construction-learning.js');
const {watershedStops,watershedObservation}=await import('../web/glacial-learning.js');
for(const [scene,view,href] of [
 ['ice-1','walk=snow-to-deep&station=wetland&epoch=glacial','expedition.html?walk=snow-to-deep&epoch=glacial&station=wetland#ice-1'],
 ['ice-1','plan=ridge-bay&station=wetland&month=1&compare=0','expedition.html?plan=ridge-bay&station=wetland&month=1&compare=0#ice-1'],
 ['ice-1','walk=snow-to-bay&epoch=interglacial&at=2306','expedition.html?walk=snow-to-bay&epoch=interglacial&at=2306#ice-1'],
 ['build-36','walk=valley-life&stop=5','expedition.html?walk=valley-life&stop=5#build-36'],
 ['build-1','plan=deep-time&case=triassic&station=bar&phase=peak','expedition.html?plan=deep-time&case=triassic&phase=peak&station=bar#build-1'],
 ['build-1','plan=1&zone=east','expedition.html?plan=1&zone=east#build-1'],
 ['build-1','plan=__proto__&redirect=https://other.invalid','expedition.html#build-1'],
 ['build-1','plan=deep-time&station=%2F%2Fother.invalid&case=triassic','expedition.html?plan=deep-time&case=triassic#build-1'],
 ['build-36','walk=valley-life&stop=10','expedition.html?walk=valley-life&stop=0#build-36'],
 ['ice-1','walk=snow-to-deep&station=unknown&epoch=unknown','expedition.html?walk=snow-to-deep#ice-1']
]){
 const resume=resumeExpedition(scene,view),returned=new URLSearchParams(resume.context);
 assert.equal(resume.href,href);
 assert.equal(resumeExpedition(returned.get('from'),returned.get('view')).href,href);
}
assert.equal(resumeExpedition('https://other.invalid','walk=snow-to-deep'),null);
const profileUrl=new URL('https://example.invalid/expedition.html?walk=valley-life&stop=2#ice-1');
setRidgeBayQuery(profileUrl,{station:'wetland',month:7,compare:false});
assert.equal(profileUrl.search,'?plan=ridge-bay&station=wetland&month=7&compare=0');
setRidgeBayQuery(profileUrl,null);
assert.equal(profileUrl.search,'');
const sessionValues=new Map();
function overviewAt(search){
 const elements=new Map();
 const document={
  getElementById(id){
   if(!elements.has(id))elements.set(id,{hidden:true,addEventListener(){}});
   return elements.get(id);
  },
  querySelectorAll(){return [];},
  defaultView:{sessionStorage:{getItem:key=>sessionValues.get(key),setItem:(key,value)=>sessionValues.set(key,value)}}
 };
 mountOverview(document,{search});
 return elements;
}
for(const [scene,view] of [['ice-1','walk=snow-to-deep&station=wetland&epoch=glacial'],['build-36','walk=valley-life&stop=5']]){
 const {context,href}=resumeExpedition(scene,view);
 for(const search of ['?'+context,'']){
  const elements=overviewAt(search);
  assert.equal(elements.get('continue-scene').href,href);
  assert.equal(elements.get('continue-scene').hidden,false);
  assert.equal(elements.get('return-context').hidden,false);
 }
}
assert.equal(progressItems.length,41);assert.equal(new Set(progressItems.map(r=>r.id)).size,41);assert.deepEqual(progressCounts(),{done:4,sample:33,planned:4});
assert.equal(worldSummary.stations,constructionStops.length);assert.equal(worldSummary.observations,new Set(constructionStops.flatMap(r=>[0,1,2,3].map(s=>constructionObservation(r.index,s).id))).size);assert.equal(worldSummary.waterStations,watershedStops.length);assert.equal(worldSummary.waterObservations,new Set(watershedStops.flatMap(r=>[0,1,2].map(s=>watershedObservation(r.index,s).id))).size);
for(const r of progressItems){assert.ok(progressStatuses[r.status]);assert.ok(r.have&&r.missing);const card=progressCard(r);assert.ok(card.includes(`id="item-${r.id}"`));if(r.status==='planned'){assert.ok(!r.scene);assert.ok(progressRoadmap.some(p=>p.step===r.phase));assert.ok(!card.includes('去大地图查看'));}else{assert.ok(validScene(r.scene));assert.ok(sceneHref(r).startsWith('expedition.html'));assert.ok(r.evidence);}}
assert.equal(sceneHref(progressItems.find(r=>r.id==='worldlogic')),'expedition.html?plan=1#build-1');assert.equal(filterProgress({status:'planned'}).length,4);assert.equal(filterProgress({status:'done',group:'content'}).length,0);assert.ok(filterProgress({query:'门洞'}).some(r=>r.id==='access'));assert.ok(filterProgress({query:'  雨林  '}).some(r=>r.id==='tropical'));assert.equal(filterProgress({query:'unmatched-xyz-内容'}).length,0);assert.equal(validScene('build-116'),'build-116');assert.equal(validScene('build-117'),null);assert.equal(validScene('boreal-4'),'boreal-4');assert.equal(validScene('boreal-5'),null);for(const type of ['bamboo','monsoon','dunes']){assert.equal(validScene(type+'-2'),type+'-2');assert.equal(validScene(type+'-3'),null);}assert.equal(validScene('warm-6'),'warm-6');assert.equal(validScene('warm-7'),null);assert.equal(validScene('build-52'),'build-52');assert.equal(validScene('life-7'),'life-7');assert.equal(validScene('life-8'),null);assert.equal(validScene('transit-6'),'transit-6');assert.equal(validScene('transit-7'),null);assert.equal(validScene('water-15'),null);assert.equal(validScene('build-0'),null);assert.equal(validScene('https://example.com'),null);assert.equal(validScene('javascript:alert(1)'),null);assert.equal(validScene('town-4&x=<script>'),null);
assert.deepEqual(progressRoadmap.map(r=>r.step),[1,2,3,4,5,6,7]);const progressDoc=readFileSync(new URL('../PROGRESS.md',import.meta.url),'utf8');assert.equal((progressDoc.match(/^### \d+\./gm)||[]).length,7);for(const p of progressRoadmap)assert.ok(progressDoc.includes(p.title));for(const r of progressRoadmap)assert.ok(r.depends&&r.acceptance&&r.status!=='已完成');assert.ok(roadmapHTML().includes('极地海岸 → 海冰与冰山 → 冰盖'));
const read=name=>readFileSync(new URL('../web/'+name,import.meta.url),'utf8'),html=read('journey.html');assert.equal(read('index.html'),html);assert.ok(!html.includes('src="journey.js"'));assert.ok(html.includes('src="world-progress.js"'));assert.ok(html.includes('legacy-journey.html'));assert.ok(read('legacy-journey.html').includes('早期十境样本（存档）'));assert.ok(read('legacy-journey.html').includes('src="journey.js"'));assert.ok(read('journey.js').includes("worldform:0012:observations:v1"));
const map=read('expedition.html'),controller=read('expedition.js');assert.ok(map.includes('id="world-progress"'));assert.ok(map.includes('data-world-overview'));assert.ok(controller.includes('progressPanel=mountMapProgress'));assert.ok(controller.includes('progressPanel?.refresh()'));assert.ok(controller.includes('!progressPanel?.dialog.open'));assert.ok(controller.includes("worldform:0012:construction-notes:v1"));assert.ok(!read('world-progress.js').includes('localStorage'),'Project status must not overwrite personal observation records');
for(const name of ['settlement-street.jpg','settlement-cutaway.jpg'])assert.ok(existsSync(new URL('../assets/'+name,import.meta.url)));
assert.equal(auditCounts.linked+auditCounts.unlinked,auditCounts.modern);
assert.deepEqual(new Set(coverageAudit.map(r=>r.status)),new Set(Object.keys(progressStatuses)));
const audit=renderWorldAudit();
for(const key of Object.keys(audit))assert.ok(html.includes(`id="audit-${key}"`));
assert.equal(auditRegions.length,9);
for(const {id} of auditRegions)assert.ok(audit.regions.includes(`zone=${id}#build-1`));
assert.equal(auditSeams.length,4);
for(const {id,seen,issue} of auditSeams){
 assert.ok(geographyLegs.some(leg=>leg.id===id)&&seen&&issue);
 assert.ok(existsSync(new URL(`../assets/world-audit-${id}.jpg`,import.meta.url)));
 assert.ok(audit.seams.includes(`expedition.html?plan=foundation&amp;seam=${id}#build-1`));
}
assert.ok(formationAudit.every(row=>row.baseline&&row.gap));
assert.ok(html.includes('id="geographic-foundation"')&&html.includes('src="geographic-foundation-ui.js"'));
assert.equal(typeof mountFoundationMap,'function');
assert.ok(controller.includes("geographyLeg:planName==='geography'?studyFocus:null"));
assert.ok(controller.includes("mapZone:planQuery.get('zone')"));
assert.equal(new Set(environmentGaps.map(gap=>gap.id)).size,environmentGaps.length);
assert.equal(gapFor('invalid'),null);
const without3D=items=>items.filter(item=>!item.href);
assert.equal(auditCounts.ancientLinked,ancient.length-without3D(ancient).length);
assert.deepEqual(environmentGaps.flatMap(gap=>gap.modern??[]).sort(),without3D(modern).map(item=>item.title).sort());
for(const item of [...without3D(modern),...without3D(ancient)])assert.ok(audit.missing.includes(item.title));
for(const [index,gap] of environmentGaps.entries()){
 assert.equal(gap.rank,index+1);
 assert.ok(gapKinds[gap.kind]&&gap.have&&gap.gap&&gap.why&&gap.check&&gap.sample.mode);
 assert.ok(audit.priorities.includes(`id="gap-${gap.id}"`));
 assert.ok(audit.priorities.includes(gapMapHref(gap.id).replaceAll('&','&amp;')));
 assert.ok(audit['gap-nav'].includes(`href="#gap-${gap.id}"`));
 for(const [x,z] of [gap.anchor,...gap.paths.flat()]){
  assert.ok(x>=planBounds.minX&&x<=planBounds.maxX&&z>=planBounds.minZ&&z<=planBounds.maxZ);
 }
}
assert.ok(read('world-plan-ui.js').includes('const comparisons={gaps,'));
assert.ok(controller.includes("gapAudit:planName==='gaps'?{focus:studyFocus}:null"));
const result={result:'passed',date:'2026-11-17',catalogItems:41,statusCounts:progressCounts(),roadmapSteps:7,constructionStations:worldSummary.stations,constructionObservations:worldSummary.observations,waterStations:worldSummary.waterStations,waterObservations:worldSummary.waterObservations,canonicalOverview:['index.html','journey.html'],mapEntry:'expedition.html',archiveEntry:'legacy-journey.html',singleCatalogSource:true,invalidReturnLinksRejected:true,observationKeysPreserved:true,browserCheck:'progress-browser-check.json',limits:'Checks catalog scope, route counts, filtering, safe return links, archive and source wiring; not an assertion of full game completion'};writeFileSync(new URL('../assets/progress-check.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
