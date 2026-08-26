export const VOICE = {
  detuneCents: [0], // Task 6 widens this to [0, -7, 5]
  filterCutoffHz: 20000, // Task 6 lowers this
  filterResonance: 1,
  noiseLevel: 0, // Task 6 raises this
  oscLevel: 0.25,
};

export const BUS = {
  lowpassHz: 20000,
  distortionAmount: 0,
  delayTimeSec: 0,
  delayFeedback: 0,
  delayFilterHz: 2000,
  reverbSeconds: 0.01,
  reverbDecay: 0.1,
  reverbDryWet: 0,
  crackleLevel: 0,
  wobbleRateHz: 0,
  wobbleDepthCents: 0,
  outputVolume: 0.6,
};
