import { Score } from "../score/Score.js";
import { toNyquist, downloadText } from "../nyquist.js";
import { COLORS, GRID, LAYOUT, colorForWave } from "../config.js";
import { state } from "../state.js";
import { Scale, SCALES, midiName } from "../score/Scale.js";
import { remapRows } from "../score/Note.js";
import { audio } from "../audio/AudioEngine.js";

let playButton;
let createCanvasButton;
let generateScoreButton;
let clearButton;
let slider;
let rootSelect;
let scaleSelect;

// Everything playScore schedules, so it can be cancelled mid-run.
let scheduled = [];
let sounding = [];

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

  // root and scale selectors
  rootSelect = createSelect();
  for (let midi = 48; midi < 60; midi++) rootSelect.option(midiName(midi), midi);
  rootSelect.selected("48");
  rootSelect.position(LAYOUT.rootX, LAYOUT.rootY);
  rootSelect.changed(changeScale);
  rootSelect.hide();

  scaleSelect = createSelect();
  for (const name of Object.keys(SCALES)) scaleSelect.option(name);
  scaleSelect.selected("major");
  scaleSelect.position(LAYOUT.scaleX, LAYOUT.scaleY);
  scaleSelect.changed(changeScale);
  scaleSelect.hide();

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

export function stopPlayback() {
  scheduled.forEach(clearTimeout);
  scheduled = [];
  sounding.forEach((handle) => audio.noteOff(handle));
  sounding = [];
  if (state.score) for (const note of state.score.notes) note.playing = false;
  state.playing = false;
}

export function playScore() {
  const score = state.score;
  if (!score || state.playing) return;
  state.playing = true;
  const spc = state.logicalStopTime;

  for (const note of score.notes) {
    scheduled.push(
      setTimeout(() => {
        // The note may have been deleted between scheduling and firing.
        if (!score.notes.includes(note)) return;
        const handle = audio.noteOn(score.freqForRow(note.row), note.waveType);
        sounding.push(handle);
        note.playing = true;
        scheduled.push(
          setTimeout(() => {
            audio.noteOff(handle);
            const i = sounding.indexOf(handle);
            if (i !== -1) sounding.splice(i, 1);
            note.playing = false;
          }, note.length * spc * 1000)
        );
      }, note.startCol * spc * 1000)
    );
  }

  scheduled.push(
    setTimeout(stopPlayback, scoreDurationSeconds(score.notes, spc) * 1000)
  );
}

function create() {
  if (!state.score) {
    state.score = new Score(GRID.topY);
    createCanvasButton.hide();
    state.radio.show();
    rootSelect.show();
    scaleSelect.show();
    playButton.show();
    clearButton.show();
    generateScoreButton.show();
  }
}

function clearCanvas() {
  stopPlayback();
  if (state.score) state.score.notes.length = 0;
}

function changeScale() {
  const score = state.score;
  if (!score) return;
  score.scale = new Scale(Number(rootSelect.value()), scaleSelect.value(), 3);
  score.notes = remapRows(score.notes, score.scale.rowCount);
}

function changeRadio() {
  state.radio.style("background-color", colorForWave(state.radio.value()) + "50");
}

export function generateScore() {
  downloadText(
    toNyquist(state.score.notes, state.score.scale, state.logicalStopTime),
    "score.txt"
  );
}
