import { Voice } from "./Voice.js";
import { BUS } from "./presets.js";

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
    outputVolume(BUS.outputVolume);
    this.destination = undefined; // p5 master
    for (let i = 0; i < POOL_SIZE; i++) this.voices.push(new Voice(this.destination));
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
    oldest.noteOn(freq, waveType, this.adsr);
  }

  voiceCount() {
    return this.voices.length;
  }
}

export const audio = new AudioEngine();
