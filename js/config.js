export const COLORS = {
  background: 0,
  content: 255,
  sine: "#FFFFFF",
  triangle: "#68A357",
  sawtooth: "#5FB49C",
  square: "#414288",
  cell: [171, 169, 200, 150],
  // The drag hint. Faint enough to read as an affordance rather than content;
  // the chevron is brighter so the direction registers at a glance.
  ghost: [255, 255, 255, 38],
  ghostTip: [255, 255, 255, 110],
};

export const GRID = {
  cellWidth: 20,
  dotSize: 7,
  // How far the drag hint reaches when there is room for it.
  ghostColumns: 3,
  hoverScale: 1.6,
  // Row height is derived from the available height, within these bounds.
  minCellHeight: 12,
  maxCellHeight: 24,
};

// One spacing scale for the whole page. Everything below is derived from it,
// so the layout holds together at any window size rather than only at the
// 1425x738 the canvas used to be hardcoded to.
export const SPACING = {
  pad: 26,
  gap: 22,
  headerH: 58,
  controlsH: 30,
  panelH: 170,
  labelW: 34, // room for the row labels drawn left of the grid
  ampW: 170,
  fftW: 230,
  buttonsW: 250,
  buttonH: 40,
  buttonGap: 12,
  // Below this the layout stops shrinking and the page scrolls instead, which
  // is a deliberate floor rather than letting the panels collapse into each other.
  minW: 1180,
  minH: 640,
};

export function computeLayout(w, h) {
  const S = SPACING;
  w = Math.max(Math.round(w), S.minW);
  h = Math.max(Math.round(h), S.minH);

  // Bottom up: panels sit on the floor, the control row above them, and the
  // grid takes whatever height is left.
  const panelY = h - S.pad - S.panelH;
  const controlsY = panelY - S.controlsH - S.gap;
  const gridY = S.headerH;

  const grid = {
    x: S.pad + S.labelW,
    y: gridY,
    w: w - 2 * S.pad - S.labelW,
    h: controlsY - S.gap - gridY,
  };

  // Three panels of different natural shapes - a circle, a curve with its own
  // slider column, a spectrum - sharing one baseline and equal gutters. The
  // envelope absorbs the slack so it always has room for its controls.
  const envW = w - 2 * S.pad - S.ampW - S.fftW - S.buttonsW - 3 * S.gap;

  const amp = { x: S.pad, y: panelY, w: S.ampW, h: S.panelH };
  const env = { x: amp.x + amp.w + S.gap, y: panelY, w: envW, h: S.panelH };
  const fft = { x: env.x + env.w + S.gap, y: panelY, w: S.fftW, h: S.panelH };
  const buttons = { x: fft.x + fft.w + S.gap, y: panelY, w: S.buttonsW, h: S.panelH };

  env.graphW = Math.round(env.w * 0.5);
  env.sliderX = env.x + env.graphW + 20;
  env.labelX = env.sliderX + 58;

  // Measured against the rendered controls; the visual pass pins these
  // widths in CSS so they stop being estimates.
  const radioW = 315;
  const scaleW = 140;
  const rootW = 52;
  const radioX = w - S.pad - radioW;
  const scaleX = radioX - S.gap - scaleW;
  const rootX = scaleX - 10 - rootW;

  return {
    w,
    h,
    titleY: Math.round(S.headerH / 2),
    grid,
    amp,
    env,
    fft,
    buttons,
    captionY: panelY - 10,
    controls: {
      y: controlsY,
      sliderX: S.pad,
      labelX: S.pad + 62,
      rootX,
      scaleX,
      radioX,
    },
    buttonAt: (i) => ({
      x: buttons.x,
      y: buttons.y + i * (S.buttonH + S.buttonGap),
      w: buttons.w,
      h: S.buttonH,
    }),
  };
}

export function colorForWave(waveType) {
  return COLORS[waveType] ?? COLORS.sine;
}
