import { createVehicleAudio } from './vehicle-audio.js';

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const unit = (n) => clamp(n, 0, 1);

function makeNoise(context) {
  const buffer = context.createBuffer(1, context.sampleRate * 11, context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x7cc313ad;
  for (let i = 0; i < data.length; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    data[i] = (seed >>> 0) / 2147483648 - 1;
  }
  return buffer;
}

function smoothParam(context, param, initial, seconds) {
  param.value = initial;
  let previous = initial;
  return (value) => {
    if (value === previous) return;
    previous = value;
    param.setTargetAtTime(value, context.currentTime, seconds);
  };
}

function noiseVoice(context, buffer, output, highPass, offset, response = 0.14) {
  const player = context.createBufferSource();
  const low = context.createBiquadFilter();
  low.type = 'highpass';
  low.frequency.value = highPass;
  low.Q.value = 0.6;
  const high = context.createBiquadFilter();
  high.type = 'lowpass';
  high.Q.value = 0.65;
  const gain = context.createGain();
  const pan = typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
  const level = smoothParam(context, gain.gain, 0, response);
  const cutoff = smoothParam(context, high.frequency, 1200, 0.23);
  const position = pan && smoothParam(context, pan.pan, 0, 0.24);
  player.buffer = buffer;
  player.loop = true;
  player.connect(low).connect(high).connect(gain);
  if (pan) gain.connect(pan).connect(output);
  else gain.connect(output);
  player.start(0, offset);
  return (volume, frequency, stereo) => {
    level(volume);
    cutoff(frequency);
    position?.(stereo);
  };
}

function makeMix(context) {
  const noise = makeNoise(context);
  const sum = context.createGain();
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 14;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.012;
  compressor.release.value = 0.24;
  const master = context.createGain();
  const setMaster = smoothParam(context, master.gain, 0, 0.028);
  sum.connect(compressor).connect(master).connect(context.destination);

  const current = noiseVoice(context, noise, sum, 185, 0.38);
  const lap = noiseVoice(context, noise, sum, 600, 2.76, 0.09);
  const spray = noiseVoice(context, noise, sum, 510, 5.57);
  const breeze = noiseVoice(context, noise, sum, 100, 8.18, 0.23);
  const vehicle = createVehicleAudio(context, sum, noise);

  function update({mode, speed = 0, waterDistance = 4, waterPan = 0, engine = null,
    enginePan = 0, engineLevel = 0, throttle = 0, interior = false, duck = 1}) {
    const time = context.currentTime;
    const airborne = mode === 'flight';
    const afloat = mode === 'tour' || mode === 'boat';
    const breezePulse = 0.69+0.19*Math.sin(time*0.43+0.8)+0.12*Math.sin(time*1.03+1.7);
    const swell = 0.67+0.19*Math.sin(time*1.36)+0.14*Math.sin(time*2.31+2.4);
    const splash = Math.max(0,Math.sin(time*2.82+1.18)*0.55+Math.sin(time*4.39-0.6)*0.45)**2;
    const river = airborne ? 0 : 1/(1+(waterDistance/8.5)**1.42);
    const movement = Math.sqrt(unit(Math.abs(speed)/(mode === 'boat' ? 21.5 : 8)));
    const wash = afloat ? movement : 0;
    const rush = airborne ? unit(speed/56) : wash*(mode === 'boat' ? 0.52 : 0.20);
    const cabin = airborne && interior;

    current(duck*river*(0.078+0.062*swell),1500+540*swell,waterPan*0.77);
    lap(duck*river*(0.17+0.075*Number(afloat))*splash,2780+swell*960,waterPan*0.62);
    spray(duck*wash*(0.13+0.078*throttle)*(0.81+0.19*swell),1690+wash*2200,enginePan*0.60);
    const airLevel = cabin ? 0.035+rush*0.105 : 0.043+rush*0.22;
    const airCutoff = cabin ? 420+rush*690 : 1160+breezePulse*870+rush*2280;
    breeze(duck*airLevel*breezePulse,airCutoff,0.11*Math.sin(time*0.37));
    vehicle.update({kind:engine,throttle,speed,interior,pan:enginePan,level:engineLevel*duck});
  }

  return {context,setMaster,update};
}

export function createSceneAudio(onStateChange) {
  const Audio = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  let available = typeof Audio === 'function';
  let enabled = false;
  let visible = true;
  let mix;
  let latest;
  let pending = false;
  let suspendTimer;
  let suspending = false;
  let status;

  function notify() {
    const next = !available ? 'unavailable' : !enabled ? 'off'
      : !visible || mix?.context.state === 'running' ? 'on' : pending ? 'starting' : 'off';
    if (next === status) return;
    status = next;
    onStateChange(next);
  }

  function syncOutput() {
    clearTimeout(suspendTimer);
    if (mix) {
      const { context, setMaster } = mix;
      const audible = enabled && visible;
      if (audible && latest && context.state === 'running') mix.update(latest);
      setMaster(audible ? 0.88 : 0);
      if (!audible && context.state === 'running' && !suspending) {
        suspendTimer = setTimeout(() => {
          if (enabled && visible) return;
          suspending = true;
          context.suspend().catch(() => {}).finally(() => {
            suspending = false;
            if (enabled && visible) resume();
            else notify();
          });
        }, 170);
      }
    }
    notify();
  }

  function resume() {
    if (!mix || !enabled || !visible || pending || suspending || mix.context.state === 'running') return;
    pending = true;
    notify();
    mix.context.resume().catch(() => {}).finally(() => {
      pending = false;
      syncOutput();
    });
  }

  function toggle() {
    if (!available) return;
    if (enabled && (status === 'on' || pending)) {
      enabled = false;
    } else {
      enabled = true;
      if (!mix || mix.context.state === 'closed') {
        let context;
        try {
          context = new Audio();
          mix = makeMix(context);
          context.onstatechange = syncOutput;
        } catch {
          context?.close().catch(() => {});
          available = false;
          enabled = false;
        }
      }
      resume();
    }
    syncOutput();
  }

  notify();
  return {
    get enabled() { return enabled; },
    toggle,
    setVisible(next) {
      visible = next;
      resume();
      syncOutput();
    },
    update(frame) {
      latest = frame;
      if (enabled && visible && mix?.context.state === 'running') mix.update(frame);
    },
  };
}
