import { COLORS, LAYOUT } from "../config.js";

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
}

// I completed part of this function following this tutorial
// https://www.youtube.com/watch?v=2O3nm0Nvbi4&ab_channel=TheCodingTrain
function drawSpectrum() {
  push();
  translate(width * LAYOUT.fftX, LAYOUT.fftY);

  var spectrum = fft.analyze();
  noStroke();
  fill(0, 255, 0);
  var fftWidth = LAYOUT.fftWidth;
  var fftHeight = LAYOUT.fftHeight;

  for (var i = 0; i < spectrum.length; i++) {
    var x = map(i, 0, spectrum.length, 0, fftWidth);
    var h = map(spectrum[i], 0, 255, fftHeight, 0);
    rect(x, fftHeight, fftWidth / spectrum.length, h);
  }

  noStroke();
  fill(0, 0, 0);
  textSize(12);
  text("frequency", fftWidth - 40, fftHeight + 10);
  pop();
}

// I completed part of this function following this tutorial
//www.youtube.com/watch?v=h_aTgOl9J5I&list=PLRqwX-V7Uu6aFcVjlDAkkGIixw70s7jpW&index=10&ab_channel=TheCodingTrain
function drawAmplitude() {
  amphistory.push(amp.getLevel());
  push();
  translate(width * LAYOUT.ampX, height * LAYOUT.ampY);
  push();
  noStroke();
  fill(COLORS.content);
  text("amplitude", 0, 0);
  pop();

  stroke(COLORS.content);
  noFill();
  beginShape();
  for (let i = 0; i < 360; i++) {
    let r = map(amphistory[i], 0, 1, LAYOUT.ampRadius, 0);
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
