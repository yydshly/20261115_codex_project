import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mainlineLessons} from '../web/mainline-lessons.js';

const args=process.argv.slice(2),chapter=args.find(arg=>arg.startsWith('--chapter='))?.slice(10);
if(args.some(arg=>!arg.startsWith('--chapter=')))throw new Error('Use --chapter=<id> to generate one stop.');
const key=process.env.MINIMAX_API_KEY?.trim();
const model=process.env.MINIMAX_TTS_MODEL??'speech-2.8-hd';
const voice=process.env.MINIMAX_TTS_VOICE??'audiobook_male_1';
if(!key)throw new Error('Set MINIMAX_API_KEY in the process environment first.');
const selected=chapter?mainlineLessons.filter(lesson=>lesson.id===chapter):mainlineLessons;
if(!selected.length)throw new Error('Unknown chapter id.');
const directory=fileURLToPath(new URL('../web/assets/mainline/',import.meta.url));
mkdirSync(directory,{recursive:true});
const manifestPath=join(directory,'minimax.json');
const clips=existsSync(manifestPath)?JSON.parse(readFileSync(manifestPath,'utf8')).clips:{};

async function minimaxAudio(text){
  const host=process.env.MINIMAX_REGION==='global'?'api.minimax.io':'api.minimaxi.com';
  const url=new URL('https://'+host+'/v1/t2a_v2');
  const group=process.env.MINIMAX_GROUP_ID;
  if(group)url.searchParams.set('GroupId',group);
  const response=await fetch(url,{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(45000),
    headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify({
      model,text,stream:false,output_format:'hex',language_boost:'Chinese',
      voice_setting:{voice_id:voice,speed:.96,vol:1,pitch:0},
      audio_setting:{sample_rate:32000,bitrate:64000,format:'mp3',channel:1}
    })
  });
  if(!response.ok)throw new Error('MiniMax HTTP '+response.status);
  const payload=await response.json(),code=payload.base_resp?.status_code,hex=payload.data?.audio;
  if(code!==0)throw new Error('MiniMax status code '+String(code));
  if(typeof hex!=='string'||hex.length%2||!/^[a-f0-9]{400,}$/i.test(hex))throw new Error('MiniMax returned no valid audio.');
  return Buffer.from(hex,'hex');
}

function writeAtomic(path,data){
  const pending=path+'.'+process.pid+'.tmp';
  try{
    writeFileSync(pending,data);
    renameSync(pending,path);
  }finally{rmSync(pending,{force:true});}
}

const settings=[model,voice,.96,32000,64000];
for(const {id,script} of selected){
  const transcript=createHash('sha256').update(script).digest('hex');
  const hash=createHash('sha256').update(JSON.stringify(['minimax',settings,transcript])).digest('hex').slice(0,12);
  const file=`${id}-${hash}.mp3`,path=join(directory,file);
  if(!existsSync(path)){
    const audio=await minimaxAudio(script);
    if(audio.length<200)throw new Error(id+' audio is incomplete.');
    writeAtomic(path,audio);
  }
  clips[id]={file,transcript};
  writeAtomic(manifestPath,JSON.stringify({provider:'minimax',model,voice,clips},null,2)+'\n');
  console.log(id+' · '+file);
}
