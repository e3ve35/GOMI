import { Score } from "../score/Score.js";
import { toNyquist, downloadText } from "../nyquist.js";
import { COLORS, GRID, LAYOUT } from "../config.js";
import { state } from "../state.js";
import { audio } from "../audio/AudioEngine.js";

let playButton;
let createCanvasButton;
let generateScoreButton;
let clearButton;
let slider;

export function createTransport() {
  // ioi control slider
  slider = createSlider(5, 100, 50);
  slider.position(LAYOUT.sliderX, LAYOUT.sliderY);
  state.logicalStopTime = slider.value() / 100;
  slider.input(() => {
    state.logicalStopTime = slider.value() / 100;
  });

  // drop down menu
  state.radio = createRadio();
  state.radio.option("sine");
  state.radio.option("triangle");
  state.radio.option("sawtooth");
  state.radio.option("square");
  state.radio.selected("sine");
  state.radio.position(LAYOUT.radioX, LAYOUT.radioY);
  state.radio.style("color", "white");
  state.radio.style("background-color", COLORS.sine + "50");
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
}

export function scoreDurationSeconds(notes, secondsPerCol) {
  if (notes.length === 0) return 0;
  return Math.max(...notes.map((n) => n.endCol)) * secondsPerCol;
}

export function playScore() {
  const score = state.score;
  if (!score || state.playing) return;
  state.playing = true;
  const spc = state.logicalStopTime;
  for (const note of score.notes) {
    setTimeout(() => {
      const handle = audio.noteOn(score.freqForRow(note.row), note.waveType);
      note.playing = true;
      setTimeout(() => {
        audio.noteOff(handle);
        note.playing = false;
      }, note.length * spc * 1000);
    }, note.startCol * spc * 1000);
  }
  setTimeout(() => {
    state.playing = false;
  }, scoreDurationSeconds(score.notes, spc) * 1000);
}

function create() {
  if (!state.score) {
    state.score = new Score(GRID.topY);
    createCanvasButton.hide();
    state.radio.show();
    playButton.show();
    clearButton.show();
    generateScoreButton.show();
  }
}

function clearCanvas() {
  if (state.score) state.score.notes.length = 0;
}

function changeRadio() {
  state.radio.style("background-color", COLORS[state.radio.value()] + "50");
}

export function generateScore() {
  downloadText(
    toNyquist(state.score.notes, state.score.scale, state.logicalStopTime),
    "score.txt"
  );
}
