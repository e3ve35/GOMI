# GOMI — Lo-fi Audio Engine

**Date:** 2026-08-25
**Status:** Design approved; open question resolved by probe 2026-08-25

## Goal

Change what GOMI *sounds like*. Today every note is a single bare `p5.Oscillator`
routed straight to the speakers, which is why it sounds like a test tone. The
target is the warm, roomy, tape-worn character of lo-fi ambient — the reference
being hijaq's "the way things are."

Achieving that also requires reorganising the code, because the current
structure has no room for it: the audio is welded into the grid cells, and there
are 952 oscillators standing in the way.

## Non-goals

Decided explicitly, not by omission:

- **No samples.** Pure synthesis only. This keeps the repo dependency-free and
  keeps faith with GOMI's stated premise of visualising synthesis parameters.
  The cost is accepted: synthesis reaches pads and mellow electric-piano-ish
  tones, not a convincing acoustic piano.
- **No changes to the musical model.** The 14-row chromatic grid, one note per
  cell, uniform note length, and the click-to-toggle interaction all stay as
  they are. Chords, scales, swing, tempo, and looping are out of scope.
- **No new runtime dependencies.** Not Tone.js, not npm, not a build step.
- **No changes to the Nyquist export format.** It moves to its own file; its
  output is unchanged.

## Verified constraints

Checked against the repo rather than assumed:

| Fact | How it was verified |
|---|---|
| p5.js 1.6.0, p5.sound 1.0.1, both vendored in `lib/` | file headers |
| p5.sound provides `Reverb`, `Delay`, `LowPass`, `Distortion`, `Compressor`, `Gain`, `Noise` | grep of `lib/p5.sound.min.js` |
| p5.Effect provides `chain()`, `setInput()`, `drywet()` | grep of `lib/p5.sound.min.js` |
| p5 global mode picks up `window.setup` assigned from an ES module | built a minimal page, served it, read `SETUP RAN` from the browser console |
| The grid allocates 952 `p5.Oscillator` instances (14 rows × 68 cols) | computed from `Canvas.js` constructor values |
| One `p5.Envelope` drives 3 oscillators + noise via `.amp(env)`; rest level 0.0000, peak 0.4067 | browser probe measuring `p5.Amplitude` output |
| `env.play(gain)` leaks — gain sits open at 0.1128 at rest | same probe |
| `p5.Effect.chain()` wires lowpass→distortion→delay→reverb→compressor | browser probe |
| `osc.freq(lfo)` accepts an oscillator for pitch modulation | browser probe |

That fourth row is the one the restructure depends on. Because it holds, every
drawing call keeps its current global form — `ellipse(...)`, not `p.ellipse(...)`
— and no p5 instance-mode conversion is needed.

## Architecture

### Module strategy

`index.html` keeps two classic script tags for the vendored libraries, then a
single module entry point:

```html
<script src="lib/p5.min.js"></script>
<script src="lib/p5.sound.min.js"></script>
<script type="module" src="js/main.js"></script>
```

All project code becomes ES modules with explicit imports. This is the core
maintainability change. At present `Cell.js` depends on `selectedCells`,
`myRadio`, `globalADSR`, `sineColor`, `triangleColor`, `sawtoothColor`, and
`squareColor` — seven globals defined in other files, with nothing declaring the
relationship. After the change those dependencies are written at the top of the
file, and a misspelling is an error rather than a silent `undefined`.

`main.js` is the only file permitted to assign to `window`, and it assigns
exactly the p5 lifecycle hooks: `preload`, `setup`, `draw`, `mousePressed`.

### File structure

```
index.html
tests.html
css/styles.css
docs/superpowers/specs/
js/
  main.js                 p5 lifecycle wiring only
  config.js               note table, colours, layout constants
  nyquist.js              score -> Nyquist text (pure function)
  audio/
    AudioEngine.js        public API; owns the pool and the bus
    Voice.js              detuned oscillator stack + filter + envelope
    MasterBus.js          the shared effects chain
    presets.js            all sound parameters, as plain data
  score/
    Score.js              grid model (formerly Canvas.js)
    Cell.js               position, colour, selected state — no audio
  ui/
    EnvelopePanel.js      ADSR sliders + graph (formerly Envelope.js)
    Transport.js          play / clear / export buttons and scheduling
    Visualizers.js        amplitude circle + spectrum
```

**Deleted:** `js/osc.js` and `js/amp.js`. Both are dead — neither is referenced
by `index.html`, both redefine `setup`/`draw`/`preload`, and both load a
`sounds/song.wav` that does not exist in the repo. Adding either to the page
would break the application.

**Renamed:** `Canvas.js` → `Score.js`. The class models the score; the name
`Canvas` collides with p5's canvas and with `createCanvas`.

**Extracted:** the ~80 lines of CSS currently inline in `index.html` move to
`css/styles.css`.

### The audio interface

The rest of the application knows exactly one thing about audio:

```js
audio.noteOn(freq, waveType)
```

`Cell` calls it on click; `Transport` calls it during playback. Everything
behind it — voice allocation, detuning, filtering, the effects chain — can
change without touching any UI or drawing code. Today the equivalent knowledge
is spread across `Cell`'s constructor, `Cell.play()`, and `playScore()`.

`AudioEngine` also exposes `setEnvelope(adsr)` so `EnvelopePanel` can push slider
values in without reaching into voices, and `resume()` to satisfy the browser
autoplay policy on first user gesture.

### Voice

A `Voice` is one playable note. It holds:

- **Three oscillators**, detuned from each other by a few cents. The count is
  whatever `VOICE.detuneCents` holds, so it is a preset value rather than a
  structural one. This is where most
  of the warmth comes from: slightly mistuned oscillators beat gently against one
  another, so the tone breathes instead of sitting still. Detuning is applied by
  computing the offset frequency directly (`f * 2 ** (cents / 1200)`) rather than
  relying on a `detune` parameter, which p5.Oscillator does not expose cleanly in
  1.0.1.
- **A quiet noise layer**, giving the attack some breath instead of a clean edge.
- **A per-voice lowpass filter**, shaving the harsh upper harmonics. This is the
  "warm"/"muffled" quality, and it is why a sawtooth stops sounding like a buzzer.
- **An amplitude envelope**, driven by the existing ADSR sliders.

Voices are allocated once and reused. `AudioEngine` keeps a pool of 16 and hands
out the least-recently-used one on `noteOn`; a 17th simultaneous note steals the
oldest voice. Sixteen voices of three oscillators plus a noise source and a
filter is roughly 80 audio nodes in total, against 952 today — which is what
makes a richer voice affordable at all.

**Resolved by probe (2026-08-25).** A single `p5.Envelope` per voice drives all
three oscillators *and* the noise source: apply `.amp(env)` to each source, then
trigger once with `env.play()`. Measured output level at rest 0.0000, peak
0.4067.

The alternative — `env.play(gain)` on a shared `p5.Gain` — is **rejected**. It
leaves the gain sitting open at level 0.1128 when idle, so sound leaks between
notes.

A methodological note for whoever verifies this later: reading
`AudioParam.value` cannot detect any of this. A connected audio signal sums on
top of the intrinsic value and never appears in `.value`. Measure real output
with `p5.Amplitude.setInput(source)` instead. Do not leave stale `p5.Amplitude`
instances bound to stopped sources — they throw
`Cannot read properties of undefined` on the next poll.

### MasterBus

Every voice feeds one shared chain. Not one chain per voice — one chain total.
This is both what makes it cheap enough to be worth doing, and what is musically
correct: notes played together should sound like they are in the same room as
each other.

```
voices ──> lowpass ──> soft clip ──> delay ──> reverb ──┐
                                                        ├──> compressor ──> out
crackle ────────────────────────────────────────────────┘
```

| Stage | p5.sound class | Purpose |
|---|---|---|
| lowpass | `p5.LowPass` | overall warmth; rolls off the top end |
| soft clip | `p5.Distortion` | very low amount; rounds peaks and adds grit |
| delay | `p5.Delay` | quiet repeats so notes trail off rather than stop dead |
| reverb | `p5.Reverb` | places the sound in a room |
| crackle | `p5.Noise` + `p5.LowPass` | constant faint vinyl hiss, joined dry |
| compressor | `p5.Compressor` | glues the layers and controls peaks |

Crackle deliberately bypasses the reverb and delay. Vinyl noise belongs to the
listener's room, not to the recorded space, and running it through reverb makes
it wash out.

**Tape wobble** is handled at the voice rather than on the bus: a single shared
low-frequency oscillator (~0.7 Hz), disconnected from output so it is never
heard directly, modulates voice pitch by a few cents. p5.sound supports passing
an oscillator to `.freq()` for exactly this. One LFO serves all voices, so the
whole texture drifts together the way a worn tape does.

Chaining uses `p5.Effect.chain()`, confirmed present in the vendored build,
rather than hand-wiring `.process()` calls.

### Sound parameters as data

`presets.js` holds every sound number as plain exported data:

```js
export const VOICE = {
  detuneCents: [0, -7, +5],
  filterCutoffHz: 1800,
  noiseLevel: 0.03,
  // ...
};

export const BUS = {
  wobbleRateHz: 0.7,
  wobbleDepthCents: 6,
  delayTimeSec: 0.28,
  delayFeedback: 0.35,
  reverbSeconds: 3.4,
  reverbDecay: 2.0,
  crackleLevel: 0.02,
  // ...
};
```

This exists because reaching a convincing lo-fi sound is not one change. It is
dozens of small adjustments made by ear across several sittings. Isolating them
means tuning never touches wiring code, and it leaves them ready to be exposed
as on-screen controls later — which fits GOMI's premise of making synthesis
parameters visible.

### Data flow

```
click ──> Cell (score/Cell.js)
            │ marks itself selected
            └──> AudioEngine.noteOn(freq, waveType)
                   └──> Voice from pool ──> MasterBus ──> speakers
                                                  │
                                p5.FFT / p5.Amplitude read master output
                                                  │
                                                  └──> Visualizers
```

The visualisers read the master output, so they need no changes to keep working
— and they become more informative, showing the reverb tail and filter movement
instead of a single static harmonic stack.

## Bug fixes in scope

All five are folded into the restructure step, which is otherwise a
no-behaviour-change move:

1. **`sketch.js:189`** — the amplitude circle reads `amphistory[i]` for `i` up to
   359 before the array holds 360 entries, feeding `undefined` into `map()` and
   drawing NaN vertices for several seconds after load. Fix: pre-fill the history
   buffer, or iterate over its actual length.
2. **`sketch.js:217`** — `playScore()` clears the `playing` flag after
   `selectedCells.length * logicalStopTime`. That is the note count, not the
   score's duration. Ten notes stacked in column 0 lock playback for ten times
   longer than the music lasts. Fix: derive the end from the maximum column index.
3. **`sketch.js:58`** — the `logicalStopTime` slider's minimum of 0 makes every
   note fire simultaneously with zero duration. Fix: raise the slider minimum
   from 0 to 5, giving a floor of 0.05 s.
4. **`sketch.js:110`** — `https: function draw()`, a stray label statement left
   from a pasted URL. Parsed as a labelled statement. Remove.
5. **`Envelope.js`** — `sustainTime` drives the drawn graph but is never passed
   to `setADSR`. ADSR has no sustain *time*; sustain is held until release. The
   graph therefore shows a shape the sound does not have. Fix: remove the
   `sustainTime` slider and draw sustain as a flat segment of fixed width. The
   alternative — driving note duration from it — is rejected because per-note
   duration is a change to the musical model, which is a non-goal.

## Testing

No npm, no build step. `tests.html` imports the pure modules and prints pass/fail
in the browser, covering the logic that is genuinely coverable:

- `nyquist.js` — score model in, expected Nyquist text out
- `sortedInsert` — ordering, duplicates, empty and single-element arrays
- note-name → MIDI → frequency mapping
- detune maths in `Voice` (cents → frequency ratio)

Audio and drawing are not unit-testable here without mocking far more than the
tests would be worth. They are verified by loading the page, driving it, and
checking the console — and, for the sound itself, by ear.

**Stated plainly:** whether the result actually resembles the reference track is
a judgement only the author can make. Expect several rounds of adjustment
against `presets.js`.

## Implementation order

Detailed steps come from the implementation plan; this is the shape:

1. **Restructure with no intended behaviour change**, apart from the five named
   bug fixes. Modules, new file layout, CSS extracted, dead files deleted. Verify
   the page still looks and behaves as it did.
2. **Introduce `AudioEngine` with a voice pool**, still producing the current
   plain sound. Verify note count and polyphony behave, and that 952 oscillators
   are gone.
3. **Enrich the voice** — detuning, noise layer, per-voice filter.
4. **Add `MasterBus`** — one stage at a time, each audible on its own.
5. **Tune `presets.js` by ear**, iterating with the author.

Splitting 1 from the rest matters: if the sound goes wrong afterwards, it is
known to be the sound and not the move.

## Risks

| Risk | Mitigation |
|---|---|
| p5.Reverb is a convolution reverb and can be CPU-heavy | Tune `reverbSeconds` down; it is a single shared instance, not per voice |
| Browser autoplay policy blocks audio until a user gesture | `AudioEngine.resume()` on first click; the app already requires a click to create a score |
| Restructure introduces a silent regression | Step 1 is behaviour-preserving and verified before any audio work begins |
| Synthesis may not get close enough to satisfy | Accepted and stated up front; `presets.js` keeps re-tuning cheap, and the sample decision can be revisited as new work |

## Open questions

None. The envelope/gain question was resolved by probe before planning; see
the Voice section.
