/* Deterministic, local-only vector export using the same archived data as the UI. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const project=path.resolve(__dirname,'..'),context={window:{}};vm.createContext(context);
for(const name of ['data.js','explore-context.js'])vm.runInContext(fs.readFileSync(path.join(project,'web',name),'utf8'),context);
const result=context.window.RESEARCH_CONTEXT.build(context.window.RESEARCH,'overview');
let base=fs.readFileSync(path.join(project,'assets/research-map/canal-image-to-3d-architecture.svg'),'utf8');
base=base.replace('viewBox="0 0 1120 1040"',`viewBox="0 0 1120 ${result.height}"`);
base=base.replace('<svg ',`<svg width="1120" height="${result.height}" `);
const css='.graph-context-card{cursor:pointer}.graph-context-card:focus-visible>rect{stroke:#163e38;stroke-width:4}';
base=base.replace('</svg>',`<style>${css}</style><g id="research-knowledge"><rect x="0" y="1040" width="1120" height="${result.height-1040}" fill="#edf0e7"/>${result.markup}</g></svg>`);
base=base.replace('<title id="graph-title">','<title id="graph-title">流程、未通过复盘、已用技术与探索目录 · ');
const target=path.join(project,'assets/research-map/canal-image-to-3d-panorama.svg');fs.writeFileSync(target,base);
console.log(JSON.stringify({file:target,height:result.height,failures:context.window.RESEARCH_CONTEXT.failures.length,technologyGroups:context.window.RESEARCH_CONTEXT.technologies.length,catalog:context.window.RESEARCH.products.length}));
