import { Voice } from "./Voice.js";

const POOL_SIZE = 16;

class AudioEngine {
  constructor() {
    this.voices = [];
    this.counter = 0;
    this.adsr = {
      attackTime: 0.1, decayTime: 0.2, sustainLevel: 0.5,
      releaseTime: 1, attackLevel: 1, releaseLevel: 0,
    };
  }

  init() {
    for (let i = 0; i < POOL_SIZE; i++) this.voices.push(new Voice());
  }

  resume() {
    const ctx = getAudioContext();
    if (ctx.state !== "running") ctx.resume();
  }

  setEnvelope(adsr) {
    this.adsr = adsr;
  }

  noteOn(freq, waveType) {
    this.resume();
    let oldest = this.voices[0];
    for (const v of this.voices) if (v.lastUsed < oldest.lastUsed) oldest = v;
    oldest.lastUsed = ++this.counter;
    return { voice: oldest, token: oldest.noteOn(freq, waveType, this.adsr) };
  }

  noteOff(handle) {
    if (handle) handle.voice.noteOff(handle.token);
  }

  voiceCount() {
    return this.voices.length;
  }
}

export const audio = new AudioEngine();
