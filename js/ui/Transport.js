import { Score } from "../score/Score.js";
import { toNyquist, downloadText, downloadBlob } from "../nyquist.js";
import { colorForWave } from "../config.js";
import { state } from "../state.js";
import { Scale, SCALES, midiName } from "../score/Scale.js";
import { remapRows } from "../score/Note.js";
import { audio } from "../audio/AudioEngine.js";
import { recorder } from "../audio/Recorder.js";
import { encodeWav, fadeOut } from "../audio/wav.js";

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

// The export button, kept so its label can report what it is doing, and a
// flag the transport checks before starting anything that would be recorded.
let exportButton;
let exporting = false;

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
    ["export wav", exportWav],
    ["generate nyquist score", generateScore],
  ].forEach(([label, handler]) => transportButton(label, handler));
  exportButton = buttons[2];
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

// The least of a glide that is the bend itself. Two notes written side by
// side leave no gap to slide across, and a tie with no bend in it is not a
// glide at all, so the bend takes half of even the shortest one.
const GLIDE_BEND = 1 / 2;

// How long a note sounds. A glide ties it to the note it leads into: it holds
// until that note begins, so the further apart the two are dragged, the
// longer the slide between them.
export function soundingSeconds(note, secondsPerCol) {
  const cols = note.glideTo ? note.glideTo.startCol - note.startCol : note.length;
  return cols * secondsPerCol;
}

// The slide a note makes while it sounds: its own pitch first, then a bend
// landing on the target as that note begins. The note's drawn length says
// where the bend starts, so lengthening a note delays its slide - except
// where the two sit too close for that to leave a bend worth hearing.
export function glideFor(note, score, secondsPerCol) {
  if (!note.glideTo) return undefined;
  const tied = soundingSeconds(note, secondsPerCol);
  const bend = Math.max(tied - note.length * secondsPerCol, tied * GLIDE_BEND);
  return {
    freq: score.freqForRow(note.glideTo.row),
    hold: tied - bend,
    seconds: bend,
  };
}

export function playScore() {
  const score = state.score;
  if (!score || state.playing || exporting) return;
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
          }, soundingSeconds(note, spc) * 1000)
        );
      }, note.startCol * spc * 1000)
    );
  }

  scheduled.push(
    setTimeout(stopPlayback, scoreDurationSeconds(score.notes, spc) * 1000)
  );
}

// How long a recording has to run to hold the whole score: every note, plus
// the release of the last one, which sounds after playback has stopped.
export function exportSeconds(notes, secondsPerCol, releaseTime) {
  if (notes.length === 0) return 0;
  return scoreDurationSeconds(notes, secondsPerCol) + releaseTime + 0.2;
}

// Recorded rather than rendered a second time: the file is the same graph
// that was heard, so it costs the length of the piece and plays while it runs.
function exportWav() {
  const score = state.score;
  if (!score || exporting || state.playing || score.notes.length === 0) return;

  const seconds = exportSeconds(score.notes, state.logicalStopTime, audio.releaseTime());
  audio.resume();
  recorder.start();
  // Started before the flag is raised: playScore refuses to run while an
  // export is in progress, and this is the one call that has to get through.
  playScore();
  exporting = true;
  exportButton.html("recording...");

  setTimeout(() => {
    const { samples, sampleRate } = recorder.stop();
    exporting = false;
    exportButton.html("export wav");
    if (!samples.length) return;
    downloadBlob(
      new Blob([encodeWav(fadeOut(samples, sampleRate), sampleRate)], { type: "audio/wav" }),
      "gomi.wav"
    );
  }, seconds * 1000);
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
