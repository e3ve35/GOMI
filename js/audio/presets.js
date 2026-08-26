// LEVEL DEFICIT (measured on the lofi-audio-engine branch tip, documentation
// only - do not "fix" by editing values here without a deliberate by-ear
// tuning pass):
//   A single A440 note peaks at 0.050 at master, versus 0.511 for the
//   pre-branch equivalent - the branch is ~10x (-20 dB) quieter per note.
//   This is the accumulated product of VOICE.oscLevel 0.25->0.18 (Tasks 5
//   and 6) and the effects chain's net ~0.122x (Task 7), only partly offset
//   by BUS.outputVolume 0.9.
// Headroom exists to close this without clipping: a full 16-voice chord
// only measures ~0.164 pre-volume, leaving roughly 4.3x of headroom before
// hitting 1.0 - well above the ~10x deficit found on a single note because
// notes rarely all peak in phase together.
// The right knob for a future fix is VOICE.oscLevel (0.18, toward ~0.7),
// NOT BUS.outputVolume: p5's protective limiter (threshold -3 dB, ratio 20)
// sits BEFORE outputVolume in the signal path, so pushing outputVolume
// above 1.0 would bypass p5's clip protection entirely rather than using it.
// Note: cancelling the MasterBus.js input gain trim (see MasterBus.js)
// already recovers 2x of this deficit on its own.
export const VOICE = {
  detuneCents: [0, -7, 5],
  filterCutoffHz: 1800,
  filterResonance: 3,
  // Routed through Voice.js's noiseGain (a p5.Gain feeding the noise source):
  // p5.Gain's constructor hardcodes input.gain.value = 0.5 and amp() never
  // touches it, and p5.Oscillator.connect() (which p5.Noise inherits) routes
  // through a centre-pan equal-power panner at 0.7071x. Net: the value
  // written here only ever delivers ~0.354x (0.5 * 0.7071) at the ear -
  // noiseLevel: 0.03 actually plays back at ~0.0106. Left uncancelled on
  // purpose (this level was measured and chosen as-is) - tune relative to
  // this scale, not the number written.
  noiseLevel: 0.03,
  oscLevel: 0.18,
};

export const BUS = {
  lowpassHz: 3200,
  // p5.Distortion maps amount through k = amount * 2000, and its curve's
  // small-signal gain is (3 + k) / 9 - NOT 1x at amount 0. Amount 0 (k=0)
  // still applies a fixed x/3 gain rather than bypassing the stage; there
  // is no true "off" value. Gain grows fast: amount 0.01 (k=20) is already
  // +8 dB, amount 0.04 (k=80) is +19 dB with visible hard peak-limiting
  // (curve saturates toward +-pi/9 as k grows). Measured sweep (Task 7 fix
  // round, see task-7-report.md): amount 0.002 (k=4, small-signal gain
  // 0.78x/-2.2dB) is the largest value where the idle noise floor
  // rises no more than ~2x versus amount 0 and peaks are not visibly
  // limited on a sustained note; 0.005 and up already exceed a 2x floor
  // rise. Tune by ear from here, not from 0 upward - amount is nonlinear.
  distortionAmount: 0.002,
  delayTimeSec: 0.28,
  delayFeedback: 0.35,
  delayFilterHz: 1600,
  reverbSeconds: 3.4,
  reverbDecay: 2.0,
  reverbDryWet: 0.45,
  // Same uncancelled p5.Gain input trim as VOICE.noiseLevel above, routed
  // through MasterBus.js's crackleGain: the value written here only ever
  // delivers ~0.354x (0.5 input trim * 0.7071 panner) at the ear -
  // crackleLevel: 0.015 actually plays back at ~0.0053. Left uncancelled on
  // purpose (measured and chosen as-is) - tune relative to this scale.
  crackleLevel: 0.015,
  wobbleRateHz: 0.7,
  wobbleDepthCents: 6,
  outputVolume: 0.9,
};
