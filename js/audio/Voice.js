import { VOICE, BUS } from "./presets.js";

export function detune(freq, cents) {
  return freq * Math.pow(2, cents / 1200);
}

export class Voice {
  constructor(destination, wobbleLfo) {
    this.env = new p5.Envelope();
    this.lastUsed = 0;

    if (wobbleLfo) {
      // Every voice taps the one shared LFO through its own gain stage, so
      // the whole texture drifts together (one oscillator) while each note
      // still gets a depth scaled to its own frequency (a shared AudioParam
      // amplitude can't do both at once - see noteOn).
      this.wobbleGain = new p5.Gain();
      this.wobbleGain.disconnect();
      // Deliberately NOT wobbleGain.setInput(wobbleLfo): p5.Gain.setInput
      // calls the source's own .connect(), and p5.Oscillator.connect()
      // routes through its internal equal-power stereo panner - at its
      // default center pan that applies a ~0.7071x (1/sqrt(2)) attenuation
      // p5's own freq() signal-argument branch avoids this by unwrapping
      // .output before connecting; do the same here by wiring the raw
      // native node directly, bypassing the panner.
      wobbleLfo.output.connect(this.wobbleGain.input);
      // p5.Gain's input stage also carries a hardcoded 0.5 trim
      // (input.gain.value = 0.5 in the vendored source) independent of
      // amp() - left alone, amp(depthHz) would only ever deliver half the
      // intended Hz deviation. Cancel that trim so amp() maps 1:1 to Hz.
      this.wobbleGain.input.gain.value = 1;
      this.wobbleGain.amp(0);
    }

    this.filter = new p5.LowPass();
    this.filter.freq(VOICE.filterCutoffHz);
    this.filter.res(VOICE.filterResonance);
    this.filter.disconnect();
    this.filter.connect(destination);

    this.oscs = VOICE.detuneCents.map(() => {
      const osc = new p5.Oscillator("sine");
      osc.disconnect();
      osc.amp(this.env);
      this.filter.process(osc);
      osc.start();
      return osc;
    });

    this.noise = new p5.Noise("pink");
    this.noise.disconnect();
    this.noiseGain = new p5.Gain();
    this.noiseGain.disconnect();
    this.noiseGain.amp(VOICE.noiseLevel);
    this.noiseGain.setInput(this.noise);
    this.noise.amp(this.env);
    this.filter.process(this.noiseGain);
    this.noise.start();
  }

  noteOn(freq, waveType, adsr) {
    this.env.setADSR(adsr.attackTime, adsr.decayTime, adsr.sustainLevel, adsr.releaseTime);
    this.env.setRange(adsr.attackLevel * VOICE.oscLevel, adsr.releaseLevel);
    this.oscs.forEach((osc, i) => {
      osc.setType(waveType);
      osc.freq(detune(freq, VOICE.detuneCents[i]));
    });

    if (this.wobbleGain && BUS.wobbleDepthCents > 0) {
      const depthHz = freq * (Math.pow(2, BUS.wobbleDepthCents / 1200) - 1);
      this.wobbleGain.amp(depthHz);
      this.oscs.forEach((osc) => osc.freq(this.wobbleGain));
    }

    this.env.play();
  }
}
