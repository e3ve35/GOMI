import { COLORS } from "../config.js";
import { state } from "../state.js";

let fft, amp;
const amphistory = [];

export function createVisualizers() {
  fft = new p5.FFT(0, 32);
  amp = new p5.Amplitude();
  amphistory.length = 0;
  for (let i = 0; i < 360; i++) amphistory.push(0);
}

export function drawVisualizers() {
  drawAmplitude();
  drawSpectrum();
  drawPanelCaptions();
}

// All three panel labels drawn together, so they share one baseline and one
// style instead of each panel captioning itself differently.
function drawPanelCaptions() {
  const L = state.layout;
  push();
  noStroke();
  fill(...COLORS.caption);
  textSize(11);
  textAlign(LEFT, BOTTOM);
  text("amplitude", L.amp.x, L.captionY);
  text("envelope", L.env.x, L.captionY);
  text("frequency", L.fft.x, L.captionY);
  pop();
}

// I completed part of this function following this tutorial
// https://www.youtube.com/watch?v=2O3nm0Nvbi4&ab_channel=TheCodingTrain
function drawSpectrum() {
  const box = state.layout.fft;
  push();
  translate(box.x, box.y);

  var spectrum = fft.analyze();
  noStroke();
  fill(COLORS.spectrum);
  var fftWidth = box.w;
  var fftHeight = box.h;

  for (var i = 0; i < spectrum.length; i++) {
    var x = map(i, 0, spectrum.length, 0, fftWidth);
    var h = map(spectrum[i], 0, 255, 0, fftHeight);
    rect(x, fftHeight - h, fftWidth / spectrum.length, h);
  }

  pop();
}

// I completed part of this function following this tutorial
//www.youtube.com/watch?v=h_aTgOl9J5I&list=PLRqwX-V7Uu6aFcVjlDAkkGIixw70s7jpW&index=10&ab_channel=TheCodingTrain
function drawAmplitude() {
  amphistory.push(amp.getLevel());
  push();
  const box = state.layout.amp;
  translate(box.x + box.w / 2, box.y + box.h / 2);
  stroke(COLORS.content);
  noFill();
  beginShape();
  for (let i = 0; i < 360; i++) {
    let r = map(amphistory[i], 0, 1, box.w / 2, 0);
    let x = r * cos(i);
    let y = r * sin(i);
    vertex(x, y);
  }
  endShape();
  if (amphistory.length > 360) {
    amphistory.splice(0, 1);
  }
  pop();
}
