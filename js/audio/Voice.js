export class Voice {
  constructor() {
    this.env = new p5.Envelope();
    this.osc = new p5.Oscillator("sine");
    this.osc.amp(this.env);
    this.osc.start();
    this.lastUsed = 0;
    this.token = 0;
  }

  // p5.Envelope.play(unit, startTime, sustainTime) is unusable for this: its
  // body is triggerRelease(t, i + aTime + dTime + ~~n), and ~~n truncates the
  // sustain time to whole seconds, so a 0.5s note would floor to 0.
  noteOn(freq, waveType, adsr) {
    this.env.setADSR(
      adsr.attackTime, adsr.decayTime, adsr.sustainLevel, adsr.releaseTime
    );
    this.env.setRange(adsr.attackLevel, adsr.releaseLevel);
    this.osc.setType(waveType);
    this.osc.freq(freq);
    this.env.triggerAttack();
    return ++this.token;
  }

  // A stolen voice must not be released by the note it replaced, so a
  // release only lands while its token is still the current one.
  noteOff(token) {
    if (token !== this.token) return;
    this.env.triggerRelease();
  }
}
