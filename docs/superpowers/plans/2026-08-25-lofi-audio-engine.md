# Lo-fi Audio Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace GOMI's 952 bare per-cell oscillators with a pooled synthesis voice feeding one shared effects chain, so the app produces warm lo-fi ambient tones instead of raw test tones.

**Architecture:** All project code becomes ES modules under p5's global mode (verified working — drawing calls keep their bare `ellipse(...)` form). Audio moves out of `Cell` entirely behind a single interface, `AudioEngine.noteOn(freq, waveType)`. A pool of 16 `Voice` objects — each three detuned oscillators plus a noise layer, one shared envelope, one lowpass — feeds a single `MasterBus` effects chain. Every sound parameter lives as plain data in `presets.js`.

**Tech Stack:** Vanilla ES modules, p5.js 1.6.0, p5.sound 1.0.1 (both vendored in `lib/`). No npm, no build step, no runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-08-25-lofi-audio-engine-design.md`

## Global Constraints

Every task's requirements implicitly include these. Values copied verbatim from the spec.

- **No new runtime dependencies.** Not Tone.js, not npm, not a build step. If a task seems to need one, stop and raise it.
- **No changes to the musical model.** 14-row chromatic grid, one note per cell, uniform note length, click-to-toggle. Chords, scales, swing, tempo and looping are out of scope.
- **No samples.** Pure synthesis only.
- **Nyquist export output is byte-identical** to today's, including the trailing space before each newline and `dur` printed unformatted while `startTime` is `.toFixed(2)`.
- **`main.js` is the only file permitted to assign to `window`**, and only the p5 lifecycle hooks: `preload`, `setup`, `draw`, `mousePressed`.
- **p5 stays in global mode.** Never convert to instance mode; never write `p.ellipse(...)`.
- Vendored library versions are fixed: p5.js **1.6.0**, p5.sound **1.0.1**.
- Voice pool size: **16**. Oscillators per voice: driven by `VOICE.detuneCents.length`, default **3**.
- Envelope routing: **one `p5.Envelope` per voice**, applied via `.amp(env)` to each oscillator and the noise source, triggered once with `env.play()`. Never `env.play(gain)` — it leaks at rest (measured 0.1128).

## How to run and verify

There is no build step and no test runner. Serve the repo root and open it:

```bash
python3 -m http.server 8000
```

- App: `http://localhost:8000/index.html`
- Tests: `http://localhost:8000/tests.html`

"Tests pass" means `tests.html` shows all green and the browser console is free of errors. "App works" means the page loads, the console is clean, and the described interaction behaves.

**Measuring audio:** never read `AudioParam.value` — a connected signal sums on top of the intrinsic value and never appears there. Use `p5.Amplitude.setInput(source)` and sample `getLevel()`. Do not leave stale `p5.Amplitude` instances bound to stopped sources; they throw `Cannot read properties of undefined` on the next poll.

---

## File Structure

| File | Responsibility |
|---|---|
| `index.html` | Page shell; two library script tags plus one module entry |
| `tests.html` | Browser test runner for pure logic |
| `css/styles.css` | All styling, extracted from the inline `<style>` |
| `js/main.js` | p5 lifecycle wiring only; the only file touching `window` |
| `js/config.js` | Note table, colours, grid and layout constants |
| `js/nyquist.js` | Score → Nyquist text (pure) + the DOM download helper |
| `js/audio/presets.js` | Every sound parameter, as plain data |
| `js/audio/Voice.js` | One playable note: oscillators + noise + filter + envelope |
| `js/audio/AudioEngine.js` | Public audio API; owns the voice pool and the bus |
| `js/audio/MasterBus.js` | The shared effects chain |
| `js/score/Score.js` | Grid model (formerly `Canvas.js`) |
| `js/score/Cell.js` | Position, colour, selected state — no audio |
| `js/score/sortedInsert.js` | Ordered insertion helper (pure) |
| `js/ui/EnvelopePanel.js` | ADSR sliders + graph (formerly `Envelope.js`) |
| `js/ui/Transport.js` | Play / clear / export buttons and scheduling |
| `js/ui/Visualizers.js` | Amplitude circle + spectrum |

Deleted: `js/osc.js`, `js/amp.js`, `js/sketch.js`, `js/Canvas.js`, `js/Cell.js`, `js/Envelope.js`.

---

## Task 1: Housekeeping — delete dead files, extract CSS

Zero-risk groundwork. Nothing here changes behaviour.

**Files:**
- Delete: `js/osc.js`, `js/amp.js`
- Create: `css/styles.css`
- Modify: `index.html`

**Interfaces:**
- Consumes: nothing
- Produces: `css/styles.css` linked from `index.html`

- [ ] **Step 1: Confirm the dead files really are unreferenced**

```bash
grep -n "osc.js\|amp.js" index.html || echo "NOT REFERENCED - safe to delete"
```

Expected: `NOT REFERENCED - safe to delete`. If either name appears, stop and raise it — the spec's premise is wrong.

- [ ] **Step 2: Delete them**

```bash
git rm js/osc.js js/amp.js
```

- [ ] **Step 3: Move the CSS out**

Cut the entire contents of the `<style>` element in `index.html` (everything between `<style>` and `</style>`) into a new file `css/styles.css`, verbatim. Delete the now-empty `<style>` element.

- [ ] **Step 4: Link the stylesheet**

In `index.html`, inside `<head>`, replace the removed `<style>` block with:

```html
<link rel="stylesheet" href="css/styles.css" />
```

- [ ] **Step 5: Verify the app is unchanged**

Serve the repo and open `http://localhost:8000/index.html`. Expected: identical to before — black background, "click to create a score" button in the Share Tech Mono font, no console errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Remove dead sketch files and extract CSS

js/osc.js and js/amp.js were never referenced by index.html, both
redefined setup/draw/preload, and both loaded a sounds/song.wav that
does not exist in the repo."
```

---

## Task 2: Convert to ES modules

The structural move. File contents stay semantically identical; only the wiring changes. Do not fix bugs or rename anything beyond what is listed — bug fixes are Task 4.

**Files:**
- Create: `js/main.js`
- Rename: `js/Canvas.js` → `js/score/Score.js`, `js/Cell.js` → `js/score/Cell.js`, `js/Envelope.js` → `js/ui/EnvelopePanel.js`
- Modify: `js/sketch.js` (becomes a temporary module; split in Task 3), `index.html`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `js/score/Score.js` → `export class Score` (constructor `(y, startingNote = 5, numNotes = 14)`)
  - `js/score/Cell.js` → `export class Cell`, `export function sortedInsert(arr, value)`
  - `js/ui/EnvelopePanel.js` → `export class EnvelopePanel` (constructor `(x, y, w, h)`)
  - `js/main.js` → assigns `window.setup`, `window.draw`, `window.preload`, `window.mousePressed`

- [ ] **Step 1: Point index.html at a module entry**

Replace the four project `<script>` tags with one. The library tags stay as classic scripts.

```html
<script src="lib/p5.min.js"></script>
<script src="lib/p5.sound.min.js"></script>
<script type="module" src="js/main.js"></script>
```

- [ ] **Step 2: Move the files**

```bash
mkdir -p js/score js/ui js/audio
git mv js/Canvas.js js/score/Score.js
git mv js/Cell.js js/score/Cell.js
git mv js/Envelope.js js/ui/EnvelopePanel.js
```

- [ ] **Step 3: Rename the classes**

In `js/score/Score.js`, rename `class Canvas` to `class Score` and prefix with `export`. In `js/ui/EnvelopePanel.js`, rename `class Envelope` to `class EnvelopePanel` and prefix with `export`.

The `Canvas` → `Score` rename matters: the old name collides with p5's canvas and with `createCanvas`.

- [ ] **Step 4: Add imports and exports to the moved files**

At the top of `js/score/Cell.js`:

```js
import { NOTES, COLORS } from "../config.js";
import { state } from "../state.js";
```

Do not add `js/config.js` or `js/state.js` yet — Task 3 creates them. For this task only, keep `Cell.js` and `Score.js` reading the globals they already read, and add the export keywords. The import lines above are what Task 3 will introduce; do not write them now.

Concretely, for this task:
- `js/score/Cell.js`: add `export` before `class Cell` and before `function sortedInsert`. Remove the top-level `function mousePressed()` — it moves to `main.js` in Step 5. Change it into `export function handleMousePressed()` with an identical body.
- `js/score/Score.js`: add `export` before `class Score`; add `export` before `function noteToMidi`.
- `js/ui/EnvelopePanel.js`: add `export` before `class EnvelopePanel`.

- [ ] **Step 5: Create the entry point**

Create `js/main.js`. It imports everything, keeps the existing shared state as module-level variables for now, and assigns the p5 hooks. Copy the bodies of `preload`, `setup`, `draw` verbatim from `js/sketch.js`.

```js
import { Score } from "./score/Score.js";
import { handleMousePressed } from "./score/Cell.js";
import { EnvelopePanel } from "./ui/EnvelopePanel.js";
import * as sketch from "./sketch.js";

window.preload = sketch.preload;
window.setup = sketch.setup;
window.draw = sketch.draw;
window.mousePressed = handleMousePressed;
```

- [ ] **Step 6: Make sketch.js a module**

Add `export` to `preload`, `setup` and `draw` in `js/sketch.js`. Add imports at the top:

```js
import { Score } from "./score/Score.js";
import { EnvelopePanel } from "./ui/EnvelopePanel.js";
```

Replace `new Canvas(100)` with `new Score(100)` and `new Envelope(...)` with `new EnvelopePanel(...)`.

- [ ] **Step 7: Resolve the remaining cross-file globals**

`Cell.js` and `Score.js` still read `selectedCells`, `myRadio`, `globalADSR`, `notes`, `contentColor`, and the four colour variables from `sketch.js`. Modules do not share a global scope, so these must become explicit.

Create `js/state.js` as the temporary home for the shared mutable values:

```js
export const state = {
  score: null,
  selectedCells: [],
  logicalStopTime: 1,
  playing: false,
  currentCell: null,
  radio: null,
  envelopePanel: null,
};
```

In `sketch.js`, `Cell.js` and `Score.js`, replace every read and write of those globals with the `state.` equivalent (`selectedCells` → `state.selectedCells`, `globalADSR` → `state.envelopePanel`, `myRadio` → `state.radio`, `currentCell` → `state.currentCell`, `score` → `state.score`, `playing` → `state.playing`, `logicalStopTime` → `state.logicalStopTime`). Import `state` in each file:

```js
import { state } from "../state.js";
```

(from `sketch.js` the path is `"./state.js"`).

Leave `notes` and the colour constants in `sketch.js` for now, exported, and import them where needed. Task 3 moves them to `config.js`.

- [ ] **Step 8: Verify the app is unchanged**

Serve and open the app. Expected, all as before: the create-score button appears; clicking it shows the 14-row grid; clicking a dot plays a tone and turns it the wave's colour; clicking it again removes it; play, clear and the Nyquist download all work. Console must be clean.

If the console shows `Uncaught SyntaxError: Cannot use import statement outside a module`, the `type="module"` attribute is missing from Step 1.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Convert project code to ES modules

Cell.js previously depended on seven globals defined in other files
with nothing declaring the relationship. Dependencies are now explicit
imports. Canvas renamed to Score to stop colliding with p5's canvas.

No intended behaviour change."
```

---

## Task 3: Split sketch.js into focused modules

`sketch.js` currently holds state, layout constants, two visualisers, playback scheduling and file export. Split it, then delete it.

**Files:**
- Create: `js/config.js`, `js/nyquist.js`, `js/ui/Transport.js`, `js/ui/Visualizers.js`, `js/score/sortedInsert.js`
- Modify: `js/main.js`, `js/score/Cell.js`, `js/score/Score.js`
- Delete: `js/sketch.js`

**Interfaces:**
- Consumes: `state` from `js/state.js`; `Score`, `Cell`, `EnvelopePanel` from Task 2
- Produces:
  - `js/config.js` → `export const NOTES`, `export const COLORS`, `export const GRID`, `export const LAYOUT`
  - `js/nyquist.js` → `export function toNyquist(selected, noteNames, noteTable, logicalStopTime)` returning a string; `export function downloadText(text, filename)`
  - `js/score/sortedInsert.js` → `export function sortedInsert(arr, value)`
  - `js/ui/Transport.js` → `export function createTransport()`, `export function playScore()`
  - `js/ui/Visualizers.js` → `export function createVisualizers()`, `export function drawVisualizers()`

- [ ] **Step 1: Create config.js**

Move the note table, colours and layout numbers out of `sketch.js`. Key order in `NOTES` is load-bearing — `Score.init()` iterates `Object.keys(notes)` to lay out rows top to bottom, so `d5` must stay first.

```js
export const NOTES = {
  d5: 73, c5: 72, b4: 71, "a#4": 70, a4: 69, "g#4": 68, g4: 67,
  "f#4": 66, f4: 65, "e#4": 64, "d#4": 63, d4: 62, "c#4": 61, c4: 60,
};

export const COLORS = {
  background: 0,
  content: 255,
  sine: "#FFFFFF",
  triangle: "#68A357",
  sawtooth: "#5FB49C",
  square: "#414288",
  cell: [171, 169, 200, 150],
};

export const GRID = {
  topY: 100,
  cellWidth: 20,
  cellHeight: 20,
  xRatio: 0.04,
  wRatio: 0.95,
};

export const LAYOUT = {
  fftX: 0.65, fftY: 310, fftWidth: 200, fftHeight: 170,
  ampX: 0.1, ampY: 0.75, ampRadius: 100,
  envX: 0.25, envY: 0.65, envWidth: 350, envHeight: 170,
  radioX: 1090, radioY: 400,
  sliderX: 40, sliderY: 390,
};

export function colorForWave(waveType) {
  return COLORS[waveType] ?? COLORS.sine;
}
```

`colorForWave` replaces the four-branch `switch` in `Cell.js`'s mouse handler and the near-identical one in `changeRadio`.

- [ ] **Step 2: Write the failing test for the Nyquist export**

Create `tests.html` with a minimal runner and the first test. The expected string is copied from the README's documented format — note the leading space, the trailing space before each `\n`, `startTime` at two decimals, and `dur` unformatted.

```html
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /><title>GOMI tests</title>
    <style>
      body { font-family: monospace; background: #111; color: #eee; padding: 20px; }
      .pass { color: #6f6; } .fail { color: #f66; } pre { color: #aaa; margin: 4px 0 12px 20px; }
    </style>
  </head>
  <body>
    <h1>GOMI tests</h1>
    <div id="out"></div>
    <script type="module">
      import { toNyquist } from "./js/nyquist.js";
      import { NOTES } from "./js/config.js";

      let passed = 0, failed = 0;
      const out = document.getElementById("out");
      function test(name, fn) {
        try { fn(); passed++; out.innerHTML += `<div class="pass">PASS ${name}</div>`; }
        catch (e) { failed++; out.innerHTML += `<div class="fail">FAIL ${name}</div><pre>${e.message}</pre>`; }
      }
      function eq(actual, expected) {
        if (actual !== expected) {
          throw new Error(`expected: ${JSON.stringify(expected)}\nactual:   ${JSON.stringify(actual)}`);
        }
      }

      const noteNames = Object.keys(NOTES);

      test("toNyquist emits notes in ascending time order", () => {
        // selectedCells is stored DESCENDING by x, so index 0 is the LAST note.
        const selected = [
          { row: 0, col: 2, waveType: "triangle" },
          { row: 13, col: 0, waveType: "sine" },
        ];
        eq(
          toNyquist(selected, noteNames, NOTES, 0.36),
          "{\n {0.00 0.36 {sine-instr pitch: 60}} \n {0.72 0.36 {triangle-instr pitch: 73}} \n}"
        );
      });

      test("toNyquist handles an empty score", () => {
        eq(toNyquist([], noteNames, NOTES, 0.36), "{\n}");
      });

      out.innerHTML += `<h2 class="${failed ? "fail" : "pass"}">${passed} passed, ${failed} failed</h2>`;
    </script>
  </body>
</html>
```

- [ ] **Step 3: Run it and watch it fail**

Open `http://localhost:8000/tests.html`. Expected: the page fails to load the module, console shows a 404 for `js/nyquist.js`. That is the failing state.

- [ ] **Step 4: Write nyquist.js**

```js
export function toNyquist(selected, noteNames, noteTable, logicalStopTime) {
  let content = "{\n";
  for (let i = selected.length - 1; i >= 0; i--) {
    const cell = selected[i];
    const startTime = cell.col * logicalStopTime;
    const instr = cell.waveType + "-instr";
    const pitch = noteTable[noteNames[cell.row]];
    content += ` {${startTime.toFixed(2)} ${logicalStopTime} {${instr} pitch: ${pitch}}} \n`;
  }
  return content + "}";
}

export function downloadText(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 5: Run the tests and watch them pass**

Reload `tests.html`. Expected: `2 passed, 0 failed`.

- [ ] **Step 6: Extract sortedInsert with tests**

Move `sortedInsert` from `Cell.js` into `js/score/sortedInsert.js`. It takes a comparator so it no longer depends on `Cell`:

```js
// Inserts `value` keeping `arr` sorted DESCENDING by the comparator's key.
// Descending is deliberate: Score.drawSelf connects consecutive entries, and
// nyquist.js walks the array backwards to emit ascending start times.
export function sortedInsert(arr, value, compare = (a, b) => a.x - b.x) {
  let left = 0;
  let right = arr.length;
  while (left < right) {
    const mid = Math.floor(left + (right - left) / 2);
    if (compare(value, arr[mid]) > 0) right = mid;
    else left = mid + 1;
  }
  arr.splice(left, 0, value);
}
```

Add these tests to `tests.html` (import `sortedInsert` at the top):

```js
test("sortedInsert keeps descending x order", () => {
  const arr = [];
  [3, 1, 4, 1, 5].forEach((x) => sortedInsert(arr, { x }));
  eq(arr.map((v) => v.x).join(","), "5,4,3,1,1");
});

test("sortedInsert into an empty array", () => {
  const arr = [];
  sortedInsert(arr, { x: 7 });
  eq(arr.length, 1);
});

test("sortedInsert places equal keys without dropping them", () => {
  const arr = [{ x: 2 }, { x: 2 }];
  sortedInsert(arr, { x: 2 });
  eq(arr.length, 3);
});
```

Reload `tests.html`. Expected: `5 passed, 0 failed`.

- [ ] **Step 7: Extract Visualizers.js**

Move `visualizeFFT` and `visualizeAmplitudeCircle` from `sketch.js` into `js/ui/Visualizers.js`, along with the module-level `fft`, `amp` and `amphistory`. Expose two functions:

```js
import { COLORS, LAYOUT } from "../config.js";

let fft, amp;
const ampHistory = [];

export function createVisualizers() {
  fft = new p5.FFT(0, 32);
  amp = new p5.Amplitude();
}

export function drawVisualizers() {
  drawAmplitude();
  drawSpectrum();
}
```

Copy the two drawing bodies verbatim into `drawAmplitude` and `drawSpectrum`, swapping literals for `LAYOUT` and `COLORS` values. Do not fix the amplitude NaN bug here — that is Task 4.

- [ ] **Step 8: Extract Transport.js**

Move `playScore`, `create`, `clearCanvas`, `changeRadio`, `generateScore` and the button/radio creation from `sketch.js` into `js/ui/Transport.js`. `generateScore` now delegates:

```js
import { toNyquist, downloadText } from "../nyquist.js";
import { NOTES } from "../config.js";
import { state } from "../state.js";

export function generateScore() {
  const text = toNyquist(
    state.selectedCells,
    state.score.notes,
    NOTES,
    state.logicalStopTime
  );
  downloadText(text, "score.txt");
}
```

- [ ] **Step 9: Reduce main.js to wiring**

`js/main.js` becomes the whole of what was `sketch.js`'s lifecycle, and nothing else:

```js
import { Score } from "./score/Score.js";
import { handleMousePressed } from "./score/Cell.js";
import { EnvelopePanel } from "./ui/EnvelopePanel.js";
import { createTransport } from "./ui/Transport.js";
import { createVisualizers, drawVisualizers } from "./ui/Visualizers.js";
import { COLORS, LAYOUT } from "./config.js";
import { state } from "./state.js";

let myFont;

window.preload = function () {
  myFont = loadFont("Share_Tech_Mono/ShareTechMono-Regular.ttf");
};

window.setup = function () {
  createCanvas(1425, 738).id("my-score");
  angleMode(DEGREES);
  createTransport();
  createVisualizers();
  state.envelopePanel = new EnvelopePanel(
    width * LAYOUT.envX, height * LAYOUT.envY, LAYOUT.envWidth, LAYOUT.envHeight
  );
  textFont(myFont);
  textSize(15);
  textAlign(CENTER, CENTER);
};

window.draw = function () {
  background(COLORS.background);
  drawHeader();
  if (state.score) state.score.drawSelf();
  state.envelopePanel.drawSelf();
  drawVisualizers();
};

window.mousePressed = handleMousePressed;
```

Move `drawText` into `main.js` as `drawHeader`.

- [ ] **Step 10: Delete sketch.js**

```bash
git rm js/sketch.js
```

- [ ] **Step 11: Verify app and tests**

Open the app: create a score, click dots, play, clear, download. All behave as before, console clean. Open `tests.html`: `5 passed, 0 failed`.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "Split sketch.js into config, nyquist, transport and visualizers

sketch.js held state, layout constants, two visualizers, playback
scheduling and file export. Each now has its own module. Adds
tests.html covering the Nyquist export and sortedInsert.

No intended behaviour change."
```

---

## Task 4: Fix the five known bugs

Each fix is independent. Tests where the logic is pure; visual verification where it is not.

**Files:**
- Modify: `js/ui/Visualizers.js`, `js/ui/Transport.js`, `js/ui/EnvelopePanel.js`, `tests.html`

**Interfaces:**
- Consumes: everything from Task 3
- Produces: `export function scoreDurationSeconds(selected, logicalStopTime)` in `js/ui/Transport.js`

- [ ] **Step 1: Fix the amplitude NaN**

In `js/ui/Visualizers.js`, the circle reads `ampHistory[i]` for `i` up to 359 before the array holds 360 entries, feeding `undefined` into `map()`. Pre-fill the buffer at creation:

```js
export function createVisualizers() {
  fft = new p5.FFT(0, 32);
  amp = new p5.Amplitude();
  ampHistory.length = 0;
  for (let i = 0; i < 360; i++) ampHistory.push(0);
}
```

- [ ] **Step 2: Write the failing test for score duration**

`playScore()` clears `playing` after `selectedCells.length * logicalStopTime` — the note *count*, not the score's duration. Ten notes in column 0 lock playback ten times too long.

Add to `tests.html` (import `scoreDurationSeconds` from `./js/ui/Transport.js`):

```js
test("scoreDurationSeconds uses the last column, not the note count", () => {
  const stacked = [
    { col: 0 }, { col: 0 }, { col: 0 }, { col: 0 }, { col: 0 },
  ];
  eq(scoreDurationSeconds(stacked, 0.5), 0.5);
});

test("scoreDurationSeconds spans to the final column", () => {
  eq(scoreDurationSeconds([{ col: 4 }, { col: 0 }], 0.5), 2.5);
});

test("scoreDurationSeconds of an empty score is zero", () => {
  eq(scoreDurationSeconds([], 0.5), 0);
});
```

- [ ] **Step 3: Run and watch it fail**

Reload `tests.html`. Expected: three failures — `scoreDurationSeconds is not a function`.

- [ ] **Step 4: Implement it and use it**

In `js/ui/Transport.js`:

```js
export function scoreDurationSeconds(selected, logicalStopTime) {
  if (selected.length === 0) return 0;
  const lastCol = Math.max(...selected.map((c) => c.col));
  return (lastCol + 1) * logicalStopTime;
}
```

In `playScore`, replace the reset timer:

```js
setTimeout(() => {
  state.playing = false;
}, scoreDurationSeconds(state.selectedCells, state.logicalStopTime) * 1000);
```

- [ ] **Step 5: Run and watch it pass**

Reload `tests.html`. Expected: `8 passed, 0 failed`.

- [ ] **Step 6: Raise the logical-stop-time floor**

A slider minimum of 0 makes every note fire simultaneously with zero duration. In `js/ui/Transport.js`, change the slider construction from `createSlider(0, 100, 50)` to:

```js
createSlider(5, 100, 50);
```

That gives a floor of 0.05 s.

- [ ] **Step 7: Remove the stray label statement**

The old `sketch.js` carried `https: function draw()`, a labelled statement left from a pasted URL. Confirm it did not survive the split:

```bash
grep -rn "^https:" js/ && echo "STILL PRESENT - remove it" || echo "clean"
```

Expected: `clean`.

- [ ] **Step 8: Remove the sustainTime slider**

`EnvelopePanel.sustainTime` drives the drawn graph but is never passed to `setADSR`. ADSR has no sustain *time* — sustain is held until release — so the graph shows a shape the sound does not have.

In `js/ui/EnvelopePanel.js`: delete `this.sustainTime`, `this.sustainSlider`, its `createSlider` call, its `drawSelf` read and its label text. In the graph maths, replace the `t3` line with a fixed-width sustain segment:

```js
const t3 = t2 + this.w * 0.25;
```

Shift the release, attack-level and sustain-level sliders and their labels up by one row (20 px) so no gap is left.

- [ ] **Step 9: Verify**

Open the app. Expected: the amplitude circle is a clean shape from the first frame with no wild spikes; the envelope panel shows five sliders, evenly spaced, no gap; dragging the logical-stop-time slider never reaches 0; playing a score with several notes stacked in one column releases the play button promptly. Console clean, `tests.html` at `8 passed, 0 failed`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Fix five bugs found while restructuring

- amplitude circle read past the end of its history buffer, drawing
  NaN vertices for the first several seconds after load
- playScore timed its reset off the note count instead of the score's
  duration, locking playback when notes stacked in one column
- logical-stop-time slider could reach 0, firing every note at once
- removed a stray 'https:' label statement left from a pasted URL
- removed the sustainTime slider, which drew a shape the sound never had"
```

---

## Task 5: AudioEngine and the voice pool

Replace 952 per-cell oscillators with 16 pooled voices. Sound stays plain for now — a single sine per voice, no detuning, no effects. This isolates the structural change from the sonic one.

**Files:**
- Create: `js/audio/presets.js`, `js/audio/Voice.js`, `js/audio/AudioEngine.js`
- Modify: `js/score/Cell.js`, `js/score/Score.js`, `js/ui/Transport.js`, `js/main.js`, `tests.html`

**Interfaces:**
- Consumes: `state`, `COLORS`, `EnvelopePanel`
- Produces:
  - `js/audio/presets.js` → `export const VOICE`, `export const BUS`
  - `js/audio/Voice.js` → `export class Voice` with `noteOn(freq, waveType, adsr)`, `export function detune(freq, cents)`
  - `js/audio/AudioEngine.js` → `export const audio` — an object with `init()`, `resume()`, `noteOn(freq, waveType)`, `setEnvelope(adsr)`, `voiceCount()`
  - `js/ui/EnvelopePanel.js` → gains `values()`, returning `{ attackTime, decayTime, sustainLevel, releaseTime, attackLevel, releaseLevel }` read from its sliders. This is the only shape `AudioEngine.setEnvelope` and `Voice.noteOn` accept; keep the key names exact.

- [ ] **Step 1: Write presets.js**

Starting values. These get tuned by ear in Task 9; they are deliberately conservative here.

```js
export const VOICE = {
  detuneCents: [0],        // Task 6 widens this to [0, -7, 5]
  filterCutoffHz: 20000,   // Task 6 lowers this
  filterResonance: 1,
  noiseLevel: 0,           // Task 6 raises this
  oscLevel: 0.25,
};

export const BUS = {
  lowpassHz: 20000,
  distortionAmount: 0,
  delayTimeSec: 0,
  delayFeedback: 0,
  delayFilterHz: 2000,
  reverbSeconds: 0.01,
  reverbDecay: 0.1,
  reverbDryWet: 0,
  crackleLevel: 0,
  wobbleRateHz: 0,
  wobbleDepthCents: 0,
  outputVolume: 0.6,
};
```

- [ ] **Step 2: Write the failing test for detune**

Add to `tests.html` (import `detune` from `./js/audio/Voice.js`):

```js
function close(actual, expected, tol = 1e-6) {
  if (Math.abs(actual - expected) > tol) {
    throw new Error(`expected ${expected} +/- ${tol}, got ${actual}`);
  }
}

test("detune of 0 cents returns the same frequency", () => {
  close(detune(440, 0), 440);
});

test("detune of 1200 cents is one octave up", () => {
  close(detune(440, 1200), 880);
});

test("detune of -1200 cents is one octave down", () => {
  close(detune(440, -1200), 220);
});

test("detune of 7 cents is a small sharpening", () => {
  close(detune(440, 7), 440 * Math.pow(2, 7 / 1200), 1e-9);
});
```

- [ ] **Step 3: Run and watch it fail**

Reload `tests.html`. Expected: four failures, `detune is not a function`.

- [ ] **Step 4: Write Voice.js**

Envelope routing follows the probe result: one `p5.Envelope` per voice, `.amp(env)` on every source, triggered once.

```js
import { VOICE } from "./presets.js";

export function detune(freq, cents) {
  return freq * Math.pow(2, cents / 1200);
}

export class Voice {
  constructor(destination) {
    this.env = new p5.Envelope();
    this.lastUsed = 0;

    this.filter = new p5.LowPass();
    this.filter.freq(VOICE.filterCutoffHz);
    this.filter.res(VOICE.filterResonance);
    this.filter.disconnect();
    this.filter.connect(destination);

    this.oscs = VOICE.detuneCents.map(() => {
      const osc = new p5.Oscillator("sine");
      osc.disconnect();
      osc.amp(this.env);
      this.filter.process(osc);
      osc.start();
      return osc;
    });

    this.noise = new p5.Noise("pink");
    this.noise.disconnect();
    this.noise.amp(this.env);
    this.filter.process(this.noise);
    this.noise.start();
  }

  noteOn(freq, waveType, adsr) {
    this.env.setADSR(adsr.attackTime, adsr.decayTime, adsr.sustainLevel, adsr.releaseTime);
    this.env.setRange(adsr.attackLevel * VOICE.oscLevel, adsr.releaseLevel);
    this.oscs.forEach((osc, i) => {
      osc.setType(waveType);
      osc.freq(detune(freq, VOICE.detuneCents[i]));
    });
    this.env.play();
  }
}
```

`filter.process(src)` connects the source into the filter. The `filter.disconnect()` then `filter.connect(destination)` pair before it is what stops the filter also feeding p5's master output directly — without it, every voice is heard twice, once dry.

- [ ] **Step 5: Run and watch the detune tests pass**

Reload `tests.html`. Expected: `12 passed, 0 failed`.

- [ ] **Step 6: Write AudioEngine.js**

For this task the destination is p5's master output; Task 7 replaces it with the bus.

```js
import { Voice } from "./Voice.js";
import { BUS } from "./presets.js";

const POOL_SIZE = 16;

class AudioEngine {
  constructor() {
    this.voices = [];
    this.counter = 0;
    this.adsr = {
      attackTime: 0.1, decayTime: 0.2, sustainLevel: 0.5,
      releaseTime: 1, attackLevel: 1, releaseLevel: 0,
    };
  }

  init() {
    outputVolume(BUS.outputVolume);
    this.destination = undefined; // p5 master
    for (let i = 0; i < POOL_SIZE; i++) this.voices.push(new Voice(this.destination));
  }

  resume() {
    const ctx = getAudioContext();
    if (ctx.state !== "running") ctx.resume();
  }

  setEnvelope(adsr) {
    this.adsr = adsr;
  }

  noteOn(freq, waveType) {
    this.resume();
    let oldest = this.voices[0];
    for (const v of this.voices) if (v.lastUsed < oldest.lastUsed) oldest = v;
    oldest.lastUsed = ++this.counter;
    oldest.noteOn(freq, waveType, this.adsr);
  }

  voiceCount() {
    return this.voices.length;
  }
}

export const audio = new AudioEngine();
```

A `Voice` constructed with `destination` of `undefined` should connect to master. Verify this in Step 9; if `filter.connect(undefined)` misbehaves, guard it: `if (destination) this.filter.connect(destination); else this.filter.connect();`

- [ ] **Step 7: Strip audio out of Cell.js**

Delete `this.wave`, `this.env`, the `p5.Oscillator`/`p5.Env` construction and the whole `play()` method from `js/score/Cell.js`. `Cell` keeps `row`, `col`, `x`, `y`, `r`, `minR`, `maxR`, `selected`, `freq`, `waveType`, `color`, `playing`, plus `drawSelf`, `collide` and `compare`.

In `handleMousePressed`, replace `currentCell.play()` with:

```js
audio.noteOn(state.currentCell.freq, state.currentCell.waveType);
```

and replace the four-branch colour `switch` with `colorForWave(state.radio.value())`.

- [ ] **Step 8: Route playback through the engine**

In `js/ui/Transport.js`, `playScore` schedules `audio.noteOn(cell.freq, cell.waveType)` instead of `cell.play()`. The `cell.playing` flag and its reset timer stay — they drive the expanding dot.

In `js/main.js`, call `audio.init()` inside `window.setup`, and push the ADSR each frame in `window.draw`:

```js
audio.setEnvelope(state.envelopePanel.values());
```

Add a `values()` method to `EnvelopePanel` returning `{ attackTime, decayTime, sustainLevel, releaseTime, attackLevel, releaseLevel }` from its sliders.

- [ ] **Step 9: Verify the oscillator count collapsed**

Open the app, create a score, then in the console:

```js
audio.voiceCount()
```

Expected: `16`. Clicking dots still plays notes; playback still works; the dot still expands. Console clean.

Confirm the old allocation is gone:

```bash
grep -n "p5.Oscillator\|p5.Env\b" js/score/Cell.js && echo "STILL THERE" || echo "clean"
```

Expected: `clean`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Move audio behind AudioEngine with a 16-voice pool

Every grid cell previously owned a p5.Oscillator and a p5.Env, so
creating a score allocated 952 oscillators before a single note played.
Cell is now pure data and drawing; audio lives behind
AudioEngine.noteOn(freq, waveType) over a pool of 16 reusable voices.

Sound is unchanged for now - enriching the voice is the next step."
```

---

## Task 6: Enrich the voice

Now the sound starts changing. Three detuned oscillators, a breath of noise, a lowpass that actually filters.

**Files:**
- Modify: `js/audio/presets.js`, `js/audio/Voice.js`

**Interfaces:**
- Consumes: `Voice`, `VOICE` from Task 5
- Produces: `Voice.noiseGain` — a `p5.Gain` scaling the noise layer independently of the envelope

- [ ] **Step 1: Widen the voice preset**

`Voice.js` needs no changes; it already builds one oscillator per entry in `detuneCents` and reads the other values. Change `js/audio/presets.js`:

```js
export const VOICE = {
  detuneCents: [0, -7, 5],
  filterCutoffHz: 1800,
  filterResonance: 3,
  noiseLevel: 0.03,
  oscLevel: 0.18,
};
```

`oscLevel` drops from 0.25 to 0.18 because three oscillators now sum where one played before.

- [ ] **Step 2: Apply the noise level**

`VOICE.noiseLevel` is declared but `Voice.js` currently sends the noise through the shared envelope at full range, which is far too loud. Scale it with its own gain in the `Voice` constructor, replacing the `this.noise.amp(this.env)` line:

```js
this.noiseGain = new p5.Gain();
this.noiseGain.disconnect();
this.noiseGain.amp(VOICE.noiseLevel);
this.noiseGain.setInput(this.noise);
this.noise.amp(this.env);
this.filter.process(this.noiseGain);
```

Remove the earlier `this.filter.process(this.noise)` line so the noise reaches the filter only through its gain.

- [ ] **Step 3: Verify by ear and by eye**

Open the app and click dots. Expected: notes are noticeably warmer and thicker than before, with a slow shimmer as the detuned oscillators beat against each other. The spectrum visualiser shows three closely-spaced peaks per note where it previously showed one, and the upper harmonics are visibly reduced. Sawtooth and square should no longer sound harsh.

Console clean; `tests.html` still `12 passed, 0 failed`.

If notes now clip or distort, lower `VOICE.oscLevel` — do not change anything outside `presets.js`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Enrich the synthesis voice

Three oscillators detuned by a few cents each, a quiet pink-noise
layer for attack breath, and a resonant lowpass at 1.8 kHz. The
detuning is where the warmth comes from - slightly mistuned
oscillators beat against each other so the tone breathes."
```

---

## Task 7: The MasterBus effects chain

One shared chain for everything. Build it stage by stage so each is audible on its own.

**Files:**
- Create: `js/audio/MasterBus.js`
- Modify: `js/audio/AudioEngine.js`, `js/audio/presets.js`

**Interfaces:**
- Consumes: `BUS` from `presets.js`
- Produces: `js/audio/MasterBus.js` → `export class MasterBus` with a readable `input` property (a `p5.Gain`)

- [ ] **Step 1: Write MasterBus.js**

Chain order follows the spec. `p5.Effect.chain()` was verified present in the vendored build.

```js
import { BUS } from "./presets.js";

export class MasterBus {
  constructor() {
    this.input = new p5.Gain();
    this.input.disconnect();

    this.lowpass = new p5.LowPass();
    this.lowpass.freq(BUS.lowpassHz);
    this.lowpass.res(1);

    this.distortion = new p5.Distortion(BUS.distortionAmount, "2x");

    this.delay = new p5.Delay();
    this.delay.delayTime(BUS.delayTimeSec);
    this.delay.feedback(BUS.delayFeedback);
    this.delay.filter(BUS.delayFilterHz);

    this.reverb = new p5.Reverb();
    this.reverb.set(BUS.reverbSeconds, BUS.reverbDecay);
    this.reverb.drywet(BUS.reverbDryWet);

    this.compressor = new p5.Compressor();

    this.lowpass.process(this.input);
    this.lowpass.chain(this.distortion, this.delay, this.reverb, this.compressor);

    this.crackle = new p5.Noise("pink");
    this.crackle.disconnect();
    this.crackleGain = new p5.Gain();
    this.crackleGain.disconnect();
    this.crackleGain.amp(BUS.crackleLevel);
    this.crackleGain.setInput(this.crackle);
    this.crackleFilter = new p5.LowPass();
    this.crackleFilter.freq(4000);
    this.crackleFilter.process(this.crackleGain);
    this.crackleFilter.disconnect();
    this.crackleFilter.connect(this.compressor);
    this.crackle.start();
  }
}
```

Crackle joins at the compressor, bypassing delay and reverb. Vinyl noise belongs to the listener's room, not the recorded space; running it through reverb washes it out.

- [ ] **Step 2: Route voices into the bus**

In `js/audio/AudioEngine.js`, replace the `init()` destination:

```js
init() {
  outputVolume(BUS.outputVolume);
  this.bus = new MasterBus();
  this.destination = this.bus.input;
  for (let i = 0; i < POOL_SIZE; i++) this.voices.push(new Voice(this.destination));
}
```

Add `import { MasterBus } from "./MasterBus.js";` at the top.

- [ ] **Step 3: Verify the chain is inert before tuning**

With the Task 5 preset values (`distortionAmount: 0`, `delayTimeSec: 0`, `reverbDryWet: 0`, `crackleLevel: 0`) the chain should be audibly transparent. Open the app and click dots. Expected: sounds exactly as it did after Task 6. Console clean.

This step matters — it separates "the chain is wired wrong" from "the chain is tuned wrong."

- [ ] **Step 4: Turn the chain on, one stage at a time**

Change `js/audio/presets.js` values in this order, listening after each. If a stage sounds wrong, fix it before moving on.

```js
export const BUS = {
  lowpassHz: 3200,
  distortionAmount: 0.04,
  delayTimeSec: 0.28,
  delayFeedback: 0.35,
  delayFilterHz: 1600,
  reverbSeconds: 3.4,
  reverbDecay: 2.0,
  reverbDryWet: 0.45,
  crackleLevel: 0.015,
  wobbleRateHz: 0,
  wobbleDepthCents: 0,
  outputVolume: 0.6,
};
```

Expected at each stage: `lowpassHz` dulls the top end; `distortionAmount` adds a faint grit on peaks; the delay adds quiet repeats so notes trail off; the reverb opens up a room; the crackle adds a constant faint hiss underneath.

- [ ] **Step 5: Verify**

Open the app. Expected: notes now sustain into a room with a soft tail rather than stopping dead, and a faint constant hiss sits under everything. The amplitude circle should show a long decay after each note instead of a sharp drop. Console clean; `tests.html` still `12 passed, 0 failed`.

If reverb causes audible crackling or dropouts, lower `reverbSeconds` — `p5.Reverb` is a convolution reverb and is the most CPU-hungry stage.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add the shared MasterBus effects chain

lowpass -> soft clip -> delay -> reverb -> compressor, with a pink-noise
crackle layer joining dry at the compressor. One chain for all voices,
not one per voice: it is what makes the chain affordable, and notes
played together should sound like they share a room."
```

---

## Task 8: Tape wobble

A single shared low-frequency oscillator drifts every voice's pitch, so the whole texture wavers together the way a worn tape does.

**Files:**
- Modify: `js/audio/AudioEngine.js`, `js/audio/Voice.js`, `js/audio/presets.js`

**Interfaces:**
- Consumes: `BUS.wobbleRateHz`, `BUS.wobbleDepthCents`
- Produces: `AudioEngine.wobbleLfo` — a started, disconnected `p5.Oscillator` passed into each `Voice` constructor

- [ ] **Step 1: Create the shared LFO**

`osc.freq(lfo)` accepting an oscillator was verified in the probe. In `js/audio/AudioEngine.js`, inside `init()` before the voice loop:

```js
this.wobbleLfo = new p5.Oscillator("sine");
this.wobbleLfo.disconnect();
this.wobbleLfo.freq(BUS.wobbleRateHz);
this.wobbleLfo.amp(0);
this.wobbleLfo.start();
```

`disconnect()` is essential — without it the 0.7 Hz LFO is routed to the speakers as an audible sub-bass rumble.

Pass it to each voice: `new Voice(this.destination, this.wobbleLfo)`.

- [ ] **Step 2: Apply wobble depth per note**

The LFO's amplitude sets how many Hz of deviation it produces, and that must scale with the note's frequency for a constant depth in cents. In `js/audio/Voice.js`, accept the LFO and store it:

```js
constructor(destination, wobbleLfo) {
  this.wobbleLfo = wobbleLfo;
  // ...existing body...
}
```

At the end of `noteOn`, after the oscillator frequencies are set:

```js
if (this.wobbleLfo && BUS.wobbleDepthCents > 0) {
  const depthHz = freq * (Math.pow(2, BUS.wobbleDepthCents / 1200) - 1);
  this.wobbleLfo.amp(depthHz);
  this.oscs.forEach((osc, i) => {
    osc.freq(this.wobbleLfo);
    osc.freq(detune(freq, VOICE.detuneCents[i]));
  });
}
```

Add `import { VOICE, BUS } from "./presets.js";` — `Voice.js` currently imports only `VOICE`.

If setting `osc.freq()` twice cancels the modulation, keep only the `osc.freq(this.wobbleLfo)` call and set the base frequency through the LFO's offset instead. Verify which behaviour p5.sound 1.0.1 gives before settling — measure with `p5.Amplitude`, never `AudioParam.value`.

- [ ] **Step 3: Turn wobble on**

In `js/audio/presets.js`:

```js
wobbleRateHz: 0.7,
wobbleDepthCents: 6,
```

- [ ] **Step 4: Verify**

Open the app, hold down a long release and listen to a sustained note. Expected: a slow, gentle pitch drift roughly two-thirds of a cycle per second — noticeable as movement, not as being out of tune. If it sounds seasick, lower `wobbleDepthCents`. If you hear a low rumble, the LFO is not disconnected.

Console clean; `tests.html` still `12 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add shared tape-wobble LFO

One 0.7 Hz oscillator, disconnected from output, modulates every
voice's pitch by a few cents. Sharing one LFO means the whole texture
drifts together the way a worn tape does, rather than each note
wavering independently."
```

---

## Task 9: Tune by ear

The engine is built; now it has to actually sound right. This task has no code — only `presets.js` values — and it cannot be completed without the author listening.

**Files:**
- Modify: `js/audio/presets.js`

**Interfaces:**
- Consumes: everything
- Produces: a tuned preset

- [ ] **Step 1: Establish a reference score**

Draw a short sparse phrase — six to eight notes, spread across two octaves' worth of rows, mostly in the lower half of the grid, with gaps between them. Lo-fi ambient is sparse; a dense chromatic run will not tell you anything useful. Keep this same score for every comparison.

- [ ] **Step 2: Present it to the author for a listen**

Play the reference score and the reference track back to back. Ask specifically: too bright or too dull? Too wet or too dry? Too much or too little movement? Is the crackle audible, and is it pleasant or distracting?

- [ ] **Step 3: Adjust and repeat**

Translate the answer into `presets.js` and only `presets.js`:

| Feedback | Parameter |
|---|---|
| too bright / harsh | lower `VOICE.filterCutoffHz`, then `BUS.lowpassHz` |
| too dull / muffled | raise the same two |
| too washed out | lower `BUS.reverbDryWet`, then `reverbSeconds` |
| too dry / small | raise `BUS.reverbDryWet` |
| too static | raise `BUS.wobbleDepthCents` and `VOICE.detuneCents` spread |
| seasick / out of tune | lower both |
| too clean | raise `BUS.distortionAmount` and `crackleLevel` |
| too noisy | lower `crackleLevel`, then `VOICE.noiseLevel` |
| echoes are muddy | lower `delayFeedback` or `delayFilterHz` |

If a request cannot be met from `presets.js` alone, stop and raise it rather than editing wiring code — that is a design change, not a tuning one.

- [ ] **Step 4: Commit the tuned preset**

```bash
git add js/audio/presets.js
git commit -m "Tune lo-fi preset by ear"
```

- [ ] **Step 5: Update the README**

The README describes four wave types producing distinct sounds and documents the interface. Check each claim still holds after the sonic change, and update the "Graphs and Visualizations" section if the sustainTime slider's removal made it inaccurate.

- [ ] **Step 6: Final verification**

- `tests.html` shows `12 passed, 0 failed`
- app console is clean through create → click → play → clear → download
- `audio.voiceCount()` returns `16`
- `grep -rn "p5.Oscillator" js/score/` returns nothing
- the downloaded `score.txt` still matches the README's documented format

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Update README for the lo-fi audio engine"
```

---

## Self-Review Notes

**Spec coverage:** Module strategy → Task 2. File structure → Tasks 1–3. Audio interface → Task 5. Voice → Tasks 5–6. MasterBus → Task 7. Tape wobble → Task 8. Presets as data → Tasks 5, 9. Five bug fixes → Task 4. Testing → Task 3 (harness), 4, 5. Implementation order → Tasks 1–9 follow the spec's five steps, with the restructure split into three verifiable checkpoints.

**Known soft spots, flagged rather than hidden:**
- Task 8 Step 2 carries a genuine unknown — whether calling `osc.freq()` twice cancels LFO modulation in p5.sound 1.0.1. The probe confirmed `osc.freq(lfo)` is *accepted*, not how it composes with a subsequent scalar call. The step says to verify before settling.
- Task 5 Step 6 hedges on `filter.connect(undefined)`. Guard included.
- Task 6 Step 2 changes `Voice.js`, which Task 6's Files list would otherwise not have predicted; it is listed in the step itself.
