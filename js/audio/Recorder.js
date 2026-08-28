// Records what the master output is already playing. The point of tapping the
// live graph rather than rendering the score again offline is that there is
// only ever one synthesis: the file is what was heard, glides, envelopes and
// all, and cannot drift from it.
const BUFFER_SIZE = 4096;

class Recorder {
  constructor() {
    this.node = null;
    this.sink = null;
    this.chunks = [];
  }

  get running() {
    return this.node !== null;
  }

  start() {
    if (this.running) return;
    const ctx = getAudioContext();
    this.chunks = [];
    this.node = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
    this.node.onaudioprocess = (e) => {
      this.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    // A ScriptProcessorNode only runs while it reaches the destination, so it
    // is given a silent one of its own instead of being added to the mix.
    this.sink = ctx.createGain();
    this.sink.gain.value = 0;
    p5.soundOut.output.connect(this.node);
    this.node.connect(this.sink);
    this.sink.connect(ctx.destination);
  }

  stop() {
    if (!this.running) return { samples: new Float32Array(0), sampleRate: 44100 };
    const ctx = getAudioContext();
    p5.soundOut.output.disconnect(this.node);
    this.node.onaudioprocess = null;
    this.node.disconnect();
    this.sink.disconnect();
    this.node = null;
    this.sink = null;

    const total = this.chunks.reduce((sum, c) => sum + c.length, 0);
    const samples = new Float32Array(total);
    let at = 0;
    for (const chunk of this.chunks) {
      samples.set(chunk, at);
      at += chunk.length;
    }
    this.chunks = [];
    return { samples, sampleRate: ctx.sampleRate };
  }
}

export const recorder = new Recorder();
