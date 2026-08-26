import { Score } from "./score/Score.js";
import { handleMousePressed } from "./score/Cell.js";
import { EnvelopePanel } from "./ui/EnvelopePanel.js";
import { createTransport } from "./ui/Transport.js";
import { createVisualizers, drawVisualizers } from "./ui/Visualizers.js";
import { COLORS, LAYOUT } from "./config.js";
import { state } from "./state.js";

let myFont;

window.preload = function () {
  myFont = loadFont("Share_Tech_Mono/ShareTechMono-Regular.ttf");
};

window.setup = function () {
  createCanvas(1425, 738).id("my-score");
  angleMode(DEGREES);
  createTransport();
  createVisualizers();
  state.envelopePanel = new EnvelopePanel(
    width * LAYOUT.envX, height * LAYOUT.envY, LAYOUT.envWidth, LAYOUT.envHeight
  );
  textFont(myFont);
  textSize(15);
  textAlign(CENTER, CENTER);
};

window.draw = function () {
  background(COLORS.background);
  drawHeader();
  if (state.score) state.score.drawSelf();
  state.envelopePanel.drawSelf();
  drawVisualizers();
};

window.mousePressed = handleMousePressed;

function drawHeader() {
  push();
  noStroke();
  textSize(20);
  fill(COLORS.content);
  text("Graphical Online Music Interface", width / 2, 50);
  textSize(12);
  textAlign(LEFT);
  text("logical-stop-time: " + state.logicalStopTime, 90, 383);
  if (!state.score) {
    rectMode(CENTER);
    fill(COLORS.content, 20);
    rect(width / 2, 230, width * 0.95, 280);
  }
  pop();
}
