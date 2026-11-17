import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { get } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root=dirname(fileURLToPath(import.meta.url)),port=Number(process.env.PORT||4173);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('PORT must be an integer between 1024 and 65535.');
const url=`http://127.0.0.1:${port}`,statePath=resolve(root,'.local/server.json');
function health(){return new Promise(resolveResult=>{
  const request=get(`${url}/__health`,res=>{let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>{try{resolveResult(JSON.parse(body));}catch{resolveResult({app:'other'});}});});
  request.on('error',()=>resolveResult(null));request.setTimeout(700,()=>{request.destroy();resolveResult(null);});
});}
if(process.argv.includes('--stop')){
  const saved=await readFile(statePath,'utf8').then(JSON.parse).catch(()=>null),live=await health();
  if(saved&&live?.app==='valley-garden'&&live.pid===saved.pid&&live.runId===saved.runId){process.kill(saved.pid);console.log('Valley Garden stopped.');}
  else console.log('No matching owned server to stop.');
}else{
  try{await access(resolve(root,'node_modules/three/build/three.module.js'));}
  catch{
    console.log('Installing the pinned Three.js dependency…');
    if(process.platform==='win32')execFileSync('cmd.exe',['/d','/c','npm.cmd ci --ignore-scripts --no-audit --no-fund'],{cwd:root,stdio:'inherit',windowsHide:true});
    else execFileSync('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],{cwd:root,stdio:'inherit'});
  }
  let live=await health();
  if(live&&live.app!=='valley-garden')throw new Error(`Port ${port} is in use by another application. Choose a different PORT.`);
  if(!live){
    const runId=randomUUID();
    const child=spawn(process.execPath,[resolve(root,'server.mjs')],{cwd:root,detached:true,stdio:'ignore',windowsHide:true,env:{...process.env,PORT:String(port),VALLEY_GARDEN_RUN_ID:runId}});child.unref();
    await mkdir(dirname(statePath),{recursive:true});await writeFile(statePath,JSON.stringify({pid:child.pid,runId,port}));
    for(let i=0;i<30;i++){live=await health();if(live?.app==='valley-garden')break;await new Promise(r=>setTimeout(r,200));}
    if(live?.app!=='valley-garden')throw new Error('The preview server did not start. Run npm start to inspect the error.');
  }
  console.log(`溪谷花园已就绪：${url}/`);
  if(!process.argv.includes('--no-browser')){
    const command=process.platform==='win32'?'cmd.exe':process.platform==='darwin'?'open':'xdg-open';
    const args=process.platform==='win32'?['/d','/c','start','',`${url}/`]:[`${url}/`];
    spawn(command,args,{detached:true,stdio:'ignore',windowsHide:true}).unref();
  }
}
