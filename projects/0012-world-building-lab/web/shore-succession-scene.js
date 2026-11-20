import * as THREE from 'three';
import {terrainHeight} from './large-world.js';
import {createPlantBatcher} from './vegetation-scene.js';
import {hash} from './vegetation-rules.js';
import {clearGroup} from './models.js';

const colours={rush:'#cee48a',reed:'#7fe0b6',bare:'#dfbf8c',lost:'#ed895f'};
const better=(a,b,score)=>!a||score(b)>score(a)?b:a;

export function shorePlantSites(patches){
  const sites={};
  for(const p of patches){
    if(p.saltGrass>.4&&p.salt>=5.6)sites.rush=better(sites.rush,p,a=>a.saltGrass-Math.abs(a.salt-9)*.085);
    if(p.reed>.4)sites.reed=better(sites.reed,p,a=>a.reed-Math.abs(a.frequency-.35)*.44);
    sites.bare=better(sites.bare,p,a=>1-Math.max(a.saltGrass,a.reed));
  }
  return sites;
}

export function createShoreSuccessionScene(scene){
  const root=new THREE.Group();root.name='plants and roots on newly exposed estuary land';root.visible=false;scene.add(root);
  const plants=new THREE.Group();root.add(plants);
  const batch=createPlantBatcher();
  const colour=new THREE.Color();
  const patches=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({
    vertexColors:true,transparent:true,toneMapped:false,depthWrite:false,side:THREE.DoubleSide,opacity:.82
  }));
  patches.renderOrder=15;root.add(patches);
  let previousGrowth,previousShape,previousWet,previousVariant;

  return {
    show(model,coast,shape,growth,variant){
      root.visible=true;
      const supports=shorePlantSites(growth.patches);
      if(previousGrowth!==growth||previousShape!==shape||previousWet!==coast.wet||previousVariant!==variant){
        clearGroup(plants);
        const position=[],colors=[],placements={rush:[],reed:[]};
        const ground=(x,z)=>terrainHeight(x,z)+model.deltaAt(shape.bedChange,x,z);
        for(const p of growth.patches){
          const level=coast.levels[p.i],lost=coast.wet[p.i]&&variant!=='grow';
          const cover=variant==='bare'?0:p.cover;
          if(cover>.04||lost){
            const type=lost?'lost':p.reedCover>p.grassCover?'reed':'rush';
            colour.set(colours[type]);
            const alpha=lost?.62:.29+cover*.56;
            const mark=(x,z,opacity)=>{
              const y=lost?Math.max(level,ground(x,z))+.24:ground(x,z)+.16;
              position.push(x,y,z);
              colors.push(colour.r,colour.g,colour.b,opacity);
            };
            for(let k=0;k<12;k++){
              mark(p.x,p.z,alpha);
              for(const edge of [k,k+1]){
                const angle=edge*Math.PI/6;
                const radius=2.15+.3*hash(p.i,edge%12,17);
                mark(p.x+Math.cos(angle)*radius,p.z+Math.sin(angle)*radius,alpha*.18);
              }
            }
          }
          if(variant==='bare'||lost)continue;
          for(let k=0;k<18;k++){
            const draw=hash(p.i,k,92);
            const kind=draw<p.reedCover?'reed':draw<p.cover?'rush':null;
            if(!kind)continue;
            const x=p.x+(hash(p.i,k,83)-.5)*4,z=p.z+(hash(p.i,k,84)-.5)*4;
            const y=ground(x,z);
            if(y<level-.18)continue;
            const size=kind==='reed'?1.28:1.88;
            placements[kind].push({x,y,z,scale:size*(.68+.58*hash(p.i,k,85)),rotation:hash(p.i,k,86)*6.283});
          }
        }
        for(const [kind,list] of Object.entries(placements))if(list.length)plants.add(batch(kind,list));
        patches.geometry.dispose();
        patches.geometry=new THREE.BufferGeometry();
        patches.geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));
        patches.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));
        previousGrowth=growth;previousShape=shape;previousWet=coast.wet;previousVariant=variant;
      }
      const names={rush:'耐盐草',reed:'芦苇带',bare:'裸滩'};
      const labels=Object.entries(supports).map(([kind,p])=>{
        const isGrown=variant!=='bare'&&(kind==='rush'?p.grassCover>.05:kind==='reed'&&p.reedCover>.05)&&!coast.wet[p.i];
        const text=coast.wet[p.i]?'重新淹没的滩面':names[kind]+(kind!=='bare'&&!isGrown?'适生点':'');
        return {text,x:p.x,z:p.z,y:Math.max(coast.bed[p.i].bed,coast.levels[p.i])+6,color:colours[kind]};
      });
      return {labels,supports};
    },
    hide(){root.visible=false;}
  };
}
