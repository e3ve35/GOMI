import { COLORS } from "../config.js";
import { state } from "../state.js";

let fft, amp;
const amphistory = [];

export function createVisualizers() {
  fft = new p5.FFT(0, 32);
  // The byte spectrum is scaled from minDecibels up, and the Web Audio
  // default of -100dBFS is far below anything this instrument can make
  // audible: a note at the lowest usable envelope still peaks tens of dB
  // above it. Raising the floor to -70 keeps every real note full-scale
  // while reading true silence - and any inaudible residual a stopped
  // voice leaves behind - as zero rather than a permanent low bar.
  fft.analyser.minDecibels = SPECTRUM_FLOOR_DB;
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

// Below this a bin reads as the analyser's own noise floor rather than
// anything audible, so it's drawn as silence instead of a stray sliver.
const SPECTRUM_NOISE_FLOOR = 3;

// Quietest level the panel treats as sound. See createVisualizers.
const SPECTRUM_FLOOR_DB = -70;

// I completed part of this function following this tutorial
// https://www.youtube.com/watch?v=2O3nm0Nvbi4&ab_channel=TheCodingTrain
function drawSpectrum() {
  const box = state.layout.fft;
  push();
  translate(box.x, box.y);

  var spectrum = fft.analyze();
  var fftWidth = box.w;
  var fftHeight = box.h;

  // A panel outline, matching the envelope's, so this corner has visible
  // structure even before there is a score - or while nothing is sounding.
  noStroke();
  fill(...COLORS.panel);
  rect(0, 0, fftWidth, fftHeight);

  fill(COLORS.spectrum);
  for (var i = 0; i < spectrum.length; i++) {
    if (spectrum[i] < SPECTRUM_NOISE_FLOOR) continue;
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
