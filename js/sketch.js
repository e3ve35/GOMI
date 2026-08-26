import { Score } from "./score/Score.js";
import { EnvelopePanel } from "./ui/EnvelopePanel.js";
import { state } from "./state.js";

var amp;
var fft;
var playButton;
var createCanvasButton;
var generateScoreButton;
var clearButton;
var amphistory = [];
var slider;
var fftWidth;
var fftHeight;

/** global score information */
export var notes = {
  d5: 73,
  c5: 72,
  b4: 71,
  "a#4": 70,
  a4: 69,
  "g#4": 68,
  g4: 67,
  "f#4": 66,
  f4: 65,
  "e#4": 64,
  "d#4": 63,
  d4: 62,
  "c#4": 61,
  c4: 60,
};

/** styles */
var backgroundColor = 0;
export var contentColor = 255;

/** assets */
var myFont;
var pianoNote;
export var sineColor = "#FFFFFF";
export var triangleColor = "#68A357";
export var sawtoothColor = "#5FB49C";
export var squareColor = "#414288";

export function preload() {
  myFont = loadFont("Share_Tech_Mono/ShareTechMono-Regular.ttf");
}

export function setup() {
  // create an interface to change frequency, waveform, etc.
  let myCanvas = createCanvas(1425, 738);
  print(width, height);
  myCanvas.id("my-score");
  angleMode(DEGREES);

  // ioi control slider
  slider = createSlider(0, 100, 50);
  slider.position(40, 390);

  // drop down menu
  state.radio = createRadio();
  state.radio.option("sine");
  state.radio.option("triangle");
  state.radio.option("sawtooth");
  state.radio.option("square");
  state.radio.selected("sine");
  state.radio.position(1090, 400);
  state.radio.style("color", "white");
  state.radio.style("background-color", sineColor + "50");
  state.radio.changed(changeRadio);
  state.radio.hide();

  // create button
  createCanvasButton = createButton("click to create a score");
  createCanvasButton.mousePressed(create);
  createCanvasButton.position(width / 2 - 100, height * 0.3);

  // play button
  var buttonX = width - 260;
  playButton = createButton("play");
  playButton.mousePressed(playScore);
  playButton.position(buttonX, height * 0.66);
  playButton.hide();

  // clear button
  clearButton = createButton("clear");
  clearButton.mousePressed(clearCanvas);
  clearButton.position(buttonX, height * 0.74);
  clearButton.hide();

  // generate score button
  generateScoreButton = createButton("generate nyquist score");
  generateScoreButton.mousePressed(generateScore);
  generateScoreButton.position(buttonX, height * 0.82);
  generateScoreButton.hide();

  // fft and amp
  fft = new p5.FFT(0, 32);
  amp = new p5.Amplitude();

  // style
  textFont(myFont);
  textSize(15);
  textAlign(CENTER, CENTER);

  state.envelopePanel = new EnvelopePanel(width * 0.25, height * 0.65, 350, 170);
}

export function draw() {
  state.logicalStopTime = slider.value() / 100;
  background(backgroundColor);
  drawText();
  drawScore();
  drawADSR();
  // visualizeAmplitude();
  visualizeAmplitudeCircle();
  visualizeFFT();
}

// I completed part of this function following this tutorial
// https://www.youtube.com/watch?v=2O3nm0Nvbi4&ab_channel=TheCodingTrain
function visualizeFFT() {
  push();
  translate(width * 0.65, 310);

  var spectrum = fft.analyze();
  noStroke();
  fill(0, 255, 0);
  fftWidth = 200;
  fftHeight = 170;

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

function drawText() {
  push();
  noStroke();
  textSize(20);
  fill(contentColor);
  text("Graphical Online Music Interface", width / 2, 50);
  textSize(12);
  textAlign(LEFT);
  text("logical-stop-time: " + slider.value() / 100, 90, 383);
  if (!state.score) {
    rectMode(CENTER);
    fill(contentColor, 20);
    rect(width / 2, 230, width * 0.95, 280);
  }
  pop();
}

function drawADSR() {
  state.envelopePanel.drawSelf();
}

function drawScore() {
  if (state.score) {
    state.score.drawSelf();
  }
}

// I completed part of this function following this tutorial
//www.youtube.com/watch?v=h_aTgOl9J5I&list=PLRqwX-V7Uu6aFcVjlDAkkGIixw70s7jpW&index=10&ab_channel=TheCodingTrain
function visualizeAmplitudeCircle() {
  amphistory.push(amp.getLevel());
  push();
  translate(width * 0.1, height * 0.75);
  push();
  noStroke();
  fill(contentColor);
  text("amplitude", 0, 0);
  pop();

  stroke(contentColor);
  noFill();
  beginShape();
  for (let i = 0; i < 360; i++) {
    let r = map(amphistory[i], 0, 1, 100, 0);
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

function playScore() {
  // console.log(playing);
  if (state.score && !state.playing) {
    state.playing = true;
    // Schedule the notes
    state.selectedCells.forEach((cell) => {
      setTimeout(() => {
        cell.play();
        cell.playing = true;
        setTimeout(() => {
          cell.playing = false;
        }, state.logicalStopTime * 1000);
      }, cell.col * state.logicalStopTime * 1000);
    });
    setTimeout(() => {
      state.playing = false;
    }, state.selectedCells.length * state.logicalStopTime * 1000);
  }
}

function create() {
  // console.log("clicked");
  if (!state.score) {
    state.score = new Score(100);
    createCanvasButton.hide();
    state.radio.show();
    playButton.show();
    clearButton.show();
    generateScoreButton.show();
  }
}

function clearCanvas() {
  for (let i = 0; i < state.selectedCells.length; i++) {
    state.selectedCells[i].selected = false;
  }
  state.selectedCells.splice(0, state.selectedCells.length);
}

function changeRadio() {
  if (state.radio.value() == "sine") {
    state.radio.style("background-color", sineColor + "50");
  } else if (state.radio.value() == "triangle") {
    state.radio.style("background-color", triangleColor + "50");
  } else if (state.radio.value() == "sawtooth") {
    state.radio.style("background-color", sawtoothColor + "50");
  } else if (state.radio.value() == "square") {
    state.radio.style("background-color", squareColor + "50");
  }
}

function generateScore() {
  let fileName = "score.txt";
  let fileContent = "{\n";

  // construct the score in nyquist format
  // {0 1 {note pitch: c2}}
  for (let i = state.selectedCells.length - 1; i >= 0; i--) {
    let startTime = state.selectedCells[i].col * state.logicalStopTime;
    let dur = state.logicalStopTime;
    let instr = state.selectedCells[i].waveType + "-instr";
    let pitch = notes[state.score.notes[state.selectedCells[i].row]];
    fileContent += ` {${startTime.toFixed(
      2
    )} ${dur} {${instr} pitch: ${pitch}}} \n`;
  }

  fileContent += "}";

  let fileBlob = new Blob([fileContent], { type: "text/plain" });
  let fileUrl = URL.createObjectURL(fileBlob);
  let link = document.createElement("a");
  link.download = fileName;
  link.href = fileUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(fileUrl);
}
