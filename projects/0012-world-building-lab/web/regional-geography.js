import {meltLines} from './glacial-geography.js';
import {transitionAt,transitionClimate} from './environment-transitions.js';
import {borealSlopeWeight} from './boreal-layout.js';

const clamp = n => Math.max(0, Math.min(1, n));
const ease = n => {
  const u = clamp(n);
  return u * u * (3 - 2 * u);
};
const blend = (a, b, u) => a + (b - a) * u;
const node = ([x, z, y, width]) => ({x, z, y, width});

// Metres in the existing scene. Heights are relief targets beneath the local landforms.
export const reliefBelts = [
  {id: 'alpine', points: [
    [615, -542, 400, 225], [715, -666, 292, 205], [798, -803, 212, 174],
    [942, -1000, 322, 203], [1170, -1110, 368, 240], [1480, -1300, 560, 253]
  ]},
  {id: 'north', points: [
    [-1172, -758, 64, 106], [-1035, -691, 60, 109], [-882, -727, 56, 102],
    [-753, -844, 85, 109], [-615, -946, 91, 122], [-520, -1098, 74, 128],
    [-317, -1199, 58, 126], [-84, -1180, 42, 130], [138, -1088, 48, 122],
    [328, -1058, 74, 118]
  ]},
  {id: 'west', points: [
    [-1510, 38, 38, 86], [-1480, 206, 98, 127], [-1400, 399, 213, 134],
    [-1310, 551, 218, 133], [-1135, 651, 132, 178], [-900, 724, 74, 179],
    [-746, 810, 58, 180], [-665, 967, 66, 166], [-628, 1114, 62, 163],
    [-610, 1290, 59, 154], [-679, 1470, 49, 125]
  ]},
  {id: 'south', points: [
    [-725, 826, 45, 145], [-530, 781, 39, 146], [-314, 759, 35, 137],
    [-115, 790, 32, 136], [128, 786, 57, 124], [318, 782, 61, 116]
  ]},
  {id: 'dry', points: [
    [340, 1160, 31, 144], [502, 1210, 34, 147], [623, 1285, 42, 126],
    [774, 1337, 45, 136], [935, 1332, 40, 104], [1050, 1341, 29, 82]
  ]},
  {id: 'east', points: [
    [890, -792, 130, 168], [1020, -608, 96, 166], [1136, -408, 60, 159],
    [1270, -234, 65, 128], [1425, -168, 65, 143], [1540, -96, 50, 131],
    [1620, 62, 51, 126], [1595, 212, 29, 112]
  ]}
].map(belt => ({...belt, points: belt.points.map(node)}));

const segments = reliefBelts.flatMap(({points}) => points.slice(1).map((b, i) => {
  const a = points[i], dx = b.x - a.x, dz = b.z - a.z;
  const width = Math.max(a.width, b.width);
  return {a, b, dx, dz, invLengthSquared: 1 / (dx * dx + dz * dz),
    minX: Math.min(a.x, b.x) - width, maxX: Math.max(a.x, b.x) + width,
    minZ: Math.min(a.z, b.z) - width, maxZ: Math.max(a.z, b.z) + width};
}));

// Low shoulders span the old gaps on the landward side of the south coast.
const southernAprons = [
  [-461, 882, 320, 250, 36], [-175, 887, 330, 259, 31],
  [122, 912, 320, 283, 36], [403, 938, 239, 226, 38],
  [535, 1265, 190, 310, 29], [101, 1485, 360, 113, 27],
  [-360, 1466, 305, 113, 29]
];

export function raisedRelief(x, z, original) {
  let height = original;
  for (const [cx, cz, rx, rz, top] of southernAprons) {
    if (Math.abs(x - cx) >= rx || Math.abs(z - cz) >= rz) continue;
    const r = Math.hypot((x - cx) / rx, (z - cz) / rz);
    const shape = 1 - ease((r - .25) / .75);
    const target = top - 8 * r + 2.8 * Math.sin(x * .018 + z * .011);
    height = Math.max(height, blend(original, target, shape));
  }
  for (const {a, b, dx, dz, invLengthSquared, minX, maxX, minZ, maxZ} of segments) {
    if (x < minX || x > maxX || z < minZ || z > maxZ) continue;
    const u = clamp(((x - a.x) * dx + (z - a.z) * dz) * invLengthSquared);
    const distance = Math.hypot(x - a.x - u * dx, z - a.z - u * dz);
    const foot = distance / blend(a.width, b.width, u);
    const target = blend(a.y, b.y, u) + 5 * Math.sin(x * .023 + z * .008) * Math.cos(z * .018);
    height = Math.max(height, blend(original, target, 1 - ease(foot)));
  }
  return height;
}

// The same southward ridge used by the relief profile locates the lee slope.
const rainDivide = reliefBelts.find(belt => belt.id === 'west').points.slice(6);
export function rainDivideX(z) {
  for (let i = 1; i < rainDivide.length; i++) {
    const a = rainDivide[i - 1], b = rainDivide[i];
    if (z <= b.z) return blend(a.x, b.x, clamp((z - a.z) / (b.z - a.z)));
  }
  return rainDivide.at(-1).x;
}

export const leeSwaleZ=x=>1147+.23*(x+588)+13*Math.sin((x+588)*.022);
function swaleAt(x,z){
  if(x<= -588||x>= -265||z<=1100||z>=1270)return 0;
  const channelZ=leeSwaleZ(x);
  const depth=1-ease(Math.abs(z-channelZ)/27);
  return depth*ease((x+588)/55)*ease((-265-x)/74);
}
export function leeSwaleTerrain(x,z,height){
  return height-3.1*swaleAt(x,z);
}

export function regionalThermal(z,height){
  // Relative teaching indices on a compact map, not temperatures or rainfall totals.
  const latitude=.59+z/5000,cooling=Math.max(0,height-25)/860;
  return {latitude,cooling,warmth:clamp(latitude-cooling)};
}

export function regionalClimate(x, z, height, bank = Infinity) {
  const {warmth}=regionalThermal(z,height);
  const southWind = ease((z - 460) / 370);
  const west = Math.exp(-Math.max(0, x + 1660) / 1550);
  const divide=rainDivideX(z);
  const lee = southWind * ease((x - divide - 18) / 740);
  const windward = southWind * (.22 * west + .15 * Math.exp(-(((x - divide + 120) / 280) ** 2)));
  // Summer sea air enters through the lower coastal belt supporting the existing monsoon groves.
  const coastalBelt = .52 * Math.exp(-(((z - 755) / 102) ** 2))
    * ease((x + 160) / 370) * (1 - .62 * ease((x - 530) / 340));
  const humidBank = Number.isFinite(bank) ? .40 * Math.exp(-Math.max(0, bank) / 43) : 0;
  const moisture = clamp(.45 + .17 * west + windward - .46 * lee + coastalBelt + humidBank + .18*swaleAt(x,z));
  return {warmth, moisture, lee};
}

// Broad bands interpolate into the old scene palettes around intact authored landmarks.
export function ecotoneInfluence(x, z) {
  const south = ease((z - 495) / 350) * (1 - ease((x - 1160) / 270));
  const north = ease((-z - 440) / 380);
  const east = ease((x - 640) / 570) * (1 - ease((z - 235) / 420));
  return Math.max(south, north, east, transitionAt(x,z)?.strength??0);
}

export function seamSurfaceInfluence(x,z){
  const forestSlope=borealSlopeWeight(x,z);
  const north=Math.max(
    ease((x+1010)/150)*ease((-410-x)/170)*ease((z+1260)/180)*ease((-900-z)/138),
    forestSlope*(1-ease((forestSlope-.65)/.35))
  );
  const south=ease((z-825)/205)*ease((1460-z)/139)
    *ease((x-rainDivideX(z)+270)/154)*ease((295-x)/160);
  const west=ease((x+1545)/65)*ease((-1070-x)/114)*ease((z+32)/108)*ease((675-z)/126);
  const east=ease((x-1090)/160)*ease((z+360)/151)*ease((761-z)/260)
    * (1-ease((x-1635)/160)*(1-ease((z-195)/220)));
  return {north,south,west,east};
}

const colors = {
  gravel: [154, 139, 110], grass: [135, 150, 91], forest: [98, 122, 78],
  coolGrass: [123, 138, 110], rock: [128, 132, 126], scree: [153, 157, 149],
  snow: [185, 198, 199], wetSoil: [118, 121, 93]
};
const mixRGB = (a, b, u) => a.map((v, i) => blend(v, b[i], u));

export function regionalSurface(x, z, height, bank, original, influence, seams) {
  if (height < .2) {
    if (!seams.east) return original;
    const shelf=mixRGB([153,148,125],[109,127,128],ease(-height/65));
    return mixRGB(original,shelf,seams.east);
  }
  if (influence <= 0) return original;
  const {warmth, moisture} = transitionClimate(regionalClimate(x,z,height,bank),transitionAt(x,z));
  const dryGrass = mixRGB(colors.gravel, colors.grass, ease((moisture - .17) / .31));
  const woodland = mixRGB(dryGrass, colors.forest, ease((moisture - .47) / .30));
  const coolSoil = mixRGB(woodland, colors.coolGrass, 1 - ease((warmth - .22) / .25));
  const alpine = mixRGB(colors.rock, colors.scree, ease((height - 210) / 115));
  const exposed = mixRGB(alpine, colors.snow, ease((height - 335) / 140));
  const ground = mixRGB(coolSoil, exposed, ease((height - 136) / 158));
  const shore = Number.isFinite(bank) ? .9 * (1 - ease((bank - 3) / 19)) : 0;
  const coldCover=seams.north*ease((.43-warmth)/.25)*(.5+.5*ease((height-18)/96));
  const thinSoil=seams.west*ease((height-40)/155);
  const rockyFoot=seams.east*(.51+.27*Math.sin(x*.029+z*.017)**2);
  const withSnow=mixRGB(ground,[164,181,178],coldCover);
  const stony=mixRGB(withSnow,[159,148,121],thinSoil*.65);
  const coastal=mixRGB(stony,[110,110,101],rockyFoot);
  const target = mixRGB(coastal, colors.wetSoil, shore);
  const grain = 3.5 * Math.sin(x * .073 + z * .041) * Math.cos(z * .089);
  return original.map((v, i) => Math.round(blend(v, target[i] + grain, influence)));
}

export const geographyLegs = [
  {id: 'alpine', title: '青岚高山 → 鞍部 → 雪岭',
    view: [1145, -910, 242, 1350],
    text: '青岚峰群向西南降成山肩和鞍部，再抬升到雪岭。低坡有林木，高处过渡为矮草、碎石与雪岩。冰湖出水沿旧融水溪进入中央河源，继续流向海湾。'},
  {id: 'north', title: '北境海岸 → 冷坡 → 针阔混交林',
    view: [-910, -930, 55, 1110],
    text: '沿北部陆侧丘陵离开冰原，先经过冷坡的矮灌与疏林，再接入针阔混交坡面。岩层和扇面两支水从林地两侧下行，汇入中央河。'},
  {id: 'west', title: '西部盐盆 → 高原分水坡 → 雨林河口',
    view: [-1460, 396, 82, 1230],
    text: '盐盆低处有盐湖，周围较高的盆缘限制外泄。相邻高原水沿另一侧的下切溪谷进入雨林，淡水岸林再过渡到潮沟和红树林。'},
  {id: 'south', title: '雨林林缘 → 迎风丘陵 → 草原与砾地',
    view: [-470, 1090, 30, 1240],
    text: '西南海风迎着丘陵抬升，向东进入背风坡后水分逐步减少，乔灌混合转为疏林、草甸和砾地。北侧低地另受东南季风补充水汽，沿线能看到竹林和季风林。'},
  {id: 'dry', title: '干谷绿洲 → 砾石坡脚 → 风蚀地',
    view: [556, 1275, 30, 990],
    text: '绿洲仍依赖原有泉池示意，离开水边后很快转成干地。连续的缓坡和砾地接到雅丹，沟槽与残丘保留原本的方向。'},
  {id: 'east', title: '东部山前 → 火山岩坡 → 岩岸与外海',
    view: [1556, 293, 22, 1430],
    text: '山脚支脊降到火山外围和沿海岩丘，陆面随岸坡落到海平面以下。外海沿大陆架、大陆坡走向深海，火山与海沟仍各用原有的形成示意。'}
];

export {meltLines as snowHeadwaters};
