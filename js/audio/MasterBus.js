import { BUS } from "./presets.js";

export class MasterBus {
  constructor() {
    this.input = new p5.Gain();
    this.input.disconnect();

    this.lowpass = new p5.LowPass();
    this.lowpass.freq(BUS.lowpassHz);
    this.lowpass.res(1);

    this.distortion = new p5.Distortion(BUS.distortionAmount, "2x");

    this.delay = new p5.Delay();
    this.delay.delayTime(BUS.delayTimeSec);
    this.delay.feedback(BUS.delayFeedback);
    this.delay.filter(BUS.delayFilterHz);

    this.reverb = new p5.Reverb();
    this.reverb.set(BUS.reverbSeconds, BUS.reverbDecay);
    this.reverb.drywet(BUS.reverbDryWet);

    this.compressor = new p5.Compressor();

    // Every p5.Effect auto-connects itself straight to master on construction
    // (p5.Effect's own constructor calls this.connect() with no argument).
    // Left alone, that means lowpass/distortion/delay/reverb would each leak an
    // unprocessed copy of the signal directly to the speakers in parallel with
    // the intended series chain below, bypassing everything downstream of
    // themselves - including the compressor. Sever that default connection on
    // every stage except the last (compressor's default connection to master
    // *is* the chain's real output) before wiring them together in series.
    this.lowpass.disconnect();
    this.distortion.disconnect();
    this.delay.disconnect();
    this.reverb.disconnect();

    this.lowpass.process(this.input);
    this.lowpass.connect(this.distortion);

    // p5.Delay's feedback gain sits in series with its ENTIRE wet path, not
    // just the repeat loop - so delayFeedback: 0 (the "no echo" inert value)
    // silences the delay's first pass too, not only its repeats. Wiring the
    // delay strictly in series would mean the whole chain goes silent
    // whenever delayFeedback is 0. Route the dry signal around the delay in
    // parallel instead: the note always reaches the reverb, and the delay
    // only adds quiet repeats on top of it as feedback rises.
    this.distortion.connect(this.delay);
    this.distortion.connect(this.reverb);
    this.delay.connect(this.reverb);
    this.reverb.connect(this.compressor);

    this.crackle = new p5.Noise("pink");
    this.crackle.disconnect();
    this.crackleGain = new p5.Gain();
    this.crackleGain.disconnect();
    this.crackleGain.amp(BUS.crackleLevel);
    this.crackleGain.setInput(this.crackle);
    this.crackleFilter = new p5.LowPass();
    this.crackleFilter.freq(4000);
    this.crackleFilter.process(this.crackleGain);
    this.crackleFilter.disconnect();
    this.crackleFilter.connect(this.compressor);
    this.crackle.start();
  }
}
