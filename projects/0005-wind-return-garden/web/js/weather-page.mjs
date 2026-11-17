import {loadAssets} from './assets.mjs';
import {GardenScene} from './scene.mjs';
import {InteriorScene} from './interior-scene.mjs';
import {CatCompanion} from './companion.mjs';
import {createGarden,BEDS,advanceGarden} from './garden-life.mjs';
import {environmentAt,setAtmosphere} from './atmosphere.mjs';
import {makeWalkable} from './navigation.mjs';
import {GARDEN_PROPS} from './free-assets.mjs';
import {WindField} from './wind.mjs';
const $=id=>document.getElementById(id),canvas=$('shelter-demo'),c=canvas.getContext('2d'),garden=createGarden();
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,wind=new WindField({ambient:!reduced});
let time=0,last=performance.now(),scene,room,cat;
garden.home.inside=true;garden.cat.unlocked=true;garden.cat.space='inside';garden.cat.indoorX=287;garden.cat.indoorY=412;
for(const [i,bed] of BEDS.entries())Object.assign(garden.plots[bed.id],{kind:['daisy','bellflower','amber'][i],growth:1});
setAtmosphere(garden.atmosphere,'time','dusk');setAtmosphere(garden.atmosphere,'weather','rain');
document.querySelectorAll('[data-preview-space]').forEach(b=>b.addEventListener('click',()=>{garden.home.inside=b.dataset.previewSpace==='inside';document.querySelectorAll('[data-preview-space]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));
$('preview-time').addEventListener('change',e=>setAtmosphere(garden.atmosphere,'time',e.target.value));
$('preview-weather').addEventListener('change',e=>{advanceGarden(garden);setAtmosphere(garden.atmosphere,'weather',e.target.value);});
$('preview-lamp').addEventListener('click',()=>{garden.home.lampOn=!garden.home.lampOn;$('preview-lamp').textContent='桌灯 · '+(garden.home.lampOn?'开':'关');$('preview-lamp').setAttribute('aria-pressed',String(garden.home.lampOn));});
try{
  const assets=await loadAssets();scene=new GardenScene(assets);room=new InteriorScene(assets,scene);cat=new CatCompanion(garden.cat,makeWalkable(scene.trees,GARDEN_PROPS));
  function frame(t){
    const dt=Math.min(.05,(t-last)/1000);last=t;const now=Date.now(),env={...environmentAt(garden.atmosphere,now),reduced};
    if(!document.hidden){time+=dt;wind.update(dt);scene.update(dt,wind);advanceGarden(garden,now);cat.update(dt,{x:590,y:467},garden.plots,now,{env,home:garden.home});}
    const args={time,wind,player:garden.home.inside?{x:510,y:330,face:1}:{x:590,y:467,face:1},outdoorPlayer:{x:590,y:467},life:garden,completed:new Set(['oak','stream','home']),read:new Set(),charge:0,cameraX:0,width:960,path:[],sitting:false,env,now};
    if(garden.home.inside)room.draw(c,args);else scene.draw(c,args);
    $('preview-status').textContent=env.label+' · '+(garden.home.inside?'屋里':'庭院');requestAnimationFrame(frame);
  }requestAnimationFrame(frame);
}catch(error){$('preview-error').hidden=false;$('preview-error').textContent='预览素材未能加载：'+error.message;}
