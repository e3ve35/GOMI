import {
  handleMousePressed,
  handleMouseDragged,
  handleMouseReleased,
} from "./score/interaction.js";
import { EnvelopePanel } from "./ui/EnvelopePanel.js";
import { createTransport, layoutTransport } from "./ui/Transport.js";
import { createVisualizers, drawVisualizers } from "./ui/Visualizers.js";
import { COLORS, SPACING, computeLayout } from "./config.js";
import { state } from "./state.js";
import { audio } from "./audio/AudioEngine.js";

let myFont;

window.preload = function () {
  myFont = loadFont("Share_Tech_Mono/ShareTechMono-Regular.ttf");
};

// Below the floor the canvas stops shrinking and the page scrolls, rather
// than the panels collapsing into one another.
// Read the viewport directly rather than p5's windowWidth/windowHeight: those
// are only refreshed inside p5's own resize listener, so they are stale for
// any other caller.
function canvasSize() {
  return [
    Math.max(window.innerWidth, SPACING.minW),
    Math.max(window.innerHeight, SPACING.minH),
  ];
}

window.setup = function () {
  const [w, h] = canvasSize();
  const myCanvas = createCanvas(w, h);
  myCanvas.id("my-score");
  // Capture the pointer for the duration of a drag. Without it a release
  // outside the browser window delivers no mouseup, p5 never fires
  // mouseReleased, and a held audition note sustains forever.
  myCanvas.elt.addEventListener("pointerdown", (e) => {
    try {
      myCanvas.elt.setPointerCapture(e.pointerId);
    } catch (err) {
      /* stale pointer id - the normal mouseup path still applies */
    }
  });
  angleMode(DEGREES);

  state.layout = computeLayout(width, height);
  audio.init();
  createTransport();
  createVisualizers();
  state.envelopePanel = new EnvelopePanel(state.layout.env);

  textFont(myFont);
  textSize(15);
  textAlign(CENTER, CENTER);
  applyLayout();
};

function reflow() {
  const [w, h] = canvasSize();
  if (w === width && h === height) return;
  resizeCanvas(w, h);
  applyLayout();
}

window.windowResized = reflow;

function applyLayout() {
  state.layout = computeLayout(width, height);
  if (state.score) state.score.applyLayout(state.layout);
  state.envelopePanel.applyLayout(state.layout.env);
  layoutTransport(state.layout);
}

window.draw = function () {
  background(COLORS.background);
  drawHeader();
  if (state.score) state.score.drawSelf();
  state.envelopePanel.drawSelf();
  audio.setEnvelope(state.envelopePanel.values());
  drawVisualizers();
};

window.mousePressed = handleMousePressed;
window.mouseDragged = handleMouseDragged;
window.mouseReleased = handleMouseReleased;

function drawHeader() {
  const L = state.layout;
  push();
  noStroke();
  textSize(20);
  textAlign(CENTER, CENTER);
  fill(COLORS.content);
  text("Graphical Online Music Interface", L.w / 2, L.titleY);
  textSize(12);
  textAlign(LEFT, CENTER);
  text("logical-stop-time: " + state.logicalStopTime, L.controls.labelX, L.controls.y + 8);
  if (!state.score) {
    rectMode(CORNER);
    fill(COLORS.content, 16);
    rect(L.grid.x - SPACING.labelW, L.grid.y, L.grid.w + SPACING.labelW, L.grid.h);
  }
  pop();
}
