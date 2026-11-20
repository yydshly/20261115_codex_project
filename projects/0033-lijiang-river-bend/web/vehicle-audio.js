const engineProfiles = {
  wood: {
    idle: 17, redline: 63, referenceSpeed: 7.2,
    // The unequal exhaust pulses give the little outboard an audible putter at low speed.
    pulses: [[0.03,1.0,0.047],[0.54,0.55,0.062]],
    bladeOrder: 1.44, body: 0.26, rattle: 0.12, blade: 0.047,
    rumble: 25, rattleCenter: 490, rattleSweep: 440,
    openCutoff: 1880, closedCutoff: 1470, flutter: 3.2, flutterDepth: 24,
    level: 0.49, interiorLevel: 0.94, interiorRattle: 0.88,
  },
  fast: {
    idle: 18, redline: 91, referenceSpeed: 21.5,
    pulses: [[0.02,1.0,0.027],[0.26,0.82,0.034],[0.51,0.95,0.029],[0.75,0.84,0.033]],
    bladeOrder: 1.56, body: 0.29, rattle: 0.18, blade: 0.066,
    rumble: 33, rattleCenter: 580, rattleSweep: 990,
    openCutoff: 2850, closedCutoff: 2160, flutter: 4.6, flutterDepth: 11,
    level: 0.62, interiorLevel: 0.94, interiorRattle: 0.86,
  },
  aircraft: {
    idle: 28, redline: 47.5, referenceSpeed: 60,
    pulses: [[0.04,0.86,0.039],[0.28,0.70,0.045],[0.54,0.83,0.040],[0.79,0.73,0.049]],
    bladeOrder: 2, body: 0.19, rattle: 0.20, blade: 0.16,
    rumble: 32, rattleCenter: 575, rattleSweep: 620,
    openCutoff: 2380, closedCutoff: 525, flutter: 3.7, flutterDepth: 9,
    level: 0.62, interiorLevel: 0.80, interiorRattle: 0.35,
  },
};

const clamp = (value, lower, upper) => Math.max(lower,Math.min(upper,value));
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;

function pulseWave(context, pulses) {
  const real = new Float32Array(24);
  const imag = new Float32Array(real.length);
  for (let harmonic = 1; harmonic < real.length; harmonic++) {
    for (const [timing,strength,width] of pulses) {
      const angle = harmonic*2*Math.PI*timing;
      const amplitude = strength*Math.exp(-0.5*(harmonic*2*Math.PI*width)**2);
      real[harmonic] += amplitude*Math.cos(angle);
      imag[harmonic] += amplitude*Math.sin(angle);
    }
  }
  return context.createPeriodicWave(real,imag);
}

function bladeWave(context) {
  const harmonics = new Float32Array([0,0.80,0.32,0.15,0,0.055]);
  return context.createPeriodicWave(new Float32Array(harmonics.length),harmonics);
}

function gainNode(context, amount) {
  const node = context.createGain();
  node.gain.value = amount;
  return node;
}

function filterNode(context, type, frequency, resonance) {
  const node = context.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = resonance;
  return node;
}

function createVoice(context, output, noiseBuffer, profile, bladeShape) {
  const gate = gainNode(context,0);
  const highpass = filterNode(context,'highpass',profile.rumble,0.71);
  const tone = filterNode(context,'lowpass',profile.openCutoff,0.71);
  const pan = typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
  highpass.connect(tone).connect(gate);
  if (pan) gate.connect(pan).connect(output);
  else gate.connect(output);

  const exhaust = context.createOscillator();
  exhaust.setPeriodicWave(pulseWave(context,profile.pulses));
  exhaust.frequency.value = profile.idle*0.5;
  const body = gainNode(context,profile.body);
  exhaust.connect(body).connect(highpass);

  const propeller = context.createOscillator();
  propeller.setPeriodicWave(bladeShape);
  propeller.frequency.value = profile.idle*profile.bladeOrder;
  const blade = gainNode(context,profile.blade);
  propeller.connect(blade).connect(highpass);

  const noise = context.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  const rasp = filterNode(context,'bandpass',profile.rattleCenter,0.77);
  const pulses = gainNode(context,0.61);
  const modulation = gainNode(context,0.32);
  const rattle = gainNode(context,profile.rattle);
  noise.connect(rasp).connect(pulses).connect(rattle).connect(highpass);
  exhaust.connect(modulation).connect(pulses.gain);

  // Use small shared detune so the firing and the prop still track the same motor speed.
  const flutter = context.createOscillator();
  flutter.frequency.value = profile.flutter;
  const drift = gainNode(context,profile.flutterDepth);
  flutter.connect(drift);
  drift.connect(exhaust.detune);
  drift.connect(propeller.detune);

  const now = context.currentTime;
  exhaust.start(now);
  propeller.start(now);
  flutter.start(now);
  noise.start(now,noiseBuffer.duration*((profile.idle*0.037)%1));

  const targets = new Map();
  function change(param, value, time, tolerance = 0.001) {
    const previous = targets.get(param);
    if (previous !== undefined && Math.abs(previous-value) <= tolerance) return;
    param.setTargetAtTime(value,context.currentTime,time);
    targets.set(param,value);
  }

  return {
    quiet() { change(gate.gain,0,0.105); },
    update(throttle, speed, interior, side, level) {
      const running = clamp(speed/profile.referenceSpeed,0,1);
      const load = throttle*0.79+running*0.21;
      const crank = profile.idle+(profile.redline-profile.idle)*Math.pow(load,0.80);
      change(exhaust.frequency,crank*0.5,0.115,0.045);
      change(propeller.frequency,crank*profile.bladeOrder,0.115,0.09);
      change(rasp.frequency,profile.rattleCenter+profile.rattleSweep*load,0.16,3.0);
      change(noise.playbackRate,0.68+load*0.71,0.16,0.012);
      change(body.gain,profile.body*(0.61+0.39*load),0.10);
      change(blade.gain,profile.blade*(0.26+0.74*Math.max(load,running)),0.12);
      change(rattle.gain,profile.rattle*(0.51+0.49*load)*(interior ? profile.interiorRattle : 1),0.12);
      change(drift.gain,profile.flutterDepth*(1.0-load*0.64),0.14,0.12);
      change(tone.frequency,(interior ? profile.closedCutoff : profile.openCutoff)*(0.77+0.23*load),0.14,4);
      if (pan) change(pan.pan,side*(interior ? 0.68 : 1),0.1,0.012);
      change(gate.gain,profile.level*level*(0.61+0.39*load)*(interior ? profile.interiorLevel : 1),0.105);
    },
  };
}

export function createVehicleAudio(context, output, noiseBuffer) {
  const voices = new Map();
  const bladeShape = bladeWave(context);
  let playing = null;

  return {
    update({ kind = null, throttle = 0, speed = 0, interior = false, pan = 0, level = 1, active = true } = {}) {
      level = clamp(finite(level,0),0,1);
      const profile = active && level > 0 && Object.hasOwn(engineProfiles,kind) ? engineProfiles[kind] : null;
      const selected = profile ? kind : null;
      if (playing !== selected) {
        voices.get(playing)?.quiet();
        playing = selected;
      }
      if (!profile) return;
      let voice = voices.get(kind);
      if (!voice) {
        voice = createVoice(context,output,noiseBuffer,profile,bladeShape);
        voices.set(kind,voice);
      }
      voice.update(clamp(finite(throttle,0),0,1),Math.abs(finite(speed,0)),Boolean(interior),
        clamp(finite(pan,0),-1,1),level);
    },
  };
}
