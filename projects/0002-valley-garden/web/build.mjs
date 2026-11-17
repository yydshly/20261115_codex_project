import { mkdir, copyFile, readFile, access, cp } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const out = resolve(root, 'dist');
await mkdir(out, { recursive: true });
const files = ['index.html', 'style.css', 'main.js', 'landscape.js', 'cottage.js', 'vegetation.js', 'nature.js'];
for (const name of files) {
  await copyFile(resolve(root, name), resolve(out, name));
}
await mkdir(resolve(out, 'node_modules/three'), { recursive: true });
await mkdir(resolve(out, 'node_modules/three/build'), { recursive: true });
for (const file of ['three.module.js', 'three.core.js']) await copyFile(resolve(root, 'node_modules/three/build', file), resolve(out, 'node_modules/three/build', file));
for (const file of ['objects/Water.js', 'utils/BufferGeometryUtils.js', 'loaders/HDRLoader.js']) {
  await mkdir(dirname(resolve(out, 'node_modules/three/examples/jsm', file)), { recursive: true });
  await copyFile(resolve(root, 'node_modules/three/examples/jsm', file), resolve(out, 'node_modules/three/examples/jsm', file));
}
await copyFile(resolve(root, 'node_modules/three/LICENSE'), resolve(out, 'node_modules/three/LICENSE'));
await cp(resolve(root, 'assets'), resolve(out, 'assets'), { recursive: true });
const materialFiles=['grass','rock','gravel'].flatMap(prefix=>['color','normal','roughness'].map(map=>`${prefix}-${map}.jpg`));
for (const name of [...materialFiles,'aerial-color.jpg','sky.hdr','SOURCES.md','download-manifest.json']) await access(resolve(out, 'assets/materials', name));
for (const file of files.filter(f => f.endsWith('.js'))) {
  const code = await readFile(resolve(out, file), 'utf8');
  for (const match of code.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) await access(resolve(out, match[1]));
}
console.log('Static build ready in dist/; all URLs are relative and work under the repository subpath.');
