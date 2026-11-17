// Original synthesized ambience: no external recordings, network requests or autoplay.
import { actorSoundMixAt } from './actor-footsteps.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/** Closest audible reach of the curved stream, in world metres. */
export function ambienceMixAt(position,{riverX,riverWidth,right={x:1,z:0},indoors=false,evening=0}){
  let distance=Infinity,dx=0,dz=0,reachZ=position.z;
  for(let offset=-48;offset<=48;offset+=3){
    const z=position.z+offset,x=riverX(z),d=Math.hypot(x-position.x,z-position.z);
    if(d<distance){distance=d;dx=x-position.x;dz=z-position.z;reachZ=z;}
  }
  const bankDistance=Math.max(0,distance-riverWidth(reachZ));
  const shelter=indoors?.28:1;
  return {river:(.025+.63/(1+(bankDistance/7)**1.7))*shelter,
    wind:(.10+clamp(position.y-2,0,20)*.002)*shelter,
    birds:(.70-.35*clamp(evening,0,1))*(indoors?.38:1),
    pan:clamp((dx*right.x+dz*right.z)/Math.max(7,distance),-.82,.82),bankDistance};
}

export function createAmbience({riverX,riverWidth,isIndoors=()=>false}){
  const context=new (window.AudioContext||window.webkitAudioContext)();
  const master=context.createGain();master.gain.value=0;master.connect(context.destination);
  const river=context.createGain(),wind=context.createGain(),birds=context.createGain(),steps=context.createGain();
  river.gain.value=wind.gain.value=0;birds.gain.value=.7;
  const riverPan=context.createStereoPanner(),windPan=context.createStereoPanner(),stepMeter=context.createAnalyser();stepMeter.fftSize=256;
  river.connect(riverPan).connect(master);wind.connect(windPan).connect(master);birds.connect(master);steps.connect(stepMeter).connect(master);
  const meterSamples=new Float32Array(256);
  const actorMeters={},actorStats={};
  for(const kind of ['human','cow']){
    const meter=context.createAnalyser();meter.fftSize=256;meter.connect(master);
    actorMeters[kind]={meter,samples:new Float32Array(256)};
    actorStats[kind]={played:0,culled:0,distance:0,gain:0,pan:0,maxPeak:0,recentPeak:0};
  }
  let lastMeterTime=0;
  const sources=[],voices=new Set();let enabled=false,visible=!document.hidden,disposed=false,nextBird=0,mix,lastWind=null,stepCount=0,lastSurface=null,maxFootPeak=0;
  // Shared noise buffer, with its final segment crossfaded into the first to hide the seam.
  const count=context.sampleRate*9,buffer=context.createBuffer(1,count,context.sampleRate),samples=buffer.getChannelData(0);
  let last=0;
  for(let i=0;i<count;i++){last=(last+.025*(Math.random()*2-1))/1.025;samples[i]=last*5;}
  const fade=Math.floor(context.sampleRate*.25);
  for(let i=0;i<fade;i++){const t=i/(fade-1);samples[count-fade+i]=samples[count-fade+i]*(1-t)+samples[i]*t;}
  function bed(output,type,frequency,q,level,offset){
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
    source.buffer=buffer;source.loop=true;source.loopStart=fade/context.sampleRate;source.loopEnd=9;
    filter.type=type;filter.frequency.value=frequency;filter.Q.value=q;gain.gain.value=level;
    source.connect(filter).connect(gain).connect(output);source.start(0,offset);sources.push(source);return {filter,gain};
  }
  bed(river,'highpass',120,.45,.85,0);
  const ripple=bed(river,'bandpass',780,.8,.40,2.7);
  const breeze=bed(wind,'bandpass',520,.45,1,4.1);
  bed(wind,'highpass',1000,.45,.18,6.2);
  const footNoise=context.createBuffer(1,Math.floor(context.sampleRate*.32),context.sampleRate),footSamples=footNoise.getChannelData(0);
  for(let i=0;i<footSamples.length;i++)footSamples[i]=(Math.random()*2-1)*.5;
  const footTypes={
    stone:{duration:.10,filter:'highpass',frequency:550,noise:.30,body:118,weight:.13},
    wood:{duration:.15,filter:'bandpass',frequency:1150,noise:.40,body:145,weight:.17},
    grass:{duration:.17,filter:'lowpass',frequency:1650,noise:.36,body:68,weight:.14},
    soil:{duration:.15,filter:'lowpass',frequency:2600,noise:.40,body:82,weight:.13},
    gravel:{duration:.19,filter:'highpass',frequency:850,noise:.38,body:95,weight:.12}
  };
  function impact(event,preset,{output=steps,gain=1,panValue=event.side*.09,cutoff=null,hoof=false}={}){
    const t=context.currentTime,variation=.92+Math.random()*.16,effort=hoof?.9:.72+Math.min(event.speed,6.3)*.055;
    const pan=context.createStereoPanner();pan.pan.value=panValue;
    const spatialNodes=[];
    if(cutoff!==null){const lowpass=context.createBiquadFilter(),level=context.createGain();lowpass.type='lowpass';lowpass.frequency.value=cutoff;level.gain.value=gain;pan.connect(lowpass).connect(level).connect(output);spatialNodes.push(lowpass,level);}
    else pan.connect(output);
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),envelope=context.createGain();source.buffer=footNoise;source.playbackRate.value=variation;
    filter.type=preset.filter;filter.frequency.value=preset.frequency*variation;filter.Q.value=.65;
    envelope.gain.setValueAtTime(0,t);envelope.gain.linearRampToValueAtTime(preset.noise*effort,t+.007);envelope.gain.exponentialRampToValueAtTime(.0001,t+preset.duration);
    source.connect(filter).connect(envelope).connect(pan);source.start(t,.02+Math.random()*.05);source.stop(t+preset.duration+.01);
    const body=context.createOscillator(),weight=context.createGain();body.type='triangle';body.frequency.setValueAtTime(preset.body*variation,t);body.frequency.exponentialRampToValueAtTime(preset.body*.57,t+.07);
    weight.gain.setValueAtTime(0,t);weight.gain.linearRampToValueAtTime(preset.weight*effort,t+.004);
    if(hoof){weight.gain.exponentialRampToValueAtTime(preset.weight*effort*.26,t+.022);weight.gain.linearRampToValueAtTime(preset.weight*effort*.42,t+.029);}
    weight.gain.exponentialRampToValueAtTime(.0001,t+.085);
    body.connect(weight).connect(pan);body.start(t);body.stop(t+.10);voices.add(source);voices.add(body);let remaining=2;
    const finish=(voice,nodes)=>{voice.disconnect();nodes.forEach(n=>n.disconnect());voices.delete(voice);if(--remaining===0){pan.disconnect();spatialNodes.forEach(n=>n.disconnect());}};
    source.onended=()=>finish(source,[filter,envelope]);body.onended=()=>finish(body,[weight]);
  }
  function footstep(event){
    if(!enabled||!visible||context.state!=='running')return;
    impact(event,footTypes[event.surface]||footTypes.grass);stepCount++;lastSurface=event.surface;
  }
  function actorFootstep(event,camera){
    if(!enabled||!visible||context.state!=='running')return;
    const kind=event.kind,stats=actorStats[kind];if(!stats)return;
    const m=camera.matrixWorld.elements,spatial=actorSoundMixAt(event.position,camera.position,{x:m[0],z:m[2]},isIndoors(camera.position));
    Object.assign(stats,{distance:spatial.distance,gain:spatial.gain,pan:spatial.pan,surface:event.surface});
    if(spatial.gain<.002){stats.culled++;return;}
    const hard=['stone','gravel','wood'].includes(event.surface);
    const preset=kind==='cow'?{duration:.16,filter:hard?'bandpass':'lowpass',frequency:hard?1550:950,noise:hard?.33:.22,body:hard?102:58,weight:.23}:(footTypes[event.surface]||footTypes.grass);
    impact(event,preset,{output:actorMeters[kind].meter,gain:spatial.gain*(kind==='human'?.8:1.08),panValue:spatial.pan,cutoff:spatial.cutoff,hoof:kind==='cow'});stats.played++;
  }
  function birdCall(now){
    const pan=context.createStereoPanner();pan.pan.value=(Math.random()-.5)*1.5;pan.connect(birds);
    const notes=2+Math.floor(Math.random()*3),base=2450+Math.random()*950;
    let remaining=notes;
    for(let i=0;i<notes;i++){
      const voice=context.createOscillator(),gain=context.createGain(),t=now+i*.19;
      voice.type='sine';voice.frequency.setValueAtTime(base*(1+i*.035),t);
      voice.frequency.exponentialRampToValueAtTime(base*1.32,t+.045);
      voice.frequency.exponentialRampToValueAtTime(base*.9,t+.12);
      gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.035,t+.018);gain.gain.exponentialRampToValueAtTime(.0001,t+.14);
      voice.connect(gain).connect(pan);voice.start(t);voice.stop(t+.16);voices.add(voice);
      voice.onended=()=>{voice.disconnect();gain.disconnect();voices.delete(voice);if(--remaining===0)pan.disconnect();};
    }
  }
  function silenceVoices(){for(const voice of voices){try{voice.stop();}catch{}}}
  async function sync(){
    if(disposed)return;
    if(enabled&&visible){await context.resume();master.gain.setTargetAtTime(.13,context.currentTime,.35);nextBird=context.currentTime+3+Math.random()*4;}
    else {master.gain.cancelScheduledValues(context.currentTime);master.gain.setValueAtTime(0,context.currentTime);silenceVoices();await context.suspend();}
  }
  return {context,
    async setEnabled(value){enabled=value;try{await sync();}catch(error){enabled=false;throw error;}},
    setVisible(value){visible=value;return sync();},
    footstep,actorFootstep,
    update(camera,evening=0,windState={strength:.4,direction:{x:1,z:0}}){
      const t=context.currentTime,m=camera.matrixWorld.elements;
      mix=ambienceMixAt(camera.position,{riverX,riverWidth,right:{x:m[0],z:m[2]},indoors:isIndoors(camera.position),evening});
      lastWind=windState;
      river.gain.setTargetAtTime(mix.river,t,.7);wind.gain.setTargetAtTime(mix.wind*1.9*windState.strength,t,.12);
      windPan.pan.setTargetAtTime((windState.direction.x*m[0]+windState.direction.z*m[2])*.25,t,.4);
      birds.gain.setTargetAtTime(mix.birds,t,1);riverPan.pan.setTargetAtTime(mix.pan,t,.4);
      ripple.filter.frequency.setTargetAtTime(740+180*Math.sin(t*.37),t,.7);breeze.filter.frequency.setTargetAtTime(400+windState.strength*650,t,.18);
      if(enabled&&visible&&context.state==='running'&&t>=nextBird){nextBird=t+8+Math.random()*15;birdCall(t+.05);}
    },
    inspect(){let footPeak=0;if(enabled&&context.state==='running'){stepMeter.getFloatTimeDomainData(meterSamples);for(const sample of meterSamples)footPeak=Math.max(footPeak,Math.abs(sample));maxFootPeak=Math.max(maxFootPeak,footPeak);}
      const decay=Math.exp(-Math.max(0,context.currentTime-lastMeterTime)/.7);lastMeterTime=context.currentTime;
      for(const [kind,{meter,samples}]of Object.entries(actorMeters)){let peak=0;if(enabled&&context.state==='running'){meter.getFloatTimeDomainData(samples);for(const sample of samples)peak=Math.max(peak,Math.abs(sample));}const stats=actorStats[kind];stats.maxPeak=Math.max(stats.maxPeak,peak);stats.recentPeak=enabled&&context.state==='running'?Math.max(peak,stats.recentPeak*decay):0;}
      return {state:context.state,enabled,visible,activeVoices:voices.size,footsteps:stepCount,lastSurface,footPeak,maxFootPeak,actors:Object.fromEntries(Object.entries(actorStats).map(([kind,stats])=>[kind,{...stats}])),windStrength:lastWind?.strength,windGain:wind.gain.value,...mix};},
    dispose(){disposed=true;sources.forEach(source=>source.stop());silenceVoices();return context.close();}
  };
}
