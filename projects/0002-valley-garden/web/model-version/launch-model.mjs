import { spawn, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const started=spawnSync(process.execPath,[resolve(root,'../launch.mjs'),'--no-browser'],{cwd:resolve(root,'..'),stdio:'inherit',windowsHide:true});
if(started.status!==0)process.exit(started.status||1);
const port=Number(process.env.PORT||4173),url=`http://127.0.0.1:${port}/model-version/`;
console.log(`模型资产版：${url}`);
if(!process.argv.includes('--no-browser')){
  const command=process.platform==='win32'?'cmd.exe':process.platform==='darwin'?'open':'xdg-open';
  const args=process.platform==='win32'?['/d','/c','start','',url]:[url];
  spawn(command,args,{detached:true,stdio:'ignore',windowsHide:true}).unref();
}
