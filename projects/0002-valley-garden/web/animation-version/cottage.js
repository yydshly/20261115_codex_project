import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Original, entirely procedural exterior. Local front is +Z. Units are metres. */
export function buildCottage(scene) {
  const root = new THREE.Group();
  root.name = '溪畔白色花园小屋';
  root.position.set(0, 0.18, -10);
  scene.add(root);
  const buckets = new Map();
  const materials = {};
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const rotation = new THREE.Euler();
  const point = new THREE.Vector3();
  const unit = new THREE.Vector3(1, 1, 1);
  let seed = 91823;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  function texture(draw, repeatX = 1, repeatY = 1) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    draw(canvas.getContext('2d'));
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(repeatX, repeatY);
    map.anisotropy = 4;
    return map;
  }

  const sidingMap = texture(ctx => {
    ctx.fillStyle = '#e7e8df'; ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 32) {
      const gradient = ctx.createLinearGradient(0, y, 0, y + 32);
      gradient.addColorStop(0, '#f6f4e9');
      gradient.addColorStop(0.85, '#e5e7dc');
      gradient.addColorStop(1, '#bfc6ba');
      ctx.fillStyle = gradient; ctx.fillRect(0, y, 512, 32);
      ctx.fillStyle = 'rgba(108,118,104,.12)'; ctx.fillRect(0, y + 30, 512, 1);
    }
    for (let i = 0; i < 2400; i++) {
      ctx.fillStyle = `rgba(140,151,132,${random() * 0.06})`;
      ctx.fillRect(random() * 512, random() * 512, random() * 15 + 1, 0.7);
    }
    // Paint retains the grain, very faint streaking and dirt under each overlap.
    for (let i = 0; i < 65; i++) {
      const x = random() * 512, y = Math.floor(random() * 16) * 32;
      ctx.fillStyle = `rgba(103,113,94,${0.025 + random() * 0.035})`;
      ctx.fillRect(x, y + 25, 0.5 + random() * 1.5, 6 + random() * 7);
    }
  }, 2, 1);

  const roofMap = texture(ctx => {
    ctx.fillStyle = '#243544'; ctx.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 16; row++) {
      for (let col = -1; col < 9; col++) {
        const x = col * 64 + (row % 2) * 32;
        const shade = Math.floor(29 + random() * 15);
        ctx.fillStyle = `rgb(${shade},${shade + 13},${shade + 23})`;
        ctx.fillRect(x + 1, row * 32 + 1, 62, 30);
        ctx.fillStyle = 'rgba(117,139,153,.25)';
        ctx.fillRect(x + 1, row * 32 + 1, 62, 1);
        ctx.fillStyle = 'rgba(0,0,0,.22)';
        ctx.fillRect(x, row * 32 + 30, 64, 2);
      }
    }
    for (let i = 0; i < 12000; i++) {
      ctx.fillStyle = random() > 0.5 ? 'rgba(174,185,186,.055)' : 'rgba(0,0,0,.075)';
      ctx.fillRect(random() * 512, random() * 512, 0.5 + random() * 1.5, 0.5 + random());
    }
  }, 3, 2);

  const stoneMap = texture(ctx => {
    ctx.fillStyle = '#85867b'; ctx.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col < 7; col++) {
        const x = col * 90 + (row % 2) * 45;
        const shade = Math.floor(135 + random() * 40);
        ctx.fillStyle = `rgb(${shade},${shade + 1},${shade - 10})`;
        ctx.fillRect(x + 3, row * 64 + 3, 84, 58);
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.fillRect(x + 5, row * 64 + 4, 79, 2);
      }
    }
    for (let i = 0; i < 6500; i++) {
      ctx.fillStyle = random() > 0.5 ? 'rgba(250,245,219,.12)' : 'rgba(47,54,45,.13)';
      ctx.fillRect(random() * 512, random() * 512, 1 + random() * 2.5, 1 + random() * 1.5);
    }
  }, 2, 0.5);

  const woodMap = texture(ctx => {
    ctx.fillStyle = '#dcd8ca'; ctx.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 220; row++) {
      const y = random() * 512;
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const py = y + Math.sin(x * 0.014 + row * 0.6) * 1.5 + Math.sin(x * 0.043 + row) * 0.4;
        if (x === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py);
      }
      ctx.strokeStyle = `rgba(100,93,68,${0.025 + random() * 0.075})`;
      ctx.lineWidth = 0.35 + random() * 0.5; ctx.stroke();
    }
  }, 2, 2);

  // Color textures are sRGB; relief and microsurface data must remain linear.
  function dataMap(source, remap) {
    const canvas = document.createElement('canvas');
    canvas.width = source.image.width; canvas.height = source.image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(source.image, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const luminance = (image.data[i] * 0.2126 + image.data[i + 1] * 0.7152 + image.data[i + 2] * 0.0722) / 255;
      const value = Math.round(THREE.MathUtils.clamp(remap(luminance), 0, 1) * 255);
      image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
    }
    ctx.putImageData(image, 0, 0);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.NoColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.copy(source.repeat); map.anisotropy = 4;
    return map;
  }
  const sidingRelief = dataMap(sidingMap, v => v);
  const sidingRoughness = dataMap(sidingMap, v => 0.83 + (1 - v) * 0.14);
  const roofRelief = dataMap(roofMap, v => v * 2.8);
  const roofRoughness = dataMap(roofMap, v => 0.7 + v * 0.7);
  const stoneRelief = dataMap(stoneMap, v => v);
  const stoneRoughness = dataMap(stoneMap, v => 0.86 + v * 0.12);
  const woodRelief = dataMap(woodMap, v => v);
  const woodRoughness = dataMap(woodMap, v => 0.85 + (1 - v) * 0.1);

  function material(name, color, options = {}) {
    materials[name] = new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...options });
    return name;
  }
  material('siding', '#ffffff', { map: sidingMap, bumpMap: sidingRelief, bumpScale: 0.035, roughnessMap: sidingRoughness, roughness: 0.95 });
  material('trim', '#f5f3e7', { bumpMap: woodRelief, bumpScale: 0.009, roughness: 0.6 });
  material('roof', '#ffffff', { map: roofMap, bumpMap: roofRelief, bumpScale: 0.045, roughnessMap: roofRoughness, roughness: 0.85, metalness: 0 });
  material('roofEdge', '#263945', { metalness: 0.25, roughness: 0.46 });
  material('stone', '#ffffff', { map: stoneMap, bumpMap: stoneRelief, bumpScale: 0.13, roughnessMap: stoneRoughness, roughness: 1 });
  // Dielectric glazing: the HDR environment supplies angle-dependent reflections.
  // A dark recess already sits behind the panes; no painted blue highlight tiles.
  materials.glass = new THREE.MeshPhysicalMaterial({
    color: '#e4e9e4', metalness: 0, roughness: 0.085, transmission: 0.78,
    thickness: 0.025, ior: 1.5, reflectivity: 0.5, clearcoat: 1,
    clearcoatRoughness: 0.055, envMapIntensity: 0.95,
  });
  material('warmPane', '#8b7b5d', { emissive: '#d2aa65', emissiveIntensity: 0.07, roughness: 0.16, metalness: 0 });
  material('door', '#45584a', { map: woodMap, bumpMap: woodRelief, bumpScale: 0.012, roughnessMap: woodRoughness, roughness: 0.75 });
  material('wood', '#ac9a7b', { map: woodMap, bumpMap: woodRelief, bumpScale: 0.025, roughnessMap: woodRoughness, roughness: 1 });
  material('woodDark', '#665b48', { map: woodMap, bumpMap: woodRelief, bumpScale: 0.022, roughnessMap: woodRoughness, roughness: 1 });
  material('metal', '#313e38', { metalness: 0.5, roughness: 0.4 });
  material('brass', '#c6a264', { metalness: 0.75, roughness: 0.38 });
  material('brick', '#967765', { roughness: 0.97 });
  material('pot', '#a66c52', { roughness: 0.95 });
  material('soil', '#423d28');
  material('leaf', '#3e5735', { side: THREE.DoubleSide, roughness: 0.84 });
  material('leafLight', '#657745', { side: THREE.DoubleSide, roughness: 0.82 });
  material('pink', '#d3a0b3', { side: THREE.DoubleSide, roughness: 0.8 });
  material('pinkDeep', '#b26d87', { side: THREE.DoubleSide, roughness: 0.82 });
  material('flowerCream', '#e9ddbb', { side: THREE.DoubleSide, roughness: 0.8 });
  material('pollen', '#ac8b41', { roughness: 1 });
  material('fabric', '#d4cabb', { roughness: 1 });

  function add(geometry, name, x, y, z, rx = 0, ry = 0, rz = 0) {
    rotation.set(rx, ry, rz);
    quaternion.setFromEuler(rotation);
    point.set(x, y, z);
    matrix.compose(point, quaternion, unit);
    const transformed = (geometry.index ? geometry.toNonIndexed() : geometry.clone()).applyMatrix4(matrix);
    if (transformed.getAttribute('uv') == null) {
      transformed.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(transformed.getAttribute('position').count * 2), 2));
    }
    if (!buckets.has(name)) buckets.set(name, []);
    buckets.get(name).push(transformed);
    return transformed;
  }
  function box(name, x, y, z, width, height, depth, rx = 0, ry = 0, rz = 0) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    add(geometry, name, x, y, z, rx, ry, rz);
    geometry.dispose();
  }
  function sphere(name, x, y, z, radius, sx = 1, sy = 1, sz = 1) {
    const geometry = new THREE.SphereGeometry(radius, 8, 6);
    geometry.scale(sx, sy, sz); add(geometry, name, x, y, z); geometry.dispose();
  }
  function cylinder(name, x, y, z, radiusTop, radiusBottom, height, sides = 10) {
    const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, sides);
    add(geometry, name, x, y, z); geometry.dispose();
  }
  function beam(name, a, b, width, depth = width) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const direction = end.clone().sub(start);
    const geometry = new THREE.BoxGeometry(width, direction.length(), depth);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    geometry.applyQuaternion(q); geometry.translate(...start.add(end).multiplyScalar(0.5).toArray());
    if (!buckets.has(name)) buckets.set(name, []);
    buckets.get(name).push(geometry.toNonIndexed());
    geometry.dispose();
  }
  function triangle(name, centerX, width, bottomY, topY, z, side = false) {
    const points = side
      ? [z, bottomY, centerX - width / 2, z, bottomY, centerX + width / 2, z, topY, centerX]
      : [centerX - width / 2, bottomY, z, centerX + width / 2, bottomY, z, centerX, topY, z];
    const geometry = new THREE.BufferGeometry();
    // Both windings make the gable visible from either outside end.
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([...points, ...points.slice(6), ...points.slice(3, 6), ...points.slice(0, 3)], 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 0.65, 0.5, 0.65, 1, 0, 0, 0], 2));
    geometry.computeVertexNormals(); add(geometry, name, 0, 0, 0); geometry.dispose();
  }

  // Slightly raised stone plinth, horizontal siding and crisp corner boards.
  box('stone', 0, 0.27, 0, 10.1, 0.54, 8.1);
  box('siding', 0, 3.1, 0, 10, 5.2, 8);
  box('trim', 0, 0.6, 0, 10.14, 0.18, 8.14);
  box('trim', 0, 5.68, 0, 10.2, 0.16, 8.2);
  for (const x of [-5.035, 5.035]) for (const z of [-4.035, 4.035]) {
    box('trim', x, 3.15, z, 0.16, 5.24, 0.16);
  }
  // Side gables of the main roof; a front cross-gable provides the familiar farmhouse silhouette.
  triangle('siding', 0, 8, 5.7, 8.2, -5.015, true);
  triangle('siding', 0, 8, 5.7, 8.2, 5.015, true);
  const mainSlope = Math.atan2(2.5, 4.55);
  const mainLength = Math.hypot(2.5, 4.55);
  for (const sign of [-1, 1]) {
    box('roof', 0, 6.95, sign * 2.275, 11.12, 0.16, mainLength, sign * mainSlope);
    box('trim', 0, 5.68, sign * 4.55, 11.15, 0.2, 0.13);
    for (const x of [-5.55, 5.55]) {
      beam('trim', [x, 5.68, sign * 4.55], [x, 8.22, 0], 0.14, 0.14);
    }
  }
  box('roofEdge', 0, 8.23, 0, 11.25, 0.15, 0.2);
  triangle('siding', -2.35, 4.5, 5.7, 8.32, 4.045);
  const crossSlope = Math.atan2(2.72, 2.56);
  const crossLength = Math.hypot(2.72, 2.56);
  for (const sign of [-1, 1]) {
    box('roof', -2.35 + sign * 1.28, 6.98, 2.15, crossLength, 0.16, 5.15, 0, 0, -sign * crossSlope);
    beam('trim', [-2.35 + sign * 2.56, 5.65, 4.76], [-2.35, 8.39, 4.76], 0.16, 0.16);
  }
  box('roofEdge', -2.35, 8.37, 2.15, 0.18, 0.15, 5.25);

  function windowPanel(x, y, z, width = 1.25, height = 1.65, side = false, warm = false) {
    // Individual parts are built in world-local coordinates to keep static geometry mergeable.
    const origin = new THREE.Vector3(x, y, z);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), side ? Math.sign(x) * Math.PI / 2 : z < 0 ? Math.PI : 0);
    function part(mat, px, py, pz, w, h, d) {
      const pos = new THREE.Vector3(px, py, pz).applyQuaternion(q).add(origin);
      box(mat, pos.x, pos.y, pos.z, w, h, d, 0, side ? Math.sign(x) * Math.PI / 2 : z < 0 ? Math.PI : 0);
    }
    part('woodDark', 0, 0, 0, width + 0.17, height + 0.17, 0.09);
    part(warm ? 'warmPane' : 'glass', 0, 0, 0.055, width, height, 0.05);
    for (const sign of [-1, 1]) {
      part('trim', sign * (width / 2 + 0.045), 0, 0.1, 0.12, height + 0.23, 0.13);
      part('trim', 0, sign * (height / 2 + 0.04), 0.1, width + 0.2, 0.12, 0.13);
    }
    part('trim', 0, 0, 0.14, 0.06, height, 0.06);
    part('trim', 0, 0.05, 0.14, width, 0.07, 0.06);
    part('trim', 0, height * 0.27, 0.14, width, 0.035, 0.04);
    part('trim', 0, -height / 2 - 0.1, 0.13, width + 0.35, 0.1, 0.3);
    part('trim', 0, height / 2 + 0.12, 0.09, width + 0.34, 0.12, 0.17);
  }
  windowPanel(-2.4, 1.9, 4.035, 1.45, 1.65);
  windowPanel(3.05, 1.9, 4.035, 1.4, 1.65, false, true);
  windowPanel(-2.4, 4.53, 4.035, 1.38, 1.6);
  windowPanel(2.5, 4.53, 4.035, 1.38, 1.6);
  windowPanel(-2.35, 6.45, 4.065, 0.82, 1.15);
  for (const x of [-5.04, 5.04]) for (const z of [-2.35, 1.15]) {
    windowPanel(x, 1.95, z, 1.22, 1.7, true, z < 0);
    windowPanel(x, 4.5, z, 1.22, 1.55, true);
  }
  for (const x of [-2.8, 2.8]) {
    windowPanel(x, 1.95, -4.035, 1.3, 1.65);
    windowPanel(x, 4.5, -4.035, 1.3, 1.6);
  }
  // Recessed green front door, panels, sidelights, transom and brass handle.
  box('woodDark', 0, 1.65, 4.055, 1.6, 2.3, 0.15);
  box('door', 0, 1.61, 4.16, 1.15, 2.2, 0.08);
  for (const x of [-0.32, 0.32]) {
    box('door', x, 1.12, 4.22, 0.43, 0.72, 0.065);
    box('warmPane', x, 2.05, 4.225, 0.42, 0.73, 0.025);
  }
  for (const x of [-0.68, 0.68]) box('trim', x, 1.65, 4.18, 0.14, 2.35, 0.14);
  box('trim', 0, 2.83, 4.18, 1.55, 0.16, 0.16);
  box('trim', 0, 0.51, 4.25, 1.55, 0.1, 0.3);
  sphere('brass', 0.39, 1.57, 4.3, 0.057);
  box('brass', 0.39, 1.55, 4.26, 0.07, 0.2, 0.03);
  // Porch deck, shallow steps, handrails and the lean-to metal roof.
  box('stone', 0, 0.23, 5.55, 11.0, 0.46, 3.1);
  box('wood', 0, 0.48, 5.55, 11.15, 0.12, 3.2);
  for (let z = 4.04; z <= 7.1; z += 0.22) box('woodDark', 0, 0.544, z, 11.12, 0.006, 0.012);
  for (let i = 0; i < 3; i++) box('stone', 0, 0.36 - i * 0.12, 7.2 + i * 0.32, 2.5, 0.23 - i * 0.04, 0.38);
  const porchAngle = Math.atan2(0.7, 3.5);
  box('roofEdge', 0, 3.25, 5.6, 11.55, 0.12, 3.7, porchAngle);
  for (let x = -5.5; x <= 5.5; x += 0.43) box('roof', x, 3.31, 5.6, 0.027, 0.035, 3.72, porchAngle);
  box('trim', 0, 2.95, 7.45, 11.6, 0.22, 0.14);
  box('trim', -5.72, 3.28, 5.6, 0.14, 0.18, 3.75, porchAngle);
  box('trim', 5.72, 3.28, 5.6, 0.14, 0.18, 3.75, porchAngle);
  for (const x of [-5.15, -2.0, 2.0, 5.15]) {
    box('trim', x, 1.72, 7.0, 0.15, 2.42, 0.15);
    box('trim', x, 0.62, 7.0, 0.24, 0.18, 0.24);
    box('trim', x, 2.82, 7.0, 0.28, 0.14, 0.28);
    for (const dx of [-1, 1]) beam('trim', [x, 2.35, 7], [x + dx * 0.45, 2.84, 7], 0.065);
  }
  function railing(x1, z1, x2, z2) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const count = Math.floor(length / 0.26);
    beam('trim', [x1, 1.4, z1], [x2, 1.4, z2], 0.09, 0.12);
    beam('trim', [x1, 0.76, z1], [x2, 0.76, z2], 0.065);
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      box('trim', x1 + (x2 - x1) * t, 1.06, z1 + (z2 - z1) * t, 0.045, 0.62, 0.045);
    }
  }
  railing(-5.15, 7, -1.55, 7);
  railing(1.55, 7, 5.15, 7);
  railing(-5.15, 4.2, -5.15, 7);
  railing(5.15, 4.2, 5.15, 7);

  // Tall brick chimney and cap. Fine mortar lines are actual shallow bands.
  box('brick', 3.2, 7.75, -1.4, 0.8, 2.6, 0.82);
  for (let y = 6.6; y < 9.05; y += 0.18) box('stone', 3.2, y, -1.4, 0.812, 0.017, 0.832);
  box('stone', 3.2, 9.07, -1.4, 1.05, 0.16, 1.05);
  box('metal', 3.2, 9.19, -1.4, 0.7, 0.13, 0.72);
  box('roofEdge', 3.2, 9.34, -1.4, 1.0, 0.08, 1.0);
  // Downpipes and gutters add a believable edge at human scale.
  for (const x of [-5.3, 5.3]) {
    box('roofEdge', x, 1.7, 3.95, 0.07, 2.6, 0.07);
    beam('roofEdge', [x, 0.4, 3.95], [x, 0.25, 4.3], 0.07);
  }

  // Slatted porch bench, round table, cushions and small lanterns.
  for (let i = 0; i < 5; i++) {
    box('wood', -3.55, 0.98, 5.6 + i * 0.115, 1.75, 0.075, 0.09);
    box('wood', -3.55, 1.25 + i * 0.13, 5.43, 1.75, 0.09, 0.065, -0.08);
  }
  for (const x of [-4.28, -2.82]) {
    box('woodDark', x, 0.74, 5.65, 0.075, 0.4, 0.075);
    box('woodDark', x, 0.74, 5.99, 0.075, 0.4, 0.075);
    box('woodDark', x, 1.2, 5.75, 0.07, 0.65, 0.075);
    box('wood', x, 1.48, 5.79, 0.12, 0.075, 0.8);
  }
  box('fabric', -3.55, 1.05, 5.85, 1.5, 0.09, 0.49);
  box('fabric', -4.01, 1.36, 5.55, 0.43, 0.42, 0.12, -0.14, 0, 0.08);
  cylinder('wood', -1.75, 1.02, 5.6, 0.38, 0.38, 0.065, 16);
  cylinder('woodDark', -1.75, 0.78, 5.6, 0.05, 0.12, 0.45, 8);
  cylinder('trim', -1.79, 1.1, 5.61, 0.065, 0.06, 0.12, 10);
  cylinder('woodDark', -1.75, 0.57, 5.6, 0.26, 0.28, 0.05, 10);
  for (const x of [-0.98, 0.98]) {
    box('metal', x, 2.3, 4.22, 0.1, 0.23, 0.1);
    box('warmPane', x, 2.35, 4.35, 0.13, 0.25, 0.13);
    box('metal', x, 2.51, 4.35, 0.21, 0.06, 0.21);
    box('metal', x, 2.2, 4.35, 0.17, 0.04, 0.17);
  }

  // Thin, folded botanical surfaces replace the old round leaf/flower proxies.
  function botanicalSurface(petal = false) {
    const geometry = new THREE.PlaneGeometry(1, 1, 3, 7);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const u = positions.getX(i) * 2;
      const t = positions.getY(i) + 0.5;
      const edge = Math.pow(Math.sin(Math.PI * t), petal ? 0.55 : 0.78);
      const serration = petal ? 1 : 1 + Math.sin(t * Math.PI * 20) * 0.045;
      positions.setXYZ(i, u * 0.5 * edge * serration, t,
        petal ? t * t * 0.26 + u * u * 0.065 : Math.sin(Math.PI * t) * 0.11 + Math.abs(u) * 0.065);
    }
    geometry.computeVertexNormals();
    return geometry;
  }
  const leafShape = botanicalSurface();
  const petalShape = botanicalSurface(true);
  const up = new THREE.Vector3(0, 1, 0);
  function leaf(name, x, y, z, length, width, direction, twist = 0) {
    const geometry = leafShape.clone().scale(width, length, length);
    const q = new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize());
    q.multiply(new THREE.Quaternion().setFromAxisAngle(up, twist));
    const angles = new THREE.Euler().setFromQuaternion(q);
    add(geometry, name, x, y, z, angles.x, angles.y, angles.z);
    geometry.dispose();
  }
  function bloom(name, x, y, z, radius = 0.039) {
    const count = name === 'flowerCream' ? 7 : 5;
    const phase = random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const angle = phase + i * Math.PI * 2 / count;
      const radial = new THREE.Vector3(Math.cos(angle), 0.18 + random() * 0.22, Math.sin(angle)).normalize();
      const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
      const normal = new THREE.Vector3().crossVectors(tangent, radial).normalize();
      const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(tangent, radial, normal));
      const angles = new THREE.Euler().setFromQuaternion(q);
      const geometry = petalShape.clone().scale(radius * 0.83, radius, radius);
      add(geometry, name, x, y, z, angles.x, angles.y, angles.z);
      geometry.dispose();
    }
    sphere('pollen', x, y + radius * 0.14, z, radius * 0.16, 1, 0.5, 1);
  }
  function sprig(x, y, z, height, flowerName, trailing = false) {
    const angle = random() * Math.PI * 2;
    const lean = height * (0.15 + random() * 0.3);
    const end = new THREE.Vector3(x + Math.cos(angle) * lean, y + height, z + Math.sin(angle) * lean);
    beam('leaf', [x, y, z], end.toArray(), 0.0045, 0.0045);
    for (let i = 0; i < 5; i++) {
      const t = 0.16 + i * 0.135;
      const origin = new THREE.Vector3(x, y, z).lerp(end, t);
      const a = angle + i * 2.4;
      const length = 0.08 + random() * 0.075;
      const direction = new THREE.Vector3(Math.cos(a), trailing && i < 2 ? -0.45 : 0.3 + random() * 0.4, Math.sin(a));
      leaf(i % 3 ? 'leaf' : 'leafLight', origin.x, origin.y, origin.z,
        length, length * (0.4 + random() * 0.12), direction, a * 0.3);
    }
    if (flowerName) bloom(flowerName, end.x, end.y, end.z, 0.028 + random() * 0.017);
  }
  function planter(x, z, radius = 0.36) {
    cylinder('pot', x, 0.83, z, radius, radius * 0.72, 0.56, 12);
    cylinder('pot', x, 1.1, z, radius * 1.08, radius * 1.08, 0.08, 12);
    cylinder('soil', x, 1.13, z, radius * 0.9, radius * 0.9, 0.035, 12);
    for (let i = 0; i < 29; i++) {
      const angle = random() * Math.PI * 2, r = Math.sqrt(random()) * radius;
      const px = x + Math.cos(angle) * r, pz = z + Math.sin(angle) * r;
      sprig(px, 1.13, pz, 0.16 + random() * 0.27,
        i % 4 === 0 ? null : i % 5 === 0 ? 'flowerCream' : i % 3 ? 'pink' : 'pinkDeep', true);
    }
  }
  planter(-4.8, 4.8, 0.36);
  planter(4.65, 6.3, 0.43);
  planter(1.2, 4.7, 0.3);
  // Window boxes on the second floor.
  for (const x of [-2.4, 2.5]) {
    box('woodDark', x, 3.55, 4.28, 1.6, 0.23, 0.42);
    box('soil', x, 3.68, 4.28, 1.48, 0.035, 0.34);
    for (let i = 0; i < 33; i++) {
      const px = x - 0.68 + random() * 1.36, pz = 4.15 + random() * 0.3;
      sprig(px, 3.69, pz, 0.12 + random() * 0.2,
        i % 4 === 0 ? null : i % 3 ? 'pink' : 'flowerCream', true);
      if (i % 3 === 0) {
        leaf('leaf', px, 3.68, 4.46, 0.18 + random() * 0.08, 0.07,
          new THREE.Vector3((random() - 0.5) * 0.7, -0.7, 0.6), random() * 0.7);
      }
    }
  }

  leafShape.dispose(); petalShape.dispose();

  for (const [name, geometries] of buckets) {
    const merged = mergeGeometries(geometries, false);
    const mesh = new THREE.Mesh(merged, materials[name]);
    mesh.name = `Cottage / ${name}`;
    mesh.castShadow = name !== 'glass' && name !== 'warmPane';
    mesh.receiveShadow = true;
    root.add(mesh);
    geometries.forEach(geometry => geometry.dispose());
  }
  root.updateMatrixWorld(true);
  return {
    group: root,
    colliders: [{ minX: -5.18, maxX: 5.18, minZ: -14.18, maxZ: -5.75 }],
  };
}
