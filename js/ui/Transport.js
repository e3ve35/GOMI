import { Score } from "../score/Score.js";
import { toNyquist, downloadText } from "../nyquist.js";
import { COLORS, GRID, LAYOUT, NOTES } from "../config.js";
import { state } from "../state.js";

let playButton;
let createCanvasButton;
let generateScoreButton;
let clearButton;
let slider;

export function createTransport() {
  // ioi control slider
  slider = createSlider(0, 100, 50);
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

export function playScore() {
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
  for (let i = 0; i < state.selectedCells.length; i++) {
    state.selectedCells[i].selected = false;
  }
  state.selectedCells.splice(0, state.selectedCells.length);
}

function changeRadio() {
  state.radio.style("background-color", COLORS[state.radio.value()] + "50");
}

export function generateScore() {
  const text = toNyquist(
    state.selectedCells,
    state.score.notes,
    NOTES,
    state.logicalStopTime
  );
  downloadText(text, "score.txt");
}
