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
  cellHeight: 16,
  dotSize: 7,
  xRatio: 0.04,
  wRatio: 0.95,
};

export const LAYOUT = {
  fftX: 0.65, fftY: 500, fftWidth: 200, fftHeight: 150,
  ampX: 0.1, ampY: 0.81, ampRadius: 80,
  envX: 0.25, envY: 0.677, envWidth: 350, envHeight: 150,
  radioX: 1090, radioY: 470,
  // Same row as the wave-type radio and ABOVE the FFT panel (y 500-650 at
  // x 926-1126): p5 renders DOM controls over the canvas, so placing these
  // lower would cover the spectrum bars.
  rootX: 760, rootY: 470,
  scaleX: 870, scaleY: 470,
  sliderX: 40, sliderY: 462,
};

export function colorForWave(waveType) {
  return COLORS[waveType] ?? COLORS.sine;
}
