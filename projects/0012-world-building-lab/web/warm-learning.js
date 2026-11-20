import {WARM_SITES,WARM_STAGES} from './warm-layout.js';import {walkingSurface,LARGE_WORLD} from './large-world.js';import {borealView} from './boreal-learning.js';export {WARM_STAGES};
const lessons=[
 ['竹林先依附连续丘坡，林缘的竹丛较疏，保留林外到林内的空间过渡。','黄绿土底、竹叶样碎片与少量裸地分开出现，不把地形高度当作覆盖材质。','成丛细竹秆具有实体圆柱、可辨认的竹节和上部窄叶簇，与乔木树冠区分。','低矮蕨形植物和叶屑填补根部，主线两侧保持净空；不含真实竹种、生长或地下根茎。'],
 ['沿同一缓坡进入更密的竹林，细小起伏仍能从竹秆根部读出。','土底和竹叶样覆盖连续贴地，叶屑不悬浮在坡面上。','密集秆体、节环和多层叶簇围出林内通道；竹秆实际阻挡通行。','从地面到竹秆、再到叶簇形成连续竖向空间；当前没有竹秆弯曲、风力或砍伐。'],
 ['丘地继续下降，季风密林与竹林共用同一地形骨架和连续路线。','较暗腐殖样覆盖和阔叶碎片承接乔木，不额外制造重复地面。','高大分叉树干与宽阔叠冠形成湿润冠层样本，林下保留蕨形植物。','树干、冠层、低灌和地被共同围合；湿润仅是创作参考，没有真实降雨、气候带或物种竞争。'],
 ['同一缓坡来到较干、较开敞的季风林样本，两段为空间对照，不是时间推演。','较暖的落叶覆盖与裸土空隙增加，表现较干地面差异。','树木较矮、较疏，部分枝条露出，黄绿冠层和开放天空形成对比。','林下覆盖降低、落叶样覆盖增加；没有自动落叶、旱季水分胁迫或物候过程。'],
 ['丘坡向海岸下降，前缘沙丘、较低海滩与零米海面之间具有真实地形高差。','浅色干沙、深色湿滩与水下砂底沿实际岸线展开，海面使用原世界零米水位。','临海沙坡只放少量低矮沙生草形态，滩缘与水中不种密林。','两道沙脊、滩面和稀疏草丛构成海岸空间；尚无海浪、潮汐、风成搬运或沙丘迁移。'],
 ['从前缘回到较宽缓的背风沙丘，比较两道沙脊和低鞍部。','沙粒样色带与细小表面起伏附着同一沙丘，不能把它们当作真实颗粒动力。','背风侧增加草簇与低灌形态，植被覆盖率高于临海前缘；植株根部采用实际地面。','沙丘、灌草斑块、裸沙和远处海面形成完整环境；不含真实耐盐物种、固沙过程或植被演替。']
];
export const warmStops=WARM_SITES.map((r,i)=>({...r,lead:['从倒木林地以教学镜头转场来到竹林林缘，沿丘坡开始新的环境横断面。','沿清晰通道走进竹林，比较竹秆、节环与叶簇的竖向层次。','继续沿缓坡走入季风密林，看阔叶林冠怎样承接同一地面。','来到较干疏林样本，比较树高、密度、冠层和地表留白。','沿丘坡走向临海前缘沙丘，远望沙脊、湿滩与海面。','回到背风沙丘，观察灌草、低鞍部和裸沙怎样共同成景。'][i],next:i===5?'竹林、季风林与海岸沙丘六站完成，可对照同一地形上的覆盖与植被分层。':'沿同一片连续地形前行，比较地表和植被如何变化。'}));
export const warmPoint=(x,z)=>({x,z,y:walkingSurface(x,z),warm:true,underground:false,survey:false});
export function warmView(i){const r=warmStops[i];return {...r,...warmPoint(r.x,r.z),y:walkingSurface(r.x,r.z)+LARGE_WORLD.eye};}
export function warmPath(t){const f=Math.max(0,Math.min(1,t))*5,i=Math.min(4,Math.floor(f)),u=f-i,a=warmStops[i],b=warmStops[i+1];return {...warmPoint(a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u),t};}
export function warmApproach(t){const a=borealView(3),b=warmView(0),u=Math.max(0,Math.min(1,t)),x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u;return {x,z,y:Math.max((a.y-1.72)*(1-u)+(b.y-1.72)*u+Math.sin(Math.PI*u)*1000,walkingSurface(x,z)+Math.sin(Math.PI*u)*12),warm:true,survey:true,transfer:true,underground:false};}
export function warmObservation(i,s){const r=warmStops[i];return {id:`build-${r.id}:${s}`,index:i,stage:s,title:r.terrain+' · '+WARM_STAGES[s],prompt:r.lead,explanation:lessons[i][s],reuse:['先用地形连续性组织丘地、缓坡、沙脊与海岸。','把土、落叶、干沙、湿滩与水位作为附着层。','通过竹秆、乔木冠形、密度和灌草高度建立群落。','补齐林下、地被与留白；真实生态过程另行设计。'][s]};}
