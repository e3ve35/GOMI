import { Score } from "../score/Score.js";
import { toNyquist, downloadText } from "../nyquist.js";
import { colorForWave } from "../config.js";
import { state } from "../state.js";
import { Scale, SCALES, midiName } from "../score/Scale.js";
import { remapRows } from "../score/Note.js";
import { audio } from "../audio/AudioEngine.js";

let createCanvasButton;
let slider;
let rootSelect;
let scaleSelect;
const buttons = [];

// Controls that stay hidden until a score exists. Collected at creation so
// create() cannot forget to reveal one.
const hiddenUntilScore = [];

// Everything playScore schedules, so it can be cancelled mid-run.
let scheduled = [];
let sounding = [];

function hideUntilScore(control) {
  control.hide();
  hiddenUntilScore.push(control);
  return control;
}

function transportButton(label, handler) {
  const button = createButton(label);
  button.mousePressed(handler);
  buttons.push(button);
  return hideUntilScore(button);
}

function transportSelect(addOptions, selected, handler) {
  const select = createSelect();
  addOptions(select);
  select.selected(selected);
  select.changed(handler);
  return hideUntilScore(select);
}

export function createTransport() {
  // ioi control slider
  slider = createSlider(5, 100, 50);
  state.logicalStopTime = slider.value() / 100;
  slider.input(() => {
    state.logicalStopTime = slider.value() / 100;
  });

  // wave type
  state.radio = createRadio();
  ["sine", "triangle", "sawtooth", "square"].forEach((w) => {
    // p5 wraps each option as <label><input><span>name</span></label>, so
    // colouring the label tints that one option's text. Every option carries
    // the colour its notes will take, rather than the whole row restating
    // the current selection.
    state.radio.option(w).parentElement.style.color = colorForWave(w);
  });
  state.radio.selected("sine");
  hideUntilScore(state.radio);

  rootSelect = transportSelect(
    (sel) => {
      for (let midi = 48; midi < 60; midi++) sel.option(midiName(midi), midi);
    },
    "48", changeScale
  );

  scaleSelect = transportSelect(
    (sel) => {
      for (const name of Object.keys(SCALES)) sel.option(name);
    },
    "major", changeScale
  );

  createCanvasButton = createButton("click to create a score");
  createCanvasButton.mousePressed(create);

  [
    ["play", playScore],
    ["clear", clearCanvas],
    ["generate nyquist score", generateScore],
  ].forEach(([label, handler]) => transportButton(label, handler));
}

// Every absolutely positioned DOM control has to be moved when the window
// changes size - p5 positions them once at creation and never again.
export function layoutTransport(L) {
  slider.position(L.controls.sliderX, L.controls.y);
  state.radio.position(L.controls.radioX, L.controls.y);
  rootSelect.position(L.controls.rootX, L.controls.y);
  rootSelect.style("width", "56px");
  scaleSelect.position(L.controls.scaleX, L.controls.y);
  scaleSelect.style("width", "140px");
  createCanvasButton.position(L.w / 2 - 115, L.grid.y + L.grid.h / 2 - 20);
  buttons.forEach((button, i) => {
    const box = L.buttonAt(i);
    button.position(box.x, box.y);
    button.style("width", box.w + "px");
  });
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

// How much of a note the slide takes. Bending from the first instant leaves
// the note no pitch of its own to be heard at - what sounds is one long bend
// rather than a note going somewhere - so the note holds first. Half and half
// is short enough to register as a pitch and long enough to hear it leave.
const GLIDE_BEND = 1 / 2;

// The slide a note makes while it sounds: its own pitch for most of its
// length, then a bend landing on the target as the note ends. Timed to the
// note rather than to the gap before its target, so the whole slide is
// audible however far apart the two are.
export function glideFor(note, score, secondsPerCol) {
  if (!note.glideTo) return undefined;
  const sounding = note.length * secondsPerCol;
  return {
    freq: score.freqForRow(note.glideTo.row),
    hold: sounding * (1 - GLIDE_BEND),
    seconds: sounding * GLIDE_BEND,
  };
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
        const handle = audio.noteOn(
          score.freqForRow(note.row), note.waveType, glideFor(note, score, spc)
        );
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
  if (state.score) return;
  state.score = new Score(state.layout);
  createCanvasButton.hide();
  hiddenUntilScore.forEach((control) => control.show());
  layoutTransport(state.layout);
}

function clearCanvas() {
  stopPlayback();
  if (state.score) state.score.notes.length = 0;
}

function changeScale() {
  const score = state.score;
  if (!score) return;
  score.scale = new Scale(Number(rootSelect.value()), scaleSelect.value(), 3);
  score.refit();
  score.notes = remapRows(score.notes, score.scale.rowCount);
}

export function generateScore() {
  downloadText(
    toNyquist(state.score.notes, state.score.scale, state.logicalStopTime),
    "score.txt"
  );
}
