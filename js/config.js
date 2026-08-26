export const NOTES = {
  d5: 73, c5: 72, b4: 71, "a#4": 70, a4: 69, "g#4": 68, g4: 67,
  "f#4": 66, f4: 65, "e#4": 64, "d#4": 63, d4: 62, "c#4": 61, c4: 60,
};

export const COLORS = {
  background: 0,
  content: 255,
  sine: "#FFFFFF",
  triangle: "#68A357",
  sawtooth: "#5FB49C",
  square: "#414288",
  cell: [171, 169, 200, 150],
};

export const GRID = {
  topY: 100,
  cellWidth: 20,
  cellHeight: 20,
  xRatio: 0.04,
  wRatio: 0.95,
};

export const LAYOUT = {
  fftX: 0.65, fftY: 500, fftWidth: 200, fftHeight: 150,
  ampX: 0.1, ampY: 0.81, ampRadius: 80,
  envX: 0.25, envY: 0.677, envWidth: 350, envHeight: 150,
  radioX: 1090, radioY: 470,
  sliderX: 40, sliderY: 462,
};

export function colorForWave(waveType) {
  return COLORS[waveType] ?? COLORS.sine;
}
