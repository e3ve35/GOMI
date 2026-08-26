export const VOICE = {
  detuneCents: [0, -7, 5],
  filterCutoffHz: 1800,
  filterResonance: 3,
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
  crackleLevel: 0.015,
  wobbleRateHz: 0.7,
  wobbleDepthCents: 6,
  outputVolume: 0.9,
};
