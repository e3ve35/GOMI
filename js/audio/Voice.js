import { VOICE } from "./presets.js";

export function detune(freq, cents) {
  return freq * Math.pow(2, cents / 1200);
}

export class Voice {
  constructor(destination) {
    this.env = new p5.Envelope();
    this.lastUsed = 0;

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
    this.env.play();
  }
}
