import * as THREE from 'three';

/** Original, deterministic garden / forest assets. All distances are metres. */
export function buildVegetation(scene, { heightAt, riverX, random, forestOnly=false, gardenStructure=false }) {
  const rng = random || Math.random;
  const rand = (a = 0, b = 1) => a + (b - a) * rng();
  const pick = values => values[Math.floor(rng() * values.length)];
  const ground = (x, z) => heightAt(x, z);
  const group = new THREE.Group();
  group.name = 'Garden and valley woodland';
  scene.add(group);
  const colliders = [];
  const shaders = [];
  const up = new THREE.Vector3(0, 1, 0);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  function material(roughness = 0.94, sway = 0, side = THREE.FrontSide, map = null, bumpScale = 0) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness, side, map,
      ...(bumpScale ? { bumpMap: map, bumpScale } : {}) });
    if (sway) {
      mat.onBeforeCompile = shader => {
        shader.uniforms.gardenTime = { value: 0 };
        shader.vertexShader = 'uniform float gardenTime;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
          #include <begin_vertex>
          #ifdef USE_INSTANCING
            float gardenPhase = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.22;
            transformed.x += sin(gardenTime * 1.45 + gardenPhase + position.y * 0.8)
              * ${sway.toFixed(4)} * max(0.0, position.y);
            transformed.z += cos(gardenTime * 1.05 + gardenPhase)
              * ${(sway * 0.45).toFixed(4)} * max(0.0, position.y);
          #endif
        `);
        shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', `
          #include <lights_fragment_end>
          reflectedLight.indirectDiffuse += diffuseColor.rgb * .035;
        `);
        shaders.push(shader);
      };
      mat.customProgramCacheKey = () => `garden-wind-${sway}`;
    }
    return mat;
  }

  class Batch {
    constructor(name, geometry, mat, castShadow = false) {
      this.name = name;
      this.geometry = geometry;
      this.material = mat;
      this.items = [];
      this.castShadow = castShadow;
    }
    add(x, y, z, sx, sy, sz, tint, rx = 0, ry = 0, rz = 0, quaternion = null) {
      this.items.push({ x, y, z, sx, sy, sz, tint, rx, ry, rz, quaternion });
    }
    finish() {
      if (!this.items.length) return;
      const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.items.length);
      mesh.name = this.name;
      mesh.castShadow = this.castShadow;
      mesh.receiveShadow = true;
      this.items.forEach((item, i) => {
        dummy.position.set(item.x, item.y, item.z);
        dummy.scale.set(item.sx, item.sy, item.sz);
        if (item.quaternion) dummy.quaternion.copy(item.quaternion);
        else dummy.rotation.set(item.rx, item.ry, item.rz);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        color.set(item.tint);
        mesh.setColorAt(i, color);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
      this.items = [];
      return mesh;
    }
  }

  function makeTexture(width, height, draw) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    draw(canvas.getContext('2d'), width, height);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; return map;
  }
  const leafMap = makeTexture(128, 256, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#b0bba3'); gradient.addColorStop(.45, '#e5ead9'); gradient.addColorStop(1, '#b8c3a4');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1200; i++) { ctx.fillStyle = `rgba(70,82,52,${rand(.03,.09)})`; ctx.fillRect(rand(0,w),rand(0,h),rand(.4,1.8),rand(.4,1.8)); }
    ctx.strokeStyle = 'rgba(245,248,217,.65)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(w/2,h); ctx.bezierCurveTo(w*.53,h*.7,w*.48,h*.25,w/2,0); ctx.stroke();
    for (let i=1;i<11;i++) for (const side of [-1,1]) {
      const y=h*i/12; ctx.strokeStyle='rgba(225,235,207,.45)';ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(w/2,y+12);ctx.quadraticCurveTo(w/2+side*w*.15,y,w/2+side*w*.45,y-21);ctx.stroke();
    }
  });
  const petalMap = makeTexture(128,128,(ctx,w,h)=>{
    const gradient=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w*.65);
    gradient.addColorStop(0,'#bdb99d');gradient.addColorStop(.25,'#dfd9cd');gradient.addColorStop(.8,'#fffaf4');gradient.addColorStop(1,'#eee7e6');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    for(let i=0;i<40;i++){const a=i*2.399;ctx.strokeStyle='rgba(180,158,163,.13)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(w/2,h/2);ctx.lineTo(w/2+Math.cos(a)*w,h/2+Math.sin(a)*h);ctx.stroke();}
  });
  const treeBlossomMap=makeTexture(128,128,(ctx,w,h)=>{
    ctx.translate(w/2,h/2);
    for(let p=0;p<5;p++){
      ctx.save();ctx.rotate(p*Math.PI*2/5);
      const gradient=ctx.createRadialGradient(0,-20,2,0,-23,29);
      gradient.addColorStop(0,'rgba(255,250,247,1)');gradient.addColorStop(.80,'rgba(238,228,230,1)');gradient.addColorStop(1,'rgba(239,226,230,.4)');
      ctx.fillStyle=gradient;ctx.beginPath();ctx.ellipse(0,-24,17,27,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(178,152,161,.25)';ctx.lineWidth=.7;
      for(let vein=-1;vein<=1;vein++){ctx.beginPath();ctx.moveTo(0,-5);ctx.quadraticCurveTo(vein*5,-22,vein*8,-42);ctx.stroke();}
      ctx.restore();
    }
    ctx.fillStyle='#e3d4bc';ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();
    for(let i=0;i<8;i++){let a=i*2.399;ctx.fillStyle='rgba(174,152,109,.8)';ctx.beginPath();ctx.arc(Math.cos(a)*5,Math.sin(a)*5,1.1,0,Math.PI*2);ctx.fill();}
  });
  const barkMap = makeTexture(256,512,(ctx,w,h)=>{
    ctx.fillStyle='#d6cbb6';ctx.fillRect(0,0,w,h);
    for(let i=0;i<350;i++){const x=rand(0,w),y=rand(-100,h),length=rand(30,220);ctx.strokeStyle=`rgba(${rng()<.5?'65,54,42':'250,239,215'},${rand(.1,.4)})`;ctx.lineWidth=rand(.6,2.4);ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+rand(-4,4),y+length*.3,x+rand(-5,5),y+length*.7,x+rand(-3,3),y+length);ctx.stroke();}
  });
  barkMap.wrapS=barkMap.wrapT=THREE.RepeatWrapping;barkMap.repeat.set(3,1);

  // Each woodland clump consists of four intersecting leaf branches, not a solid
  // primitive. This keeps an irregular fine silhouette at a fraction of the
  // triangle cost of modelling every leaf. The texture is drawn here originally.
  const canopyCanvas = document.createElement('canvas');
  canopyCanvas.width = canopyCanvas.height = 256;
  const canopyContext = canopyCanvas.getContext('2d');
  const leafSeeds = [];
  for (let i = 0; i < 245; i++) {
    const a = rand(0, Math.PI * 2), r = Math.sqrt(rng());
    const wobble = 0.85 + 0.10 * Math.sin(a * 5) + 0.08 * Math.cos(a * 9);
    const px = 128 + Math.cos(a) * r * 108 * wobble;
    const py = 128 + Math.sin(a) * r * 103 * wobble;
    leafSeeds.push({ px, py, angle: a + rand(-1, 1), length: rand(9, 18), width: rand(4, 8) });
  }
  canopyContext.strokeStyle = 'rgba(118, 120, 99, 0.70)';
  canopyContext.lineWidth = 2;
  for (let i = 0; i < leafSeeds.length; i += 5) {
    const { px, py } = leafSeeds[i];
    canopyContext.beginPath(); canopyContext.moveTo(128, 145);
    canopyContext.quadraticCurveTo((128 + px) / 2, py + 20, px, py);
    canopyContext.stroke();
  }
  for (const leaf of leafSeeds) {
    canopyContext.save();
    canopyContext.translate(leaf.px, leaf.py); canopyContext.rotate(leaf.angle);
    const shade = Math.floor(rand(164, 246));
    canopyContext.fillStyle = `rgb(${shade},${Math.min(255, shade + 5)},${Math.max(0, shade - 9)})`;
    canopyContext.beginPath();
    canopyContext.moveTo(-leaf.length, 0);
    canopyContext.quadraticCurveTo(0, -leaf.width * 1.4, leaf.length, 0);
    canopyContext.quadraticCurveTo(0, leaf.width * 1.1, -leaf.length, 0);
    canopyContext.fill();
    canopyContext.strokeStyle = `rgba(245,250,230,${rand(0.15, 0.35)})`;
    canopyContext.lineWidth = 0.7;
    canopyContext.beginPath(); canopyContext.moveTo(-leaf.length * 0.6, 0);
    canopyContext.lineTo(leaf.length * 0.6, 0); canopyContext.stroke();
    canopyContext.restore();
  }
  const canopyMap = new THREE.CanvasTexture(canopyCanvas);
  canopyMap.colorSpace = THREE.SRGBColorSpace;
  canopyMap.anisotropy = 4;
  const canopyVertices = [], canopyUVs = [];
  const cardCorners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let card = 0; card < 4; card++) {
    const angle = card * Math.PI / 4;
    for (const index of [0, 1, 2, 0, 2, 3]) {
      const [u, v] = cardCorners[index];
      // The fourth card tilts upward so the crown is full from elevated cameras.
      const tilt = card === 3 ? 0.65 : 0;
      canopyVertices.push(u * Math.cos(angle), v * Math.cos(tilt), u * Math.sin(angle) + v * Math.sin(tilt));
      canopyUVs.push((u + 1) / 2, (v + 1) / 2);
    }
  }
  const canopyGeometry = new THREE.BufferGeometry();
  canopyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(canopyVertices, 3));
  canopyGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(canopyUVs, 2));
  canopyGeometry.computeVertexNormals();
  const canopyMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: canopyMap, alphaTest: 0.28, alphaToCoverage: true,
    side: THREE.DoubleSide, roughness: 1, metalness: 0,
  });

  // Curved ovate leaves have a raised midrib, serrated margins and their own
  // vein/bump texture; these replace every opaque garden canopy primitive.
  const leafGeometry = new THREE.BufferGeometry(),lv=[],lu=[],li=[];
  for(let row=0;row<=3;row++){
    const t=row/3,width=Math.pow(Math.sin(Math.PI*t),.85)*.31+.002;
    for(const side of [-1,0,1]){lv.push(width*side*(row%2?1:.9),t,Math.sin(t*Math.PI)*(.11-Math.abs(side)*.06)-t*t*.12);lu.push((side+1)/2,1-t);}
    if(row<3)for(let c=0;c<2;c++){let a=row*3+c;li.push(a,a+3,a+1,a+1,a+3,a+4);}
  }
  leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute(lv,3));leafGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(lu,2));leafGeometry.setIndex(li);
  leafGeometry.computeVertexNormals();

  const grassGeometry = new THREE.BufferGeometry();
  grassGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.015,0,0, 0.015,0,0, 0.055,.4,-.03,
    -0.015,0,0, 0.055,.4,-.03, 0.035,.4,-.03,
    0.035,.4,-.03, 0.055,.4,-.03, 0.13,.75,-.10,
    0.035,.4,-.03, 0.13,.75,-.10, 0.12,.75,-.10,
    0.12,.75,-.10, 0.13,.75,-.10, 0.24,1,-.20,
  ], 3));
  grassGeometry.computeVertexNormals();

  function flowerGeometry(petals,narrow=false,simple=false){
    const v=[],uv=[],indices=[];
    for(let p=0;p<petals;p++){
      const a=p/petals*Math.PI*2,width=narrow?.18:.37,first=v.length/3;
      const points=simple?[[.10,0,0],[.56,-width,.08],[1,0,.16],[.56,width,.08]]:[[.10,0,0],[.55,-width,.06],[1,0,.17],[.55,width,.06],[.57,0,.14]];
      for(const[r,s,y]of points){const x=Math.cos(a)*r-Math.sin(a)*s,z=Math.sin(a)*r+Math.cos(a)*s;v.push(x,y,z);uv.push(x*.48+.5,z*.48+.5);}
      for(const i of simple?[0,1,2,0,2,3]:[0,1,4,1,2,4,2,3,4,3,0,4])indices.push(first+i);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  const petalGeometry=flowerGeometry(9,true),hydrangeaGeometry=flowerGeometry(4),tinyFlower=flowerGeometry(5,false,true);
  // Tiny cupped flower surfaces use an original rounded five-petal alpha map.
  // They are separate flowers, never large intersecting planes across a tree.
  const treeFlowerSurface=new THREE.BufferGeometry();
  treeFlowerSurface.setAttribute('position',new THREE.Float32BufferAttribute([-1,0,-1,1,0,-1,1,0,1,-1,0,1,0,.15,0],3));
  treeFlowerSurface.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1,.5,.5],2));
  treeFlowerSurface.setIndex([0,4,1,1,4,2,2,4,3,3,4,0]);treeFlowerSurface.computeVertexNormals();
  function compoundFlowerGeometry(count,spike=false){
    const v=[],uv=[],source=(spike?flowerGeometry(3,true,true):treeFlowerSurface).toNonIndexed();
    for(let i=0;i<count;i++){
      const a=i*2.399,r=spike?.085:Math.sqrt((i+.5)/count)*.24;
      const pos=spike?new THREE.Vector3(Math.cos(a)*r,Math.floor(i/3)*.18,Math.sin(a)*r):new THREE.Vector3(Math.cos(a)*r,rand(-.11,.13),Math.sin(a)*r);
      const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(-1.1,1.1),a,rand(-1.1,1.1)));
      const size=spike?.14*(1-Math.floor(i/3)*.12):rand(.035,.052);
      const copy=source.clone().applyMatrix4(new THREE.Matrix4().compose(pos,q,new THREE.Vector3().setScalar(size)));
      v.push(...copy.attributes.position.array);uv.push(...copy.attributes.uv.array);copy.dispose();
    }
    source.dispose();const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
  }
  const blossomSprayGeometry=compoundFlowerGeometry(13),lavenderGeometry=compoundFlowerGeometry(15,true);
  const treeFlowerMaterial=material(.82,.015,THREE.DoubleSide,treeBlossomMap,.002);
  treeFlowerMaterial.alphaTest=.24;treeFlowerMaterial.alphaToCoverage=true;

  const batches = {
    wood: new Batch('Bark trunks and branching twigs', new THREE.CylinderGeometry(0.72, 1, 1, 7,1,true), material(.96,0,THREE.FrontSide,barkMap,.025), true),
    forest: new Batch('Layered woodland leaf branches', canopyGeometry, canopyMaterial),
    green: new Batch('Individual curved veined shrub leaves', leafGeometry, material(.76,.045,THREE.DoubleSide,leafMap,.006), true),
    blossom: new Batch('Individual four-petal hydrangea florets', hydrangeaGeometry, material(.75,.018,THREE.DoubleSide,petalMap,.003), true),
    sprays: new Batch('Airy rounded five-petal blossom sprays',blossomSprayGeometry,treeFlowerMaterial,true),
    petals: new Batch('Cupped cosmos and marguerite petals', petalGeometry, material(.78,.018,THREE.DoubleSide,petalMap,.003)),
    pollen: new Batch('Tiny pollen discs', new THREE.CircleGeometry(1,5).rotateX(-Math.PI/2), material(.9,0,THREE.DoubleSide)),
    stems: new Batch('Flower and lavender stems', new THREE.CylinderGeometry(0.65, 1, 1, 4,1,true), material()),
    leaves: new Batch('Veined perennial leaves', leafGeometry, material(.78,.04,THREE.DoubleSide,leafMap,.004)),
    lavender: new Batch('Irregular lavender flower spikes', lavenderGeometry, material(.82,.02,THREE.DoubleSide,petalMap)),
    grass: new Batch('Meadow grass blades', grassGeometry, material(0.99, 0.08, THREE.DoubleSide)),
    seeds: new Batch('Small golden grass florets', tinyFlower, material(.9,.02,THREE.DoubleSide,petalMap)),
  };
  const greens = ['#365b27', '#426b2f', '#527a34', '#60873a', '#335626', '#4a7130'];
  const forestGreens = ['#58723e', '#608347', '#71964f', '#859e55', '#648245', '#48683c'];
  const pinks = ['#db7ea6', '#eaa4bc', '#c85f91', '#f0b7cd', '#d78aa9', '#e99bb5'];
  const hydrangeaColors = ['#c771a5', '#d98fb3', '#ad81b8', '#dcc9db', '#e9dfe2'];

  function woodSegment(ax, ay, az, bx, by, bz, radius, tint = '#69533e') {
    const direction = new THREE.Vector3(bx - ax, by - ay, bz - az);
    const length = direction.length();
    if (!length) return;
    const q = new THREE.Quaternion().setFromUnitVectors(up, direction.normalize());
    batches.wood.add((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2,
      radius, length, radius, tint, 0, 0, 0, q);
  }

  function directionQuaternion(direction,twist=0){
    return new THREE.Quaternion().setFromUnitVectors(up,direction.clone().normalize())
      .multiply(new THREE.Quaternion().setFromAxisAngle(up,twist));
  }
  function individualLeaf(batch,x,y,z,direction,length,tint,width=1){
    batch.add(x,y,z,length*width,length,length,tint,0,0,0,directionQuaternion(direction,rand(-1.4,1.4)));
  }

  function roundedShrub(x, z, radius = 0.65, tint = null) {
    const y = ground(x, z);
    const chosen=tint||pick(greens);
    for(let shoot=0;shoot<6;shoot++){
      const a=shoot*2.399,r=radius*rand(.25,.65),h=radius*rand(.55,1.1);
      woodSegment(x,y+.03,z,x+Math.cos(a)*r,y+h,z+Math.sin(a)*r,.006*radius,'#86906b');
    }
    for (let l = 0; l < 92; l++) {
      const a=l*2.399+rand(-.3,.3),r=radius*Math.sqrt(rng())*.86,t=rand(.12,1);
      individualLeaf(batches.green,x+Math.cos(a)*r,y+radius*(.17+t*.90),z+Math.sin(a)*r,
        new THREE.Vector3(Math.cos(a),rand(-.35,.75),Math.sin(a)),radius*rand(.24,.40),l%4?chosen:pick(greens),1.05);
    }
  }

  function floweringTree(x, z, size) {
    const y = ground(x, z);
    const trunkHeight = size * 0.54;
    woodSegment(x, y, z, x + 0.15, y + trunkHeight, z - 0.1, size * 0.041,'#887760');
    colliders.push({ minX: x - 0.35, maxX: x + 0.35, minZ: z - 0.35, maxZ: z + 0.35 });
    const cx = x + 0.05, cy = y + size * 0.86;
    for (let arm = 0; arm < 7; arm++) {
      const a=arm*2.399+rand(-.4,.4),reach=size*rand(.29,.45);
      const start=new THREE.Vector3(x+.1,y+trunkHeight*rand(.75,1),z);
      const end=new THREE.Vector3(x+Math.cos(a)*reach,cy+rand(-.45,.55),z+Math.sin(a)*reach);
      const elbow=start.clone().lerp(end,.57);elbow.y-=size*rand(.01,.05);
      woodSegment(start.x,start.y,start.z,elbow.x,elbow.y,elbow.z,size*.014,'#8b7862');
      woodSegment(elbow.x,elbow.y,elbow.z,end.x,end.y,end.z,size*.007,'#968269');
      for(let twig=0;twig<5;twig++){
        const anchor=elbow.clone().lerp(end,.20+twig*.16),dir=new THREE.Vector3(Math.cos(a+(twig%2?1:-1)),rand(.1,.65),Math.sin(a+(twig%2?1:-1)));
        const tip=anchor.clone().addScaledVector(dir,size*rand(.06,.12));
        woodSegment(anchor.x,anchor.y,anchor.z,tip.x,tip.y,tip.z,size*.0028,'#9a856b');
      }
    }
    // Small individual leaves leave air between the visible woody branches.
    for (let l = 0; l < 430; l++) {
      const a = rand(0, Math.PI * 2), r = Math.sqrt(rng()) * size * 0.47;
      const yy = Math.sqrt(Math.max(0, 1 - (r / (size * 0.50)) ** 2));
      individualLeaf(batches.green,cx+Math.cos(a)*r,cy+yy*size*.19-size*.05+rand(-.4,.1),z+Math.sin(a)*r,
        new THREE.Vector3(Math.cos(a),rand(-.3,.7),Math.sin(a)),rand(.12,.22),pick(['#566d3c','#75844e','#627743']),.75);
    }
    // Each spray is 13 actual five-petal flowers, rather than a pink solid.
    for (let l = 0; l < 480; l++) {
      const a = rand(0, Math.PI * 2), r = Math.sqrt(rng()) * size * 0.54;
      const top = Math.sqrt(Math.max(0, 1 - (r / (size * 0.56)) ** 2));
      const h = cy + top * size * 0.19 + rand(-size * 0.16, size * 0.12);
      const scale = rand(1.15,1.65);
      batches.sprays.add(cx + Math.cos(a) * r, h, z + Math.sin(a) * r,
        scale,scale,scale,pick(pinks),rand(-1.2,1.2),a,rand(-1.2,1.2));
    }
    // A few fallen petals soften the transition from lawn to the trunk.
    for (let l = 0; l < 50; l++) {
      const a = rand(0, 6.28), r = rand(0.3, size * 0.58);
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      batches.petals.add(px, ground(px, pz) + 0.025, pz, 0.035, 0.02, 0.035, pick(pinks), 0, a);
    }
  }

  function hydrangea(x, z, size = 0.72, tint = null, headCount = 8) {
    const y = ground(x, z);
    roundedShrub(x, z, size, pick(['#3c662e', '#4c7335', '#577e39']));
    const chosen = tint || pick(hydrangeaColors);
    for (let head = 0; head < headCount; head++) {
      const a = head / headCount * Math.PI * 2 + rand(-0.1, 0.1);
      const hx = x + Math.cos(a) * size * rand(0.15, 0.7);
      const hz = z + Math.sin(a) * size * rand(0.15, 0.7);
      const hy = y + size * rand(0.95, 1.45);
      const radius = size * rand(0.21, 0.31);
      woodSegment(x,y+size*.3,z,hx,hy,hz,.006*size,'#7c8a61');
      for (let f = 0; f < 32; f++) {
        const az=f*2.399+rand(-.13,.13),vertical=-.3+1.3*((f+.5)/32);
        const ring = Math.sqrt(1 - vertical * vertical);
        const fr=radius*rand(.20,.28),normal=new THREE.Vector3(Math.cos(az)*ring,vertical,Math.sin(az)*ring);
        const px=hx+normal.x*radius,py=hy+normal.y*radius,pz=hz+normal.z*radius,q=directionQuaternion(normal,az);
        batches.blossom.add(px,py,pz,fr,fr,fr,chosen,0,0,0,q);
        if(f%2===0)batches.pollen.add(px+normal.x*.002,py+normal.y*.002,pz+normal.z*.002,fr*.07,fr*.07,fr*.07,'#e3d7bd',0,0,0,q);
      }
    }
  }

  function daisyClump(x, z, tint, count = 9, scale = 1) {
    for (let f = 0; f < count; f++) {
      const a = rand(0, Math.PI * 2), r = Math.sqrt(rng()) * 0.36 * scale;
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      const y = ground(px, pz), h = rand(0.3, 0.72) * scale;
      const spread = rand(.045,.075)*scale;
      batches.stems.add(px, y + h / 2, pz, 0.004 * scale, h, 0.004 * scale, '#748058');
      const tiltX = rand(-0.3, 0.3), tiltZ = rand(-0.3, 0.3);
      batches.petals.add(px, y + h, pz, spread, spread, spread, tint, tiltX, a, tiltZ);
      batches.pollen.add(px, y + h + spread * 0.02, pz,
        spread * 0.19, spread * 0.19, spread * 0.19, '#b6a04f',tiltX,a,tiltZ);
      for (let l = 0; l < 2; l++) {
        individualLeaf(batches.leaves,px,y+h*(.28+l*.21),pz,new THREE.Vector3(Math.cos(a+l*2.7),.25,Math.sin(a+l*2.7)),rand(.08,.15)*scale,pick(greens),.55);
      }
    }
  }

  function lavenderPlant(x, z, size = 1) {
    const y = ground(x, z);
    for (let branch = 0; branch < 7; branch++) {
      const a = rand(0, Math.PI * 2), r = rand(0.02, 0.20) * size;
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      const h = rand(0.42, 0.72) * size;
      batches.stems.add(px, y + h * 0.46, pz, 0.0035, h * 0.92, 0.0035, '#90967c');
      const s=rand(.10,.15)*size;
      batches.lavender.add(px,y+h*.84,pz,s,s,s,pick(['#8d7eaa','#a899bb','#766d94','#b7a7c8']),rand(-.15,.15),a,rand(-.15,.15));
      for(let l=0;l<4;l++)individualLeaf(batches.leaves,px,y+h*(.14+l*.12),pz,new THREE.Vector3(Math.cos(a+l*2.1),.65,Math.sin(a+l*2.1)),rand(.08,.14)*size,'#8b967b',.19);
    }
  }

  function grassTuft(x, z, size = 1, golden = false, mown = false) {
    const y = ground(x, z), tint = golden ? '#a6a16a' : pick(['#6e8b46', '#81954e', '#8b9f57', '#597a38']);
    for (let blade = 0; blade < (mown?5:8); blade++) {
      const a = rand(0, Math.PI * 2);
      const h = rand(mown?.045:.10,mown?.12:.26)*size;
      const px = x + rand(-0.06, 0.06), pz = z + rand(-0.06, 0.06);
      batches.grass.add(px,y+.007,pz,rand(.28,.52)*size,h,h,tint,rand(-.15,.15),a,rand(-.15,.15));
      if (golden && blade < 2 && !mown) {
        for(let seed=0;seed<4;seed++)batches.seeds.add(px+Math.cos(a)*.02,y+h*(.78+seed*.05),pz+Math.sin(a)*.02,
          .008,.008,.008,'#bfb58f',rand(-1,1),a,rand(-1,1));
      }
    }
  }

  function cypress(x, z, height = 5) {
    const y = ground(x, z);
    woodSegment(x, y, z, x, y + height * 0.84, z, 0.13, '#766448');
    for (let i = 0; i < 340; i++) {
      const t=rng(),a=i*2.399,r=Math.sin(t*Math.PI)*.52*Math.sqrt(rng());
      individualLeaf(batches.green,x+Math.cos(a)*r,y+height*(.10+t*.85),z+Math.sin(a)*r,
        new THREE.Vector3(Math.cos(a)*.4,1,Math.sin(a)*.4),rand(.12,.22),pick(['#506b44','#5b7449','#48613f']),.26);
    }
    colliders.push({ minX: x - 0.32, maxX: x + 0.32, minZ: z - 0.32, maxZ: z + 0.32 });
  }

  // Keep the reference's flowering trees and mature border masses when scan plants
  // supply the small near-path details. They are separate visual scales.
  if(!forestOnly||gardenStructure){
  floweringTree(-8, -1, 5.9);
  floweringTree(9, -13, 6.4);
  floweringTree(-9, -20, 4.7);
  cypress(10.5, 4.8, 5.6);
  cypress(-10.4, -17.2, 5.0);
  cypress(10.5, -21.2, 5.7);
  }

  if(!forestOnly||gardenStructure===true){
  // Flower garden: curving margins, graded taller shrubs toward the fence.
  for (let side of [-1, 1]) {
    for (let i = 0; i < 10; i++) {
      const z = -1.2 + i * 1.1;
      const x = side * (2.3 + Math.sin(i * 0.57) * 0.32);
      if (Math.abs(x - riverX(z)) < 5.0) continue;
      daisyClump(x, z, pick(['#efdfdf', '#dd8eab', '#eab1c5', '#dbc373']), 12, rand(0.9, 1.2));
      if (i % 2 === 0) lavenderPlant(x + side * 0.8, z + 0.35, rand(0.9, 1.2));
    }
    for (let i = 0; i < 8; i++) {
      const x = side * (3.5 + i * 1.03), z = 7 + Math.sin(i * 0.48) * 0.6;
      if (Math.abs(x - riverX(z)) < 5.0) continue;
      if (i % 3 === 0) hydrangea(x, z, rand(0.62, 0.93));
      else daisyClump(x, z, i % 2 ? '#e3bd56' : '#f1e7dc', 17, 1.1);
    }
    for (let i = 0; i < 12; i++) {
      const z = -20 + i * 2.15, x = side * (10.1 + Math.sin(i * 0.8) * 0.35);
      if (Math.abs(x - riverX(z)) < 5.2) continue;
      if (i % 3 === 1) roundedShrub(x, z, rand(0.7, 0.95));
      else hydrangea(x, z, rand(0.65, 0.95));
      daisyClump(x - side * 0.9, z + 0.5, pick(['#e5c55b', '#eaa4c3', '#f3e8db']), 7);
    }
  }
  // Repeated lavender ribbons on either side of the house, with clear side access.
  for (let i = 0; i < 33; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (6.3 + (i % 3) * 0.48), z = -17.9 + Math.floor(i / 3) * 0.42;
    if (Math.abs(x - riverX(z)) > 5.0) lavenderPlant(x, z, rand(0.9, 1.25));
  }
  for (let i = 0; i < 8; i++) {
    hydrangea(-7.8 + i * 2.25, -22, rand(0.72, 1.0));
  }
  for (let i = 0; i < 65; i++) {
    const x = rand(-11, 11), z = rand(-23, 9);
    if ((Math.abs(x) < 2.0 && z > -4) || (Math.abs(x) < 6.0 && z < -2 && z > -15.5)) continue;
    if (Math.abs(x - riverX(z)) < 5.1) continue;
    grassTuft(x, z, rand(0.8, 1.5), i % 5 === 0);
  }

  // Overlapping masses of flowering shrubs frame the front garden while a
  // generous central opening and both side routes stay visibly traversable.
  for (const side of [-1, 1]) {
    for (let column = 0; column < 6; column++) {
      for (let row = 0; row < 2; row++) {
        const x = side * (3.3 + column * 1.25 + row * 0.18);
        const z = 5.35 + row * 1.5 + Math.sin(column * 0.8) * 0.27;
        if (Math.abs(x - riverX(z)) < 5.2) continue;
        hydrangea(x, z, rand(0.75, 1.04), pick(['#d994b5', '#c778a4', '#e2b6cc', '#e1d9de']), 6);
        if (row === 0 && column % 2 === 0) daisyClump(x, z - 0.8, '#e7c86a', 14, 1.12);
      }
    }
    for (let i = 0; i < 11; i++) {
      const z = -21 + i * 2.35, x = side * (9.15 + Math.sin(i * 1.3) * 0.3);
      if (Math.abs(x - riverX(z)) < 5.4) continue;
      hydrangea(x, z, rand(0.78, 1.05), pick(['#d9a0bd', '#d581a7', '#b995bd', '#e1d9df']), 6);
    }
    for (let i = 0; i < 5; i++) {
      const x = side * (8.1 + rand(-0.5, 0.5)), z = -22.0 + i * 0.9;
      if (Math.abs(x - riverX(z)) > 5.4) lavenderPlant(x, z, rand(1.1, 1.4));
    }
  }

  }

  function forestTree(x, z, height, conifer = false) {
    const y = ground(x, z), tint = pick(forestGreens);
    woodSegment(x, y, z, x + rand(-0.15, 0.15), y + height * 0.54, z,
      height * 0.016, '#706947');
    const count = conifer ? 23 : 31;
    const width = height * (conifer ? rand(0.16, 0.20) : rand(0.23, 0.29));
    for (let l = 0; l < count; l++) {
      const t = (l + rng()) / count;
      const a = l * 2.399 + rand(-0.45, 0.45);
      const profile = conifer ? Math.pow(1 - t, 0.72) : Math.sin((t * 0.82 + 0.10) * Math.PI);
      const reach = width * profile * rand(0.3, 0.94);
      const cy = y + height * (0.18 + t * 0.76);
      const size = height * rand(0.085, 0.135) * (conifer ? 1 - t * 0.48 : 1);
      batches.forest.add(x + Math.cos(a) * reach, cy, z + Math.sin(a) * reach,
        size * rand(0.85, 1.30), size * rand(0.74, 1.22), size * rand(0.85, 1.30),
        l % 4 === 0 ? pick(forestGreens) : tint, rand(-0.4, 0.4), rand(0, 6), rand(-0.3, 0.3));
    }
  }
  // Dense green woodland in the midground, leaving the central meadow open.
  let planted = 0;
  for (let attempts = 0; planted < 700 && attempts < 1700; attempts++) {
    const x = rand(-175, 175), z = rand(-218, -55);
    if (Math.abs(x - riverX(z)) < 7.5) continue;
    forestTree(x, z, rand(8, 18), rng() < 0.17);
    planted++;
  }
  for (let i = 0; i < 115; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * rand(48, 125), z = rand(-55, 85);
    if (Math.abs(x - riverX(z)) < 7.5) continue;
    forestTree(x, z, rand(7, 15), rng() < 0.12);
  }

  // A staggered, continuous woodland margin hides gaps between tall trees.
  // Its uneven front line reads as an established forest, rather than planted rows.
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 97; column++) {
      const x = -170 + column * 3.55 + rand(-1.4, 1.4);
      const z = -57 - row * 5.5 + Math.sin(x * 0.047) * 5.3 + rand(-1.5, 1.5);
      if (Math.abs(x - riverX(z)) < 7.4) continue;
      forestTree(x, z, rand(6.4, 12.0), rng() < 0.09);
    }
  }
  for (let i = 0; i < 370; i++) {
    const x = rand(-174, 174), z = -51 + Math.sin(x * 0.047) * 5.3 + rand(-7.5, 4.5);
    if (Math.abs(x - riverX(z)) < 7.0) continue;
    const floor = ground(x, z), h = rand(0.9, 2.8);
    for (let clump = 0; clump < 4; clump++) {
      batches.forest.add(x + rand(-1.0, 1.0), floor + h * rand(0.35, 0.75), z + rand(-0.8, 0.8),
        h * rand(0.65, 1.05), h * rand(0.55, 0.85), h * rand(0.65, 1.05),
        pick(forestGreens), rand(-0.2, 0.2), rand(0, 6.28));
    }
  }

  if(!forestOnly){
  // Fine short lawn around the flower borders and stone-path margins. These
  // blades are only 4–12 cm high, with enough gaps for natural variation.
  for(let i=0;i<2100;i++){
    const x=rand(-14,15),z=rand(-26,12);
    if(Math.abs(x-riverX(z))<5.0||(Math.abs(x)<1.45&&z>-4)||(Math.abs(x)<5.8&&z>-15.8&&z< -2.2))continue;
    grassTuft(x,z,rand(.75,1.15),false,true);
  }
  // Low grasses and occasional wildflowers make walkable meadows feel inhabited.
  for (let i = 0; i < 900; i++) {
    const x = rand(-46, 46), z = rand(-43, 70);
    if (Math.abs(x - riverX(z)) < 5.5) continue;
    if (x > -13 && x < 13 && z > -25 && z < 12) continue;
    // Keep a clear diagonal approach from the overview/creek spawn.
    if (z > 10 && z < 40 && Math.abs(x - (z * 0.65 + 6)) < 2) continue;
    grassTuft(x, z, rand(0.7, 1.25), i % 13 === 0);
    if (i % 14 === 0) daisyClump(x, z, pick(['#e9dfc6', '#d7c270', '#b6a3c1']), 4, 0.72);
  }
  }
  for (const batch of Object.values(batches)) batch.finish();

  return {
    colliders,
    group,
    update(time) {
      for (const shader of shaders) shader.uniforms.gardenTime.value = time;
    },
  };
}
