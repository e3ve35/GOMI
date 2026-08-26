export class Voice {
  constructor() {
    this.env = new p5.Envelope();
    this.osc = new p5.Oscillator("sine");
    this.osc.amp(this.env);
    this.osc.start();
    this.lastUsed = 0;
  }

  noteOn(freq, waveType, adsr) {
    this.env.setADSR(
      adsr.attackTime, adsr.decayTime, adsr.sustainLevel, adsr.releaseTime
    );
    this.env.setRange(adsr.attackLevel, adsr.releaseLevel);
    this.osc.setType(waveType);
    this.osc.freq(freq);
    this.env.play();
  }
}
