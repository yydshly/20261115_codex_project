import {mountWatershedBalance} from './watershed-balance-ui.js';
import {mountSediment} from './sediment-ui.js';
import {mountSoil} from './soil-ui.js';
import {mountEnvironmentLines} from './environment-lines-ui.js';
import {mountTectonics} from './tectonic-ui.js';
import {mountColdEnvironment} from './cold-environment-ui.js';
import {mountAtmosphereStudy} from './atmosphere-ui.js';
import {mountScrubRecovery} from './scrub-recovery-ui.js';
import {mountWarmBelt} from './warm-belt-ui.js';
import {mountCoastSea} from './coast-sea-ui.js';
import {mountIceLegacy} from './ice-legacy-ui.js';
import {mountDeepTime} from './deep-time-ui.js';
import {mountFluidVents} from './fluid-vents-ui.js';
import {mountGroundwater} from './groundwater-ui.js';
import {mountWaterExchange} from './water-exchange-ui.js';
import {mountWetland} from './wetland-ui.js';
import {mountEstuary} from './estuary-ui.js';
import {mountFormationStudy} from './formation-ui.js';
import {buildRidgeBayFormation,ridgeBayWetlandPhase} from './ridge-bay-formation.js';
import {createRidgeBayFormationScene} from './ridge-bay-formation-scene.js';
import {mountRidgeBayFormation} from './ridge-bay-formation-ui.js';
import {mountIceAge} from './ice-age-ui.js';
import {mountBasinStorm} from './basin-storm-ui.js';
import {mountEnvironmentGapSurvey} from './environment-gap-ui.js';
import {wetlandPhases} from './wetland-layout.js';
import {exchangeLayers} from './water-exchange.js';
import {tectonicLayers} from './tectonic-layout.js';
import {mountAnnualClimate} from './annual-climate-ui.js';
import {geographyLegs} from './regional-geography.js';
import * as THREE from 'three';import {spatialZones,planCategories,formationProfiles,formationSources,filterInventory,causalChapters} from './world-logic-data.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountWorldPlan({document,scene,sky,rows,model,onOpen,onClose,onGo,onHide,getCurrent,annualScene,balanceScene,sedimentScene,soilScene,environmentScene,tectonicScene,groundwaterScene,exchangeScene,wetlandScene,estuaryScene,stormScene,formationScene,timelineScene,modernRoots,coastResources,scrubResources,reduced,onBenchmark,onSeamWalk,onRidgeBayState,onRidgeBayWalk}){const panel=document.createElement('aside');panel.id='world-plan-panel';panel.hidden=true;panel.setAttribute('aria-label','同一世界的分区与形成逻辑');panel.innerHTML=`<header><div><small>同一个3D世界 · 总图入口</small><h2 id="plan-panel-title">分区与形成逻辑</h2></div><div class="plan-header-actions"><button type="button" id="plan-other-topics" hidden>其他专题</button><button type="button" id="plan-collapse" aria-controls="plan-content" aria-expanded="true">收起讲解</button><button type="button" id="plan-close" aria-label="关闭分区总图">×</button></div></header><div id="plan-content"><p class="plan-scope">${rows.filter(r=>!r.foundation).length}个构建观察点 + ${rows.filter(r=>r.foundation).length}个基础地形入口。它们都来自当前地图；水系和植被专线是同场景的其他看法。</p><div class="plan-tabs"><button id="plan-tab-ridge-bay" aria-pressed="false">雪岭到海湾剖面</button><button id="plan-tab-gaps" aria-pressed="false">环境缺口</button><button id="plan-tab-deep-time" aria-pressed="false">史前海陆与森林</button><button id="plan-tab-legacy" aria-pressed="false">冰期地貌遗存</button><button id="plan-tab-timeline" aria-pressed="false">史前气候</button><button id="plan-tab-storm" aria-pressed="false">降雨与潮汐</button><button id="plan-tab-estuary" aria-pressed="false">河口潮汐</button><button id="plan-tab-wetland" aria-pressed="false">洪泛与湿地</button><button id="plan-tab-exchange" aria-pressed="false">水路汇合</button><button id="plan-tab-groundwater" aria-pressed="false">岩性与地下水</button><button id="plan-tab-fluid-vents" aria-pressed="false">热液、冷泉与地热</button><button id="plan-tab-coast-sea" aria-pressed="false">河口到深海</button><button id="plan-tab-rain-shadow" aria-pressed="false">迎风与背风</button><button id="plan-tab-scrub-recovery" aria-pressed="false">灌丛与火后恢复</button><button id="plan-tab-atmosphere" aria-pressed="false">天空与风场</button><button id="plan-tab-cold" aria-pressed="false">冷岸与高山</button><button id="plan-tab-tectonics" aria-pressed="false">地质与河谷</button><button id="plan-tab-lines" aria-pressed="false">地理底图</button><button id="plan-tab-formation" aria-pressed="false">环境形成对照</button><button id="plan-tab-soil" aria-pressed="false">土壤与植被</button><button id="plan-tab-sediment" aria-pressed="false">流水与泥沙</button><button id="plan-tab-balance" aria-pressed="false">流域收支</button><button id="plan-tab-annual" aria-pressed="false">全年风雨</button><button id="plan-tab-geography" aria-pressed="false">区域过渡</button><button id="plan-tab-map" aria-pressed="true">分区找场景</button><button id="plan-tab-logic" aria-pressed="false">读懂形成逻辑</button></div><section id="plan-ridge-bay" aria-label="雪岭到中央海湾的地形形成剖面" hidden></section><section id="plan-gaps" aria-label="环境缺口与补全顺序" hidden></section><section id="plan-deep-time" aria-label="更早史前的古海陆与高纬森林" hidden></section><section id="plan-legacy" aria-label="晚更新世到现代的地貌遗存" hidden></section><section id="plan-timeline" aria-label="同一张地图上的史前气候时间线" hidden></section><section id="plan-storm" aria-label="中央海湾流域降雨联动" hidden></section><section id="plan-estuary" aria-label="河口潮汐咸淡水混合及植被" hidden></section><section id="plan-wetland" aria-label="河流洪泛退水与植被分带" hidden></section><section id="plan-exchange" aria-label="地下水与地表水的汇合" hidden></section><section id="plan-groundwater" aria-label="岩性、入渗与地下水" hidden></section><section id="plan-fluid-vents" aria-label="海陆流体出露与沉积" hidden></section><section id="plan-coast-sea" aria-label="从浑浊河口到东南海沟" hidden></section><section id="plan-rain-shadow" aria-label="西南迎风湿林到背风干谷" hidden></section><section id="plan-scrub-recovery" aria-label="南部硬叶灌丛与火后恢复" hidden></section><section id="plan-atmosphere" aria-label="天空与风场对照" hidden></section><section id="plan-cold" aria-label="北部冷岸、高山与冻融" hidden></section><section id="plan-tectonics" aria-label="从海沟到高山的地质主线" hidden></section><section id="plan-formation" aria-label="三个流域的环境形成对照" hidden></section><section id="plan-lines" aria-label="三条环境观察线" hidden></section><section id="plan-soil" aria-label="土壤形成与植被过渡" hidden></section><section id="plan-sediment" aria-label="流水侵蚀与泥沙主线" hidden></section><section id="plan-balance" aria-label="流域与水量收支主线" hidden></section><section id="plan-annual" aria-label="全年风雨主线" hidden></section><section id="plan-geography" hidden>
 <p class="plan-note">沿六段地形观察高差怎样分水、改变水热条件，再改变地表和植被。</p>
 <div class="plan-geography-tools">
  <button id="plan-geography-all" type="button" aria-pressed="true">回到整张地形图</button>
  <button id="plan-geography-lines" type="button" aria-pressed="true">地图标记</button>
  <button id="plan-geography-annual" type="button">对比四季风雨</button>
 </div>
 <p class="plan-note"><a class="plan-catalog-link" href="environment.html#factors">去环境图谱看日照和地图形成 ↗</a></p>
 <p id="plan-geography-explanation" class="plan-present" aria-live="polite"></p>
 <ol id="plan-geography-stops">${geographyLegs.map(leg=>`<li><button type="button" data-geography-leg="${leg.id}" aria-pressed="false">${esc(leg.title)}</button></li>`).join('')}</ol>
 <p class="plan-note">气候用相对冷暖和湿润程度表示，极地与雨林的距离经过压缩。</p>
 </section><section id="plan-spatial"><p class="plan-note">九个方位分区用于定位，不是气候带或分水岭。点击地图文字或下方分区，看该处实际有哪些场景。</p><div id="plan-zone-buttons"></div><label>查找当前元素<input id="plan-query" type="search" placeholder="例如：冰川、竹林、索道"></label><label>元素类型<select id="plan-category"><option value="all">全部类型</option>${Object.entries(planCategories).map(([key,name])=>`<option value="${key}">${name}</option>`).join('')}</select></label><p id="plan-result" role="status"></p><div id="plan-scene-list"></div></section><section id="plan-causal" hidden><p class="plan-note">先交代岩性、气候和水源，再讨论塑造过程。原四层开关是制作层，不是自然形成的时间顺序；这里没有运行地质演化模拟。</p><ol id="plan-chapters">${causalChapters.map((r,i)=>`<li><button data-plan-chapter="${i}" aria-pressed="false">${esc(r.title)}</button></li>`).join('')}</ol><p id="plan-chapter-why"></p><label>或查看一种形成过程<select id="plan-profile">${Object.entries(formationProfiles).map(([key,p])=>`<option value="${key}">${esc(p.title)}</option>`).join('')}</select></label></section><section id="plan-detail" aria-live="polite"></section></div>`;document.body.append(panel);
 const labels=document.createElement('div');labels.id='plan-map-labels';labels.hidden=true;labels.setAttribute('aria-label','当前地图九个方位分区');labels.innerHTML=spatialZones.map(z=>`<button data-plan-zone="${z.id}" style="--zone:${z.color}"><strong>${z.name.split(' · ')[0]}</strong><span>${z.name.split(' · ')[1]}</span><small>${rows.filter(r=>r.zone===z.id&&!r.foundation).length}处构建观察</small></button>`).join('');document.body.append(labels);
 const note=document.createElement('div');note.id='plan-map-note';note.hidden=true;note.innerHTML='<b>当前场景位置总图 · N ↑</b><span>彩线：方位分区　光点：实际入口　圆环：选择点<br>蓝线：中央主河与北部双支流<br>绿线：高原—雨林—海口</span><small>多气候类型被压缩到小地图中；统一气候带、岩性底图、分水岭与水量收支仍需校核。</small>';document.body.append(note);
 const $=id=>document.getElementById(id);let active=false,mode='map',geographyFocus=null,geographyLines=true,selected=rows[0],profileOverride=null,filters={zone:'all',category:'all',query:''};const vector=new THREE.Vector3();
 const balance=mountWatershedBalance($('plan-balance'),balanceScene,reduced,context=>setMode('sediment',context));
 const annual=mountAnnualClimate($('plan-annual'),annualScene,reduced,context=>setMode('balance',context));
 const sediment=mountSediment($('plan-sediment'),sedimentScene,reduced,context=>setMode('balance',context),
  context=>setMode('soil',context));
 const soil=mountSoil($('plan-soil'),soilScene,context=>setMode('sediment',context));
 const geologyLayers=new Set(tectonicLayers.map(layer=>layer.id));
 const flowLayers=new Set(exchangeLayers.map(layer=>layer.id));
 const environment=mountEnvironmentLines($('plan-lines'),environmentScene,{reduced,onTopic:setMode,stormStatus:()=>storm.status,onBenchmark,onSeamWalk,
  onGeology:visible=>visible?tectonicScene.show({layers:geologyLayers,guide:false}):tectonicScene.hide(),
  onLithology:groundwaterScene.setMap,
  onExchange:month=>month===null?exchangeScene.hide():exchangeScene.show({
   season:month===1?'dry':'wet',layers:flowLayers,overlay:true
  }).labels,
  updateExchange:exchangeScene.update,
  onWetland:month=>month===null?wetlandScene.hide():wetlandScene.show({
   phase:month===1?wetlandPhases.at(-1):wetlandPhases[0],layer:'bands',overlay:true
  }).labels,
  onEstuary:month=>month===null?estuaryScene.hide():estuaryScene.show({
   season:month===1?'dry':'wet',tide:'high',overlay:true
  }).labels
 });
 const coastSea=mountCoastSea($('plan-coast-sea'),scene,coastResources,context=>setMode(context?.mode??'lines',context),
  context=>setMode('fluid-vents',context),context=>setMode('deep-time',context));
 const fluidVents=mountFluidVents($('plan-fluid-vents'),scene,coastResources,{reduced,onBack:context=>setMode(context.mode,context)});
 const warmBelt=mountWarmBelt($('plan-rain-shadow'),scene,()=>balanceScene.model,
  context=>setMode(context?.mode??'lines',context),context=>setMode('scrub-recovery',context));
 const scrub=mountScrubRecovery($('plan-scrub-recovery'),scene,scrubResources,context=>setMode('rain-shadow',context));
 const atmosphere=mountAtmosphereStudy($('plan-atmosphere'),scene,sky,reduced);
 const cold=mountColdEnvironment($('plan-cold'),scene,context=>setMode(context?.mode??'lines',context));
 const tectonics=mountTectonics($('plan-tectonics'),tectonicScene,context=>setMode(context?.mode??'lines',context),
  context=>setMode('groundwater',context),context=>setMode('fluid-vents',context));
 const groundwater=mountGroundwater($('plan-groundwater'),groundwaterScene,context=>setMode(context?.mode??'lines',context),
  context=>setMode('exchange',context));
 const exchange=mountWaterExchange($('plan-exchange'),exchangeScene,context=>setMode(context?.mode??'lines',context),
  context=>setMode('wetland',context));
 const wetland=mountWetland($('plan-wetland'),wetlandScene,context=>setMode(context?.mode??'lines',context),
  context=>setMode('estuary',context));
 const estuary=mountEstuary($('plan-estuary'),estuaryScene,context=>setMode(context?.mode??'lines',context));
 const storm=mountBasinStorm($('plan-storm'),stormScene,context=>setMode('lines',context));
 const formation=mountFormationStudy($('plan-formation'),formationScene,context=>setMode(context?.mode??'lines',context));
 const timeline=mountIceAge($('plan-timeline'),timelineScene,context=>setMode('lines',context),context=>setMode('legacy',context));
 const legacy=mountIceLegacy($('plan-legacy'),scene,timelineScene,()=>wetlandScene.model,context=>setMode(context?.mode??'lines',context));
 const deepTime=mountDeepTime($('plan-deep-time'),scene,modernRoots,context=>setMode(context?.mode??'lines',context),{reduced});
 const gaps=mountEnvironmentGapSurvey($('plan-gaps'),scene,setMode);
 const ridgeBayScene=createRidgeBayFormationScene(scene);
 let ridgeBayModel,ridgeBayWetland=false;
 function hideRidgeBayWetland(){
  if(ridgeBayWetland){wetlandScene.hide();ridgeBayWetland=false;}
 }
 const ridgeBayUI=mountRidgeBayFormation($('plan-ridge-bay'),
  ()=>ridgeBayModel??=buildRidgeBayFormation(balanceScene.model,()=>wetlandScene.model),
  (study,reading,options)=>{
   if(reading.station.id==='wetland'){
    ridgeBayWetland=true;
    wetlandScene.show({phase:ridgeBayWetlandPhase(reading.month),layer:'water'});
   }else hideRidgeBayWetland();
   ridgeBayScene.show(study,reading,options);
   onRidgeBayState?.({station:reading.station.id,month:reading.month,compare:options.compare});
  },onRidgeBayWalk);
 const ridgeBay={
  show:context=>ridgeBayUI.show(context),
  hide(){
   ridgeBayUI.hide();
   ridgeBayScene.hide();
   hideRidgeBayWetland();
   onRidgeBayState?.(null);
  },
  get view(){return ridgeBayUI.view;}
 };
 const comparisons={gaps,'ridge-bay':ridgeBay,timeline,legacy,'deep-time':deepTime,'fluid-vents':fluidVents,formation,annual,balance,sediment,soil,lines:environment,cold,'rain-shadow':warmBelt,'scrub-recovery':scrub,atmosphere,'coast-sea':coastSea,tectonics,groundwater,exchange,wetland,estuary,storm};
 function updateMapChrome(){
  labels.hidden=!active||!!comparisons[mode]||mode==='geography';
  note.hidden=!active||!!comparisons[mode]||(mode==='geography'&&!geographyLines);
 }
 const content=$('plan-content'),collapseButton=$('plan-collapse');
 let expandedScroll=0;
 function setCollapsed(collapsed){
  if(collapsed)expandedScroll=panel.scrollTop;
  content.hidden=collapsed;
  panel.dataset.collapsed=String(collapsed);
  collapseButton.setAttribute('aria-expanded',String(!collapsed));
  collapseButton.textContent=collapsed?'展开讲解':'收起讲解';
  if(!collapsed)panel.scrollTop=expandedScroll;
 }
 collapseButton.addEventListener('click',()=>setCollapsed(!content.hidden));
 function applyVisible(value){
  const wasActive=active;
  active=!!value;
  if(!active)for(const comparison of Object.values(comparisons))comparison.hide();
  panel.hidden=!active;
  if(!active){
   expandedScroll=0;setCollapsed(false);
   if(wasActive)onHide?.();
  }
  updateMapChrome();
  model.setVisible(active);
  document.documentElement.dataset.worldPlan=active?'open':'closed';
  $('world-plan').setAttribute('aria-pressed',String(active));
 }
 function renderDetail(){if(!selected)return;const key=profileOverride||selected.profile,p=formationProfiles[key];$('plan-profile').value=key;$('plan-detail').innerHTML=`<small>${esc(spatialZones.find(z=>z.id===selected.zone).name)} · ${selected.foundation?'基础地形入口':'构建观察点'}</small><h3>${esc(selected.terrain)} · ${esc(selected.name)}</h3><div class="plan-factors">${p.factors.map(s=>`<span>${esc(s)}</span>`).join('')}</div><h4>${esc(p.title)}</h4><ol class="plan-chain">${p.chain.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p><b>形成前提</b>${esc(p.requirements)}</p><p class="plan-present"><b>当前实际</b>${esc(p.present)}</p><p class="plan-missing"><b>尚需构建</b>${esc(p.gap)}</p><button id="plan-go-scene">到这个场景实地看 ↗</button><div class="plan-sources">${p.sources.map(id=>`<a href="${formationSources[id].url}" target="_blank" rel="noopener">${esc(formationSources[id].title)} ↗</a>`).join('')}</div>`;$('plan-go-scene').addEventListener('click',()=>{applyVisible(false);onGo(selected);});model.select(selected);}
 function renderList(){const visible=filterInventory(rows,filters);$('plan-result').textContent=`本次显示 ${visible.length} / ${rows.length} 个入口`;$('plan-scene-list').innerHTML=visible.length?visible.map(r=>`<button data-plan-entry="${esc(r.key)}" aria-pressed="${r.key===selected?.key}"><span>${esc(r.terrain)}</span><small>${esc(r.name)}${r.foundation?' · 基础地形':''}</small></button>`).join(''):'<p>当前筛选没有匹配场景，可切换全部分区或清空搜索。</p>';$('plan-scene-list').querySelectorAll('[data-plan-entry]').forEach(b=>b.addEventListener('click',()=>{selected=rows.find(r=>r.key===b.dataset.planEntry);profileOverride=null;renderList();renderDetail();}));model.filter(visible);$('plan-zone-buttons').innerHTML=`<button data-zone-filter="all" aria-pressed="${filters.zone==='all'}">全图</button>`+spatialZones.map(z=>`<button data-zone-filter="${z.id}" aria-pressed="${filters.zone===z.id}">${z.name.split(' · ')[0]}</button>`).join('');$('plan-zone-buttons').querySelectorAll('[data-zone-filter]').forEach(b=>b.addEventListener('click',()=>setZone(b.dataset.zoneFilter)));labels.querySelectorAll('[data-plan-zone]').forEach(b=>b.setAttribute('aria-pressed',String(filters.zone===b.dataset.planZone)));}
 function setZone(id){filters.zone=id;const visible=filterInventory(rows,filters);if(visible.length&&!visible.some(r=>r.key===selected?.key)){selected=visible[0];profileOverride=null;}renderList();renderDetail();}
 function setGeographyFocus(id) {
  geographyFocus=geographyLegs.find(leg=>leg.id===id)??null;
  $('plan-geography-all').setAttribute('aria-pressed',String(!geographyFocus));
  $('plan-geography-stops').querySelectorAll('button').forEach(button=>{
   button.setAttribute('aria-pressed',String(button.dataset.geographyLeg===id));
  });
  $('plan-geography-explanation').textContent=geographyFocus?.text ??
   '山脊和坡脚把场景接成陆地。冰雪和北部支流汇向中央海湾，高原另经雨林出海，盐盆在低处蓄水。';
  model.setGeography(true,geographyFocus?.id,geographyLines);
  note.hidden=!geographyLines;
  $('plan-geography-lines').setAttribute('aria-pressed',String(geographyLines));
 }
 function setMode(value, context){
  const previous=mode;
  mode=value;
  panel.dataset.mode=mode;
  const isRidgeBay=mode==='ridge-bay';
  $('plan-panel-title').textContent=isRidgeBay?'雪岭到海湾形成剖面':'分区与形成逻辑';
  $('plan-other-topics').hidden=!isRidgeBay;
  if(previous!==mode)comparisons[previous]?.hide();
  const comparison=comparisons[mode];
  for(const id of Object.keys(comparisons)){
   $('plan-'+id).hidden=mode!==id;
   $('plan-tab-'+id).setAttribute('aria-pressed',String(mode===id));
  }
  const geography=mode==='geography';
  $('plan-geography').hidden=!geography;
  $('plan-tab-geography').setAttribute('aria-pressed',String(geography));
  $('plan-detail').hidden=geography||!!comparison;
  updateMapChrome();
  note.innerHTML=geography
   ? '<b>山脉与水系</b><span>金线：新塑造的山脊与坡脚<br>蓝线：冰雪与北部支流 → 中央海湾<br>绿线：高原溪流 → 雨林河口</span>'
   : '<b>当前场景位置总图 · N ↑</b><span>彩线：方位分区　光点：实际入口　圆环：选择点<br>蓝线：中央主河与北部双支流<br>绿线：高原—雨林—海口</span>';
  if(comparison){
   model.setGeography(true,null,false);
   comparison.show(context);
  } else if(geography)setGeographyFocus(context?.focus);
  else {geographyFocus=null;model.setGeography(false);model.select(selected);}
 $('plan-spatial').hidden=mode!=='map';$('plan-causal').hidden=mode!=='logic';$('plan-tab-map').setAttribute('aria-pressed',String(mode==='map'));$('plan-tab-logic').setAttribute('aria-pressed',String(mode==='logic'));model.filter(mode==='logic'?rows:filterInventory(rows,filters));}
 labels.querySelectorAll('[data-plan-zone]').forEach(b=>b.addEventListener('click',()=>{setMode('map');setZone(b.dataset.planZone);}));$('plan-tab-map').addEventListener('click',()=>setMode('map'));$('plan-tab-logic').addEventListener('click',()=>setMode('logic'));
 $('plan-tab-balance').addEventListener('click',()=>setMode('balance'));
 $('plan-tab-sediment').addEventListener('click',()=>setMode('sediment'));
 $('plan-tab-soil').addEventListener('click',()=>setMode('soil'));
 $('plan-tab-lines').addEventListener('click',()=>setMode('lines'));
 $('plan-tab-fluid-vents').addEventListener('click',()=>setMode('fluid-vents',{station:'vent'}));
 $('plan-tab-coast-sea').addEventListener('click',()=>setMode('coast-sea'));
 $('plan-tab-rain-shadow').addEventListener('click',()=>setMode('rain-shadow'));
 $('plan-tab-scrub-recovery').addEventListener('click',()=>setMode('scrub-recovery'));
 $('plan-tab-atmosphere').addEventListener('click',()=>setMode('atmosphere'));
 $('plan-tab-cold').addEventListener('click',()=>setMode('cold'));
 $('plan-tab-tectonics').addEventListener('click',()=>setMode('tectonics'));
 $('plan-tab-groundwater').addEventListener('click',()=>setMode('groundwater'));
 $('plan-tab-exchange').addEventListener('click',()=>setMode('exchange'));
 $('plan-tab-wetland').addEventListener('click',()=>setMode('wetland'));
 $('plan-tab-estuary').addEventListener('click',()=>setMode('estuary'));
 $('plan-other-topics').addEventListener('click',()=>setMode('map'));
 $('plan-tab-ridge-bay').addEventListener('click',()=>setMode('ridge-bay'));
 $('plan-tab-gaps').addEventListener('click',()=>setMode('gaps'));
 $('plan-tab-deep-time').addEventListener('click',()=>setMode('deep-time'));
 $('plan-tab-legacy').addEventListener('click',()=>setMode('legacy'));
 $('plan-tab-timeline').addEventListener('click',()=>setMode('timeline'));
 $('plan-tab-formation').addEventListener('click',()=>setMode('formation'));
 $('plan-tab-storm').addEventListener('click',()=>setMode('storm'));
 $('plan-tab-annual').addEventListener('click',()=>setMode('annual',geographyFocus?.id));
 $('plan-geography-annual').addEventListener('click',()=>setMode('annual',geographyFocus?.id));
 $('plan-tab-geography').addEventListener('click',()=>setMode('geography'));
 $('plan-geography-lines').addEventListener('click',()=>{
  geographyLines=!geographyLines;
  setGeographyFocus(geographyFocus?.id);
 });
 $('plan-geography-all').addEventListener('click',()=>setGeographyFocus(null));
 $('plan-geography-stops').querySelectorAll('button').forEach(button=>{
  button.addEventListener('click',()=>{
   setGeographyFocus(button.dataset.geographyLeg);
   $('plan-geography-explanation').scrollIntoView({block:'nearest'});
  });
 });
 $('plan-query').addEventListener('input',()=>{filters.query=$('plan-query').value;renderList();});$('plan-category').addEventListener('change',()=>{filters.category=$('plan-category').value;renderList();});$('plan-profile').addEventListener('change',()=>{profileOverride=$('plan-profile').value;selected=rows.find(r=>!r.foundation&&r.profile===profileOverride)||rows.find(r=>r.id===causalChapters.find(c=>c.profile===profileOverride)?.scene)||selected;$('plan-chapter-why').textContent='独立选择形成类型，定位对应的现有样本。';$('plan-chapters').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));renderDetail();});
 $('plan-chapters').querySelectorAll('[data-plan-chapter]').forEach(b=>b.addEventListener('click',()=>{const chapter=causalChapters[Number(b.dataset.planChapter)];selected=rows.find(r=>r.id===chapter.scene&&!r.foundation)||selected;profileOverride=chapter.profile;$('plan-chapter-why').textContent=chapter.why;$('plan-chapters').querySelectorAll('button').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));renderDetail();}));
 function close(){applyVisible(false);onClose();$('world-plan').focus({preventScroll:true});}$('plan-close').addEventListener('click',close);panel.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 const controller={open({gapAudit=null,ridgeBayStudy=null,logic=false,geography=false,geographyLeg=null,mapZone=null,annualMode=false,balanceMode=false,sedimentMode=false,sedimentFocus=null,soilMode=false,soilFocus=null,balanceFocus=null,environmentMode=false,environmentFocus=null,environmentMonth=null,environmentSeam=null,tectonicsMode=false,tectonicsFocus=null,groundwaterMode=false,groundwaterFocus=null,exchangeMode=false,exchangeFocus=null,wetlandMode=false,wetlandFocus=null,estuaryMode=false,estuaryFocus=null,stormMode=false,stormFocus=null,stormStudy=null,formationMode=false,formationFocus=null,formationMonth=null,formationStudy=null,coldClimate=null,warmBeltStudy=null,scrubStudy=null,atmosphereStudy=null,coastStudy=null,timeline=null,legacyStudy=null,deepTimeStudy=null,fluidVentStudy=null}={}){onOpen();const key=getCurrent?.();selected=rows.find(r=>r.key===key)||selected;if(!filterInventory(rows,filters).some(r=>r.key===selected?.key)){filters={zone:'all',category:'all',query:''};$('plan-query').value='';$('plan-category').value='all';}profileOverride=null;applyVisible(true);renderList();renderDetail();setMode(ridgeBayStudy?'ridge-bay':gapAudit?'gaps':fluidVentStudy?'fluid-vents':deepTimeStudy?'deep-time':timeline?'timeline':legacyStudy?'legacy':coldClimate?'cold':warmBeltStudy?'rain-shadow':scrubStudy?'scrub-recovery':atmosphereStudy?'atmosphere':coastStudy?'coast-sea':formationMode?'formation':stormMode?'storm':estuaryMode?'estuary':wetlandMode?'wetland':exchangeMode?'exchange':groundwaterMode?'groundwater':tectonicsMode?'tectonics':environmentMode?'lines':soilMode?'soil':sedimentMode?'sediment':balanceMode?'balance':annualMode?'annual':geography?'geography':logic?'logic':'map',ridgeBayStudy??gapAudit??fluidVentStudy??deepTimeStudy??timeline??legacyStudy??coldClimate??warmBeltStudy??scrubStudy??atmosphereStudy??coastStudy??(formationMode?{focus:formationFocus,month:formationMonth,study:formationStudy}:geographyLeg||stormStudy||stormFocus||estuaryFocus||wetlandFocus||exchangeFocus||groundwaterFocus||tectonicsFocus||environmentFocus||environmentMonth||environmentSeam||soilFocus||sedimentFocus||balanceFocus?{study:stormStudy,month:environmentMonth,seam:environmentSeam,focus:geographyLeg??stormFocus??estuaryFocus??wetlandFocus??exchangeFocus??groundwaterFocus??tectonicsFocus??environmentFocus??soilFocus??sedimentFocus??balanceFocus}:undefined));if(mode==='map'&&spatialZones.some(z=>z.id===mapZone))setZone(mapZone);$('plan-close').focus({preventScroll:true});},close,update(camera,value,diveTarget){if(active!==!!value)applyVisible(value);if(active)comparisons[mode]?.project?.(camera,diveTarget);if(!active||mode==='geography'||comparisons[mode])return;for(const z of spatialZones){const b=labels.querySelector(`[data-plan-zone="${z.id}"]`);vector.set(z.x,165,z.z).project(camera);b.hidden=vector.z<=0||vector.z>=1;b.style.left=(vector.x*.5+.5)*innerWidth+'px';b.style.top=(-vector.y*.5+.5)*innerHeight+'px';}},updateClimate(dt){if(active)comparisons[mode]?.update?.(dt);},
 get comparisonHour(){return active&&mode==='deep-time'?deepTime.hour:11.4;},
 get comparisonSeason(){
  return active&&mode==='ridge-bay'?(Math.floor(ridgeBayUI.state.month%12/3)+3)%4:1;
 },
 diveCheck(eye,target){return active&&mode==='deep-time'?deepTime.diveCheck(eye,target):undefined;},
 get comparisonWeather(){return active&&mode==='atmosphere'?atmosphere.weather:null;},
 get comparisonActive(){return active&&!!comparisons[mode];},
 get panelCollapsed(){return active&&content.hidden;},
 get timelineActive(){return active&&(mode==='timeline'||mode==='legacy');},
 get view(){return active&&(comparisons[mode]?.view??(mode==='geography'?geographyFocus?.view:null));},get active(){return active;},get selection(){return selected;}};
 $('world-plan').addEventListener('click',()=>active?close():controller.open());return controller;
}
