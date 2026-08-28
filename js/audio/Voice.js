// Measured in-browser against p5.soundOut: one voice at attackLevel 1 peaks
// at ~0.84 at the master output during its attack.
export const FULL_SCALE_PEAK = 0.84;

// How many simultaneous notes stay clean. Voices sum linearly into the
// master, so without headroom a three-note chord measured 1.015 with 1.1%
// of samples clipped. Beyond this count p5's limiter takes over, which
// squashes rather than tears.
export const CLEAN_VOICES = 6;

// Per-voice gain keeping `cleanVoices` simultaneous notes under `ceiling` at
// the master. Never amplifies - a level above 1 would clip a single note.
export function headroomLevel(cleanVoices, ceiling = 0.9) {
  return Math.min(1, ceiling / (cleanVoices * FULL_SCALE_PEAK));
}

export const VOICE_LEVEL = headroomLevel(CLEAN_VOICES);

export class Voice {
  constructor() {
    this.env = new p5.Envelope();
    this.osc = new p5.Oscillator("sine");
    this.osc.amp(this.env);
    this.lastUsed = 0;
    this.token = 0;
    this.releaseTime = 0;
  }

  // p5.Envelope.play(unit, startTime, sustainTime) is unusable for this: its
  // body is triggerRelease(t, i + aTime + dTime + ~~n), and ~~n truncates the
  // sustain time to whole seconds, so a 0.5s note would floor to 0.
  noteOn(freq, waveType, adsr) {
    this.env.setADSR(
      adsr.attackTime, adsr.decayTime, adsr.sustainLevel, adsr.releaseTime
    );
    // setADSR's sustain is a ratio of this range, so scaling the attack level
    // scales the whole envelope and keeps the drawn ADSR shape intact.
    this.env.setRange(adsr.attackLevel * VOICE_LEVEL, adsr.releaseLevel);
    this.releaseTime = adsr.releaseTime;
    // Started per note rather than once at construction: a p5.Envelope
    // releases to a tiny non-zero floor, so sixteen idle oscillators sum to
    // a permanent ~-76dBFS hum that the FFT panel draws as a bar with
    // nothing playing. start() on an already-started oscillator swaps in a
    // fresh node, so this also covers a stolen voice.
    this.osc.start();
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
    // Stop once the release has finished, so the voice contributes exactly
    // nothing while idle. A voice stolen before this fires is unaffected:
    // noteOn's start() has already replaced the node this would silence.
    this.osc.stop(this.releaseTime + 0.05);
  }
}
