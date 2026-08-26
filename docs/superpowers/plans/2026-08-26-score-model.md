# Score Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give GOMI notes that have a duration and rows that are scale degrees, so the grid can express a musical idea.

**Architecture:** A note stops being a grid cell and becomes its own object (`row`, `startCol`, `length`, `waveType`) owned by `Score.notes`. The 952-object `Cell` grid is deleted; hit testing becomes arithmetic. Pitch comes from a `Scale` object mapping `row -> midi`, so key and scale changes re-map every note losslessly.

**Tech Stack:** p5.js 1.6.0, p5.sound 1.0.1, vanilla ES modules. No build step, no package manager, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-26-score-model-design.md`

## Global Constraints

- No new dependencies. p5 and p5.sound are vendored in `lib/` and are the only libraries.
- ES modules throughout. `index.html` loads exactly one module entry point, `js/main.js`.
- p5 runs in global mode: `width`, `height`, `mouseX`, `rect`, `midiToFreq` etc. are globals inside draw/event code. Pure modules must not use them.
- Tests live in `tests.html` and run by opening it in a browser. Only pure functions are tested — no audio, no canvas.
- Row 0 is the **top** row and the **highest** pitch.
- Default scale: root C3 (MIDI 48), `major`, 3 octaves — 22 rows.
- `GRID.cellWidth` 20, `GRID.cellHeight` 16, `GRID.dotSize` 7.
- Dot centres sit at `(x + col*cellWidth, y + row*cellHeight)` — on grid-line intersections, not cell middles. All geometry follows this convention.

## How to run

- App: `python3 -m http.server 8899` from the repo root, then open `http://localhost:8899/index.html`
- Tests: same server, open `http://localhost:8899/tests.html`. The page prints `N passed, M failed`.

---

### Task 1: Revert the voice to main's plain oscillator

Restores main's sound: one oscillator, one envelope, straight to master.

**Files:**
- Modify: `js/audio/Voice.js` (full rewrite)
- Modify: `js/audio/AudioEngine.js:1-40`
- Delete: `js/audio/MasterBus.js`, `js/audio/presets.js`
- Modify: `tests.html` (drop the four `detune` tests and the `Voice.js` import)

**Interfaces:**
- Consumes: nothing
- Produces: `Voice` with `noteOn(freq, waveType, adsr)`; `audio.noteOn(freq, waveType)` unchanged in signature

- [ ] **Step 1: Rewrite `js/audio/Voice.js`**

```js
export class Voice {
  constructor() {
    this.env = new p5.Envelope();
    this.osc = new p5.Oscillator("sine");
    this.osc.amp(this.env);
    this.osc.start();
    this.lastUsed = 0;
  }

  noteOn(freq, waveType, adsr) {
    this.env.setADSR(
      adsr.attackTime, adsr.decayTime, adsr.sustainLevel, adsr.releaseTime
    );
    this.env.setRange(adsr.attackLevel, adsr.releaseLevel);
    this.osc.setType(waveType);
    this.osc.freq(freq);
    this.env.play();
  }
}
```

- [ ] **Step 2: Strip the bus out of `js/audio/AudioEngine.js`**

Replace the imports and `init()`. Everything else in the file stays.

```js
import { Voice } from "./Voice.js";

const POOL_SIZE = 16;
```

```js
  init() {
    for (let i = 0; i < POOL_SIZE; i++) this.voices.push(new Voice());
  }
```

Delete the `this.bus`, `this.destination`, and `this.wobbleLfo` blocks and the `outputVolume(...)` call. `p5.Oscillator` connects to master by default, so voices need no explicit destination.

- [ ] **Step 3: Delete the bus files**

```bash
git rm js/audio/MasterBus.js js/audio/presets.js
```

- [ ] **Step 4: Drop the detune tests from `tests.html`**

Remove the line `import { detune } from "./js/audio/Voice.js";` and all four `test("detune ...")` blocks. `detune` no longer exists.

- [ ] **Step 5: Run the tests**

Open `http://localhost:8899/tests.html`.
Expected: `9 passed, 0 failed` (12 minus the 4 removed detune tests, plus 1 — recount against what the page prints; the requirement is **0 failed**).

- [ ] **Step 6: Verify by ear**

Open the app, create a score, click a few dots. Expected: clean oscillator tones, no reverb tail, no crackle — main's sound.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Revert the voice to a single plain oscillator"
```

---

### Task 2: Move the visualizers down and fix the FFT rendering

Makes vertical room for a 22-row grid, and fixes the inverted spectrum draw.

**Files:**
- Modify: `js/config.js` (the `LAYOUT` object)
- Modify: `js/ui/Visualizers.js:28-32`
- Modify: `js/main.js` (the `logical-stop-time` label position)

**Interfaces:**
- Consumes: nothing
- Produces: `LAYOUT` with the visualizer band below y=470

- [ ] **Step 1: Update `LAYOUT` in `js/config.js`**

```js
export const LAYOUT = {
  fftX: 0.65, fftY: 500, fftWidth: 200, fftHeight: 150,
  ampX: 0.1, ampY: 0.81, ampRadius: 80,
  envX: 0.25, envY: 0.677, envWidth: 350, envHeight: 150,
  radioX: 1090, radioY: 470,
  sliderX: 40, sliderY: 462,
};
```

- [ ] **Step 2: Fix the spectrum bars in `js/ui/Visualizers.js`**

The current code maps silence to full height and then draws downward from the panel's bottom edge, producing a solid block 170px below the panel. Replace:

```js
    var h = map(spectrum[i], 0, 255, fftHeight, 0);
    rect(x, fftHeight, fftWidth / spectrum.length, h);
```

with:

```js
    var h = map(spectrum[i], 0, 255, 0, fftHeight);
    rect(x, fftHeight - h, fftWidth / spectrum.length, h);
```

- [ ] **Step 3: Move the slider label in `js/main.js`**

In `drawHeader`, the label sits at y=383, which will be inside the grid once it grows. Change:

```js
  text("logical-stop-time: " + state.logicalStopTime, 90, 383);
```

to:

```js
  text("logical-stop-time: " + state.logicalStopTime, 90, LAYOUT.sliderY - 7);
```

- [ ] **Step 4: Verify visually**

Open the app. Expected: with nothing playing the FFT panel is **black, not solid green**. Play a note and bars rise from the panel's bottom edge. Nothing overlaps the grid.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Move visualizers below the grid and fix inverted FFT bars"
```

---

### Task 3: The Scale module

Pure `row -> midi` mapping. This is what makes key changes lossless, and it removes the hand-written note table where MIDI 64 was labelled `e#4` and 73 was labelled `d5`.

**Files:**
- Create: `js/score/Scale.js`
- Modify: `tests.html`

**Interfaces:**
- Consumes: nothing
- Produces: `SCALES` (object of name -> interval array), `midiName(midi) -> string`, `class Scale { rootMidi, name, intervals, octaves, get rowCount, midiForRow(row), labelForRow(row) }`

- [ ] **Step 1: Write the failing tests in `tests.html`**

Add the import beside the existing ones:

```js
      import { Scale, SCALES, midiName } from "./js/score/Scale.js";
```

Add these tests before the summary line:

```js
      test("C major over 3 octaves is 22 rows", () => {
        eq(new Scale(48, "major", 3).rowCount, 22);
      });

      test("the bottom row is the root", () => {
        const s = new Scale(48, "major", 3);
        eq(s.midiForRow(s.rowCount - 1), 48);
      });

      test("the top row is the root three octaves up", () => {
        eq(new Scale(48, "major", 3).midiForRow(0), 84);
      });

      test("rows ascend by scale degree from the bottom", () => {
        const s = new Scale(48, "major", 3);
        eq(s.midiForRow(21), 48); // C3
        eq(s.midiForRow(20), 50); // D3
        eq(s.midiForRow(19), 52); // E3
        eq(s.midiForRow(18), 53); // F3
        eq(s.midiForRow(14), 60); // C4, one octave up
      });

      test("minor rows use the minor third", () => {
        const s = new Scale(48, "minor", 3);
        eq(s.midiForRow(19), 51); // Eb3, not E3
      });

      test("a pentatonic scale is 16 rows", () => {
        eq(new Scale(48, "major pentatonic", 3).rowCount, 16);
      });

      test("midiName fixes the two labels that were wrong", () => {
        eq(midiName(64), "E4");   // config.js called this e#4
        eq(midiName(73), "C#5");  // config.js called this d5
      });

      test("midiName handles octave boundaries", () => {
        eq(midiName(60), "C4");
        eq(midiName(59), "B3");
      });

      test("labelForRow names the row's pitch", () => {
        eq(new Scale(48, "major", 3).labelForRow(14), "C4");
      });

      test("every scale starts on the root", () => {
        Object.values(SCALES).forEach((intervals) => eq(intervals[0], 0));
      });
```

- [ ] **Step 2: Run the tests to verify they fail**

Open `http://localhost:8899/tests.html`.
Expected: the page fails to load the module — the browser console shows a 404 for `js/score/Scale.js`.

- [ ] **Step 3: Create `js/score/Scale.js`**

```js
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  "major pentatonic": [0, 2, 4, 7, 9],
  "minor pentatonic": [0, 3, 5, 7, 10],
};

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// MIDI 60 is C4, so the octave number is floor(midi / 12) - 1.
export function midiName(midi) {
  return NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}

export class Scale {
  constructor(rootMidi = 48, name = "major", octaves = 3) {
    this.rootMidi = rootMidi;
    this.name = name;
    this.intervals = SCALES[name];
    this.octaves = octaves;
  }

  // + 1 so the range closes on a root: 3 octaves of C major spans C3 to C6.
  get rowCount() {
    return this.intervals.length * this.octaves + 1;
  }

  // Row 0 is the TOP row and the highest pitch.
  midiForRow(row) {
    const fromBottom = this.rowCount - 1 - row;
    const n = this.intervals.length;
    return (
      this.rootMidi + 12 * Math.floor(fromBottom / n) + this.intervals[fromBottom % n]
    );
  }

  labelForRow(row) {
    return midiName(this.midiForRow(row));
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Expected: `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add js/score/Scale.js tests.html
git commit -m "Add the Scale module mapping grid rows to MIDI pitches"
```

---

### Task 4: The Note model and its pure helpers

**Files:**
- Create: `js/score/Note.js`
- Modify: `tests.html`

**Interfaces:**
- Consumes: nothing
- Produces: `class Note { row, startCol, length, waveType, playing, get endCol, covers(col) }`, `noteAt(notes, row, col) -> Note|null`, `maxLengthFor(notes, row, startCol, totalCols) -> number`, `remapRows(notes, newRowCount) -> Note[]`

- [ ] **Step 1: Write the failing tests in `tests.html`**

```js
      import { Note, noteAt, maxLengthFor, remapRows } from "./js/score/Note.js";
```

```js
      test("a note covers every column from its start", () => {
        const n = new Note(0, 4, 3);
        eq(n.endCol, 7);
        eq(n.covers(3), false);
        eq(n.covers(4), true);
        eq(n.covers(6), true);
        eq(n.covers(7), false);
      });

      test("noteAt finds a note by any column it covers", () => {
        const notes = [new Note(2, 4, 3)];
        eq(noteAt(notes, 2, 5), notes[0]);
        eq(noteAt(notes, 2, 9), null);
        eq(noteAt(notes, 3, 5), null);
      });

      test("maxLengthFor runs to the grid edge with nothing in the way", () => {
        eq(maxLengthFor([], 0, 60, 68), 8);
      });

      test("maxLengthFor stops at the next note in the same row", () => {
        const notes = [new Note(0, 10, 1)];
        eq(maxLengthFor(notes, 0, 4, 68), 6);
      });

      test("maxLengthFor ignores notes in other rows", () => {
        const notes = [new Note(1, 6, 1)];
        eq(maxLengthFor(notes, 0, 4, 68), 64);
      });

      test("maxLengthFor ignores notes that start earlier", () => {
        const notes = [new Note(0, 1, 1)];
        eq(maxLengthFor(notes, 0, 4, 68), 64);
      });

      test("maxLengthFor picks the nearest of several later notes", () => {
        const notes = [new Note(0, 30, 1), new Note(0, 12, 1), new Note(0, 50, 1)];
        eq(maxLengthFor(notes, 0, 4, 68), 8);
      });

      test("remapRows clamps rows that no longer exist", () => {
        const notes = [new Note(21, 0, 1), new Note(3, 0, 1)];
        const out = remapRows(notes, 16);
        eq(out.length, 2);
        eq(out.filter((n) => n.row === 15).length, 1);
        eq(out.filter((n) => n.row === 3).length, 1);
      });

      test("remapRows drops duplicates created by clamping, keeping the longer", () => {
        const notes = [new Note(21, 0, 1), new Note(20, 0, 4)];
        const out = remapRows(notes, 16);
        eq(out.length, 1);
        eq(out[0].length, 4);
      });

      test("remapRows leaves an in-range score untouched", () => {
        const notes = [new Note(0, 0, 1), new Note(5, 3, 2)];
        eq(remapRows(notes, 22).length, 2);
      });
```

- [ ] **Step 2: Run the tests to verify they fail**

Expected: 404 for `js/score/Note.js`.

- [ ] **Step 3: Create `js/score/Note.js`**

```js
export class Note {
  constructor(row, startCol, length = 1, waveType = "sine") {
    this.row = row;
    this.startCol = startCol;
    this.length = length;
    this.waveType = waveType;
    this.playing = false;
  }

  // Exclusive: a length-1 note at column 4 ends at 5 and covers only 4.
  get endCol() {
    return this.startCol + this.length;
  }

  covers(col) {
    return col >= this.startCol && col < this.endCol;
  }
}

export function noteAt(notes, row, col) {
  return notes.find((n) => n.row === row && n.covers(col)) ?? null;
}

// How long a note starting at (row, startCol) may grow before it would run
// into the next note in that row, or off the end of the grid.
export function maxLengthFor(notes, row, startCol, totalCols) {
  let next = totalCols;
  for (const n of notes) {
    if (n.row === row && n.startCol > startCol && n.startCol < next) next = n.startCol;
  }
  return next - startCol;
}

// Switching to a smaller scale leaves notes on rows that no longer exist.
// Clamp them into range, then drop the duplicates that clamping creates,
// keeping the longer note. Lossy at the top of the range, and unrecoverable
// until undo lands - see the spec.
export function remapRows(notes, newRowCount) {
  const kept = new Map();
  for (const n of notes) {
    n.row = Math.min(n.row, newRowCount - 1);
    const key = n.row + ":" + n.startCol;
    const prev = kept.get(key);
    if (!prev || n.length > prev.length) kept.set(key, n);
  }
  return [...kept.values()];
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Expected: `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add js/score/Note.js tests.html
git commit -m "Add the Note model and its pure grid helpers"
```

---

### Task 5: Rewrite Score around notes, and wire the drag gesture

The core change. After this task a note is no longer a grid cell, the grid is 22 scale rows, and you draw lengths by dragging.

**Files:**
- Modify: `js/score/Score.js` (full rewrite)
- Create: `js/score/interaction.js`
- Delete: `js/score/Cell.js`, `js/score/sortedInsert.js`
- Modify: `js/config.js`, `js/state.js`, `js/main.js`, `js/ui/Transport.js`, `js/nyquist.js`
- Modify: `tests.html`

**Interfaces:**
- Consumes: `Scale`, `midiName` (Task 3); `Note`, `noteAt`, `maxLengthFor` (Task 4)
- Produces: `Score` with `notes: Note[]`, `scale: Scale`, `cols`, `rows`, `h`, `colAt(px)`, `rowAt(py)`, `inside(px, py)`, `cellX(col)`, `cellY(row)`, `freqForRow(row)`; `toNyquist(notes, scale, secondsPerCol)`; `scoreDurationSeconds(notes, secondsPerCol)`

- [ ] **Step 1: Write the failing export tests in `tests.html`**

Delete the three `sortedInsert` tests, its import, the two old `toNyquist` tests, the three old `scoreDurationSeconds` tests, and the `NOTES` import. Add:

```js
      test("toNyquist emits notes in ascending time order with real durations", () => {
        const scale = new Scale(48, "major", 3);
        const notes = [new Note(0, 2, 3, "triangle"), new Note(21, 0, 1, "sine")];
        eq(
          toNyquist(notes, scale, 0.5),
          "{\n {0.00 0.50 {sine-instr pitch: 48}} \n {1.00 1.50 {triangle-instr pitch: 84}} \n}"
        );
      });

      test("toNyquist handles an empty score", () => {
        eq(toNyquist([], new Scale(), 0.5), "{\n}");
      });

      test("scoreDurationSeconds spans to the end of the last note", () => {
        eq(scoreDurationSeconds([new Note(0, 4, 3), new Note(1, 0, 1)], 0.5), 3.5);
      });

      test("scoreDurationSeconds is not the note count", () => {
        const stacked = [0, 1, 2, 3, 4].map((r) => new Note(r, 0, 1));
        eq(scoreDurationSeconds(stacked, 0.5), 0.5);
      });

      test("scoreDurationSeconds of an empty score is zero", () => {
        eq(scoreDurationSeconds([], 0.5), 0);
      });
```

- [ ] **Step 2: Run the tests to verify they fail**

Expected: failures on the three new/changed behaviours (old `toNyquist` takes four arguments and ignores length; old `scoreDurationSeconds` takes `.col`).

- [ ] **Step 3: Update `js/config.js`**

Delete the `NOTES` export entirely — `Scale` replaces it. Update `GRID`:

```js
export const GRID = {
  topY: 100,
  cellWidth: 20,
  cellHeight: 16,
  dotSize: 7,
  xRatio: 0.04,
  wRatio: 0.95,
};
```

`COLORS` and `colorForWave` are unchanged.

- [ ] **Step 4: Update `js/state.js`**

```js
export const state = {
  score: null,
  logicalStopTime: 1,
  playing: false,
  dragging: null,
  auditionHandle: null,
  radio: null,
  envelopePanel: null,
};
```

`selectedCells` and `currentCell` are gone — notes live on `state.score.notes`.

- [ ] **Step 5: Rewrite `js/score/Score.js`**

```js
import { COLORS, GRID, colorForWave } from "../config.js";
import { Scale } from "./Scale.js";

export class Score {
  constructor(y, scale = new Scale()) {
    this.x = width * GRID.xRatio;
    this.y = y;
    this.w = width * GRID.wRatio;
    this.cellWidth = GRID.cellWidth;
    this.cellHeight = GRID.cellHeight;
    this.scale = scale;
    this.cols = Math.floor(this.w / this.cellWidth);
    this.notes = [];
  }

  get rows() {
    return this.scale.rowCount;
  }

  get h() {
    return this.rows * this.cellHeight;
  }

  // Dot centres sit ON grid-line intersections, so a cell owns the half-step
  // either side of its centre - round, don't floor.
  colAt(px) {
    return Math.round((px - this.x) / this.cellWidth);
  }

  rowAt(py) {
    return Math.round((py - this.y) / this.cellHeight);
  }

  cellX(col) {
    return this.x + col * this.cellWidth;
  }

  cellY(row) {
    return this.y + row * this.cellHeight;
  }

  inside(px, py) {
    const col = this.colAt(px);
    const row = this.rowAt(py);
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  freqForRow(row) {
    return midiToFreq(this.scale.midiForRow(row));
  }

  drawSelf() {
    push();
    noStroke();

    // Background dots and row labels.
    for (let row = 0; row < this.rows; row++) {
      const y = this.cellY(row);
      fill(...COLORS.cell);
      for (let col = 0; col < this.cols; col++) {
        ellipse(this.cellX(col), y, GRID.dotSize, GRID.dotSize);
      }
      fill(COLORS.content);
      text(this.scale.labelForRow(row), this.x - 24, y);
    }

    // Notes as capsules. At length 1 the width equals dotSize, so the note
    // renders as a circle identical to a background dot.
    rectMode(CORNER);
    const d = GRID.dotSize;
    for (const note of this.notes) {
      fill(colorForWave(note.waveType));
      const w = (note.length - 1) * this.cellWidth + d;
      const h = note.playing ? d * 1.6 : d;
      rect(this.cellX(note.startCol) - d / 2, this.cellY(note.row) - h / 2, w, h, h / 2);
    }

    this.collide();
    pop();
  }

  collide() {
    cursor(this.inside(mouseX, mouseY) ? CROSS : ARROW);
  }
}
```

- [ ] **Step 6: Create `js/score/interaction.js`**

```js
import { state } from "../state.js";
import { Note, noteAt, maxLengthFor } from "./Note.js";
import { audio } from "../audio/AudioEngine.js";

export function handleMousePressed() {
  const score = state.score;
  if (!score || !score.inside(mouseX, mouseY)) return;

  const row = score.rowAt(mouseY);
  const col = score.colAt(mouseX);

  const hit = noteAt(score.notes, row, col);
  if (hit) {
    score.notes.splice(score.notes.indexOf(hit), 1);
    return;
  }

  const note = new Note(row, col, 1, state.radio.value());
  score.notes.push(note);
  state.dragging = note;
  audio.noteOn(score.freqForRow(row), note.waveType);
}

export function handleMouseDragged() {
  const note = state.dragging;
  if (!note) return;
  const score = state.score;
  const others = score.notes.filter((n) => n !== note);
  const max = maxLengthFor(others, note.row, note.startCol, score.cols);
  const wanted = score.colAt(mouseX) - note.startCol + 1;
  note.length = Math.max(1, Math.min(wanted, max));
}

export function handleMouseReleased() {
  state.dragging = null;
}
```

- [ ] **Step 7: Rewrite `js/nyquist.js`'s `toNyquist`**

`downloadText` is unchanged.

```js
export function toNyquist(notes, scale, secondsPerCol) {
  const sorted = [...notes].sort((a, b) => a.startCol - b.startCol);
  let content = "{\n";
  for (const n of sorted) {
    const start = (n.startCol * secondsPerCol).toFixed(2);
    const dur = (n.length * secondsPerCol).toFixed(2);
    content += ` {${start} ${dur} {${n.waveType}-instr pitch: ${scale.midiForRow(n.row)}}} \n`;
  }
  return content + "}";
}
```

- [ ] **Step 8: Update `js/ui/Transport.js`**

Change the imports: drop `NOTES`, keep `COLORS, GRID, LAYOUT`. Then replace these four functions:

```js
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
      audio.noteOn(score.freqForRow(note.row), note.waveType);
      note.playing = true;
      setTimeout(() => {
        note.playing = false;
      }, note.length * spc * 1000);
    }, note.startCol * spc * 1000);
  }
  setTimeout(() => {
    state.playing = false;
  }, scoreDurationSeconds(score.notes, spc) * 1000);
}

function clearCanvas() {
  if (state.score) state.score.notes.length = 0;
}

export function generateScore() {
  downloadText(
    toNyquist(state.score.notes, state.score.scale, state.logicalStopTime),
    "score.txt"
  );
}
```

`create()` is unchanged — `new Score(GRID.topY)` now defaults to a C major scale.

- [ ] **Step 9: Update `js/main.js`**

Replace the `Cell.js` import and add the two new p5 event hooks:

```js
import {
  handleMousePressed,
  handleMouseDragged,
  handleMouseReleased,
} from "./score/interaction.js";
```

```js
window.mousePressed = handleMousePressed;
window.mouseDragged = handleMouseDragged;
window.mouseReleased = handleMouseReleased;
```

- [ ] **Step 10: Delete the dead files**

```bash
git rm js/score/Cell.js js/score/sortedInsert.js
```

- [ ] **Step 11: Run the tests to verify they pass**

Expected: `0 failed`.

- [ ] **Step 12: Verify in the app**

Open the app and create a score. Expected:
- 22 rows, labelled C3 at the bottom through C6 at the top, no sharps in the labels
- clicking empty space makes a dot and sounds a note
- pressing and dragging right draws a capsule that stops at the next note in the row
- clicking anywhere on an existing note deletes it
- `generate nyquist score` downloads a file whose durations vary with note length

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "Make a note an object with a duration on a scale-degree grid"
```

---

### Task 6: Make durations audible

Notes currently sound for a fixed envelope length regardless of the length drawn.

**Files:**
- Modify: `js/audio/Voice.js`, `js/audio/AudioEngine.js`
- Modify: `js/ui/Transport.js` (`playScore`), `js/score/interaction.js`

**Interfaces:**
- Consumes: `Score.freqForRow` (Task 5)
- Produces: `Voice.noteOn(...) -> token`, `Voice.noteOff(token)`, `audio.noteOn(freq, waveType) -> {voice, token}`, `audio.noteOff(handle)`

- [ ] **Step 1: Give `Voice` an attack/release pair**

`p5.Envelope.play(unit, startTime, sustainTime)` cannot be used here: its body is
`triggerRelease(t, i + this.aTime + this.dTime + ~~n)`, and `~~n` truncates the
sustain time to whole seconds, so a 0.5s note would floor to 0.

In `js/audio/Voice.js`, add `this.token = 0;` to the constructor and replace `noteOn`:

```js
  noteOn(freq, waveType, adsr) {
    this.env.setADSR(
      adsr.attackTime, adsr.decayTime, adsr.sustainLevel, adsr.releaseTime
    );
    this.env.setRange(adsr.attackLevel, adsr.releaseLevel);
    this.osc.setType(waveType);
    this.osc.freq(freq);
    this.env.triggerAttack();
    return ++this.token;
  }

  // A stolen voice must not be released by the note it replaced, so a
  // release only lands while its token is still the current one.
  noteOff(token) {
    if (token !== this.token) return;
    this.env.triggerRelease();
  }
```

- [ ] **Step 2: Return a handle from `AudioEngine`**

```js
  noteOn(freq, waveType) {
    this.resume();
    let oldest = this.voices[0];
    for (const v of this.voices) if (v.lastUsed < oldest.lastUsed) oldest = v;
    oldest.lastUsed = ++this.counter;
    return { voice: oldest, token: oldest.noteOn(freq, waveType, this.adsr) };
  }

  noteOff(handle) {
    if (handle) handle.voice.noteOff(handle.token);
  }
```

- [ ] **Step 3: Release scheduled notes in `playScore`**

Every `noteOn` now needs a matching `noteOff` or the note sustains forever. In `js/ui/Transport.js`:

```js
    setTimeout(() => {
      const handle = audio.noteOn(score.freqForRow(note.row), note.waveType);
      note.playing = true;
      setTimeout(() => {
        audio.noteOff(handle);
        note.playing = false;
      }, note.length * spc * 1000);
    }, note.startCol * spc * 1000);
```

- [ ] **Step 4: Release the audition note in `interaction.js`**

The audition now sounds for as long as the mouse is held, which is exactly the drag gesture. In `handleMousePressed`:

```js
  state.auditionHandle = audio.noteOn(score.freqForRow(row), note.waveType);
```

and in `handleMouseReleased`:

```js
export function handleMouseReleased() {
  audio.noteOff(state.auditionHandle);
  state.auditionHandle = null;
  state.dragging = null;
}
```

- [ ] **Step 5: Run the tests**

Expected: `0 failed` — these are audio paths, so nothing new is tested here; the run confirms nothing regressed.

- [ ] **Step 6: Verify by ear**

Expected:
- press and hold on an empty cell: the note sustains until you release
- draw a 1-column note and an 8-column note, press play: the long one audibly holds
- fill a row with 20 notes at a short logical-stop-time and play: no note gets stuck on when the 16-voice pool wraps

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Make note length audible with a token-guarded note-off"
```

---

### Task 7: Root and scale selectors

**Files:**
- Modify: `js/ui/Transport.js`, `js/config.js`

**Interfaces:**
- Consumes: `SCALES`, `Scale` (Task 3); `remapRows` (Task 4); `Score.scale` (Task 5)
- Produces: nothing downstream

- [ ] **Step 1: Add the selector positions to `LAYOUT` in `js/config.js`**

```js
  rootX: 1090, rootY: 500,
  scaleX: 1090, scaleY: 525,
```

- [ ] **Step 2: Build the selectors in `createTransport`**

Add to the imports in `js/ui/Transport.js`:

```js
import { Scale, SCALES, midiName } from "../score/Scale.js";
import { remapRows } from "../score/Note.js";
```

Add at the end of `createTransport`, and declare `let rootSelect, scaleSelect;` beside the other module-level `let`s:

```js
  rootSelect = createSelect();
  for (let midi = 48; midi < 60; midi++) rootSelect.option(midiName(midi), midi);
  rootSelect.selected("C3");
  rootSelect.position(LAYOUT.rootX, LAYOUT.rootY);
  rootSelect.changed(changeScale);
  rootSelect.hide();

  scaleSelect = createSelect();
  for (const name of Object.keys(SCALES)) scaleSelect.option(name);
  scaleSelect.selected("major");
  scaleSelect.position(LAYOUT.scaleX, LAYOUT.scaleY);
  scaleSelect.changed(changeScale);
  scaleSelect.hide();
```

- [ ] **Step 3: Add the change handler**

```js
function changeScale() {
  const score = state.score;
  if (!score) return;
  score.scale = new Scale(Number(rootSelect.value()), scaleSelect.value(), 3);
  score.notes = remapRows(score.notes, score.scale.rowCount);
}
```

- [ ] **Step 4: Show the selectors with the rest of the UI**

In `create()`, beside the existing `state.radio.show()`:

```js
    rootSelect.show();
    scaleSelect.show();
```

- [ ] **Step 5: Run the tests**

Expected: `0 failed`.

- [ ] **Step 6: Verify in the app**

Expected:
- switching root from C3 to F3 re-labels every row and transposes playback; note positions do not move
- switching major to minor changes the labels and the sound; the melody's shape is unchanged
- switching to a pentatonic scale shortens the grid to 16 rows, and notes above row 15 clamp down rather than disappearing or throwing

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add root and scale selectors with lossless row remapping"
```

---

## Done when

- `tests.html` reports `0 failed`
- A three-octave scale grid draws notes of varying length as capsules
- Held notes sound held, both on audition and on playback
- Changing root or scale re-maps existing notes without losing any in range
- The exported Nyquist score's durations match the drawn lengths
- The FFT panel is black when silent
