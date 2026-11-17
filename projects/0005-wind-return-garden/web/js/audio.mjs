export class GardenAudio {
  constructor() { this.enabled = false; this.ctx = null; }
  async toggle() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain(); this.master.gain.value = 0; this.master.connect(this.ctx.destination);
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 3, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) { last = (last + Math.random() * .03 - .015) / 1.02; data[i] = last; }
      const noise = this.ctx.createBufferSource(); noise.buffer = buffer; noise.loop = true;
      const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 750;
      this.wind = this.ctx.createGain(); this.wind.gain.value = .45;
      noise.connect(filter).connect(this.wind).connect(this.master); noise.start();
      const rainBuffer=this.ctx.createBuffer(1,this.ctx.sampleRate*3,this.ctx.sampleRate),rainData=rainBuffer.getChannelData(0);
      for(let i=0;i<rainData.length;i++)rainData[i]=(Math.random()*2-1)*.15;
      const rainSource=this.ctx.createBufferSource();rainSource.buffer=rainBuffer;rainSource.loop=true;
      const rainFilter=this.ctx.createBiquadFilter();rainFilter.type='lowpass';rainFilter.frequency.value=1600;
      this.rain=this.ctx.createGain();this.rain.gain.value=0;rainSource.connect(rainFilter).connect(this.rain).connect(this.master);rainSource.start();
    }
    await this.ctx.resume(); this.enabled = !this.enabled;
    this.master.gain.setTargetAtTime(this.enabled ? .35 : 0, this.ctx.currentTime, .2);
    return this.enabled;
  }
  chime(pitch = 659.25) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    for (const [multiple, amp] of [[1, .24], [2.76, .065], [4.1, .02]]) {
      const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
      osc.frequency.value = pitch * multiple;
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(amp, t + .015); gain.gain.exponentialRampToValueAtTime(.0001, t + 3);
      osc.connect(gain).connect(this.master); osc.start(t); osc.stop(t + 3.1);
    }
  }
  setWind(energy) { if (this.enabled) this.wind.gain.setTargetAtTime(.2 + energy * .65, this.ctx.currentTime, .5); }
  setEnvironment(energy,env,inside){
    if(!this.enabled)return;
    this.wind.gain.setTargetAtTime((.2+energy*.65)*(inside ? .24 : 1),this.ctx.currentTime,.7);
    this.rain.gain.setTargetAtTime(env.rain*(inside ? .32 : 1)*.6,this.ctx.currentTime,.8);
  }
}
