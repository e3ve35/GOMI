# Score Model: note duration and pitch model

Design spec — 2026-08-26. Sub-project 1 of 4.

## Goal

Make it possible to express a musical idea on the GOMI grid. Today a note has no
duration and the 14 rows are one chromatic octave, so the tool can only produce
even runs of eighth notes within a single octave. This sub-project changes what a
note *is*.

## Non-goals

Deferred to later sub-projects, deliberately:

- BPM, bar lines, sample-accurate scheduling, playhead, loop, stop (sub-project 2)
- Undo/redo, save/load (sub-project 3)
- WAV render (sub-project 4)
- Velocity, per-note envelopes, note drag-to-move

## Starting point

Branched from `lofi-audio-engine`. Task 1 of the implementation plan reverts
`Voice.js` to a single plain `p5.Oscillator` and deletes `MasterBus.js`,
`presets.js`, and the shared wobble LFO — main's voice, the branch's structure.

## Decisions

| Decision | Choice |
| --- | --- |
| Note visual | Capsule. A length-1 note renders identically to today's dot. |
| Length gesture | Press and drag right. No drag = length 1. |
| Row model | Scale degrees only. You cannot play an out-of-scale note. |
| Range | 3 octaves, 16px rows |
| Note identity | Stores a **row index**, not a pitch |

Storing the row rather than the pitch is what makes key and scale changes total:
the scale is a pure function `row -> midi`, so changing it re-maps every note's
pitch while preserving the shape of the melody. No note is ever orphaned.

## Data model

`Note` becomes its own object, owned by `Score.notes`:

    Note { row, startCol, length, waveType }   // length >= 1, in columns

This is the core change. Today `state.selectedCells` holds the very same `Cell`
objects the grid owns, so a note is a `{row, col}` coordinate and *cannot* span
time.

Consequently **the 952-object `Cell` grid is deleted**. It exists only to be
drawn and hit-tested, and both are cheaper without it:

- Hit test: `col = floor((mouseX - x) / cellWidth)`, `row = floor((mouseY - y) / cellHeight)`
- Background dots: drawn in a double loop, no objects behind them

Two improvements fall out at no cost. The whole 20x16 cell becomes the click
target instead of requiring a hit within 7px of a dot centre (`Cell.collide`).
And row labels become *computed*, which permanently removes the class of bug
currently in `config.js`, where MIDI 64 is labelled `e#4` (it is E4) and MIDI 73
is labelled `d5` (it is C#5).

## Scale mapping

    Scale { rootMidi, intervals, octaves }

    rowCount = intervals.length * octaves + 1     // + 1 for the top root

    midiForRow(row):
      degreeFromBottom = (rowCount - 1) - row     // row 0 is the TOP row
      octaveOffset     = floor(degreeFromBottom / intervals.length)
      degreeIndex      = degreeFromBottom % intervals.length
      return rootMidi + 12 * octaveOffset + intervals[degreeIndex]

Row 0 is the highest pitch, matching the existing top-down layout. The `+ 1` row
gives the range a closing root, so 3 octaves of C major spans C3 up to C6.

Offered scales: major `[0,2,4,5,7,9,11]`, natural minor `[0,2,3,5,7,8,10]`,
dorian `[0,2,3,5,7,9,10]`, major pentatonic `[0,2,4,7,9]`, minor pentatonic
`[0,3,5,7,10]`. Default root C3 (MIDI 48), giving a bass register and a melody
register in the same view.

Labels come from MIDI, not a hand-written table:

    labelForRow(row) -> NAMES[midi % 12] + (floor(midi / 12) - 1)

### Changing scale

A 7-note scale is 22 rows; a pentatonic is 16. Switching to a smaller scale
leaves notes on rows that no longer exist. Rule: **clamp rows into range, then
drop exact duplicates** (same row and `startCol`), keeping the longer note.

This is total and never crashes, but it *is* lossy at the top of the range, and
until undo lands in sub-project 3 that loss is unrecoverable. Revisit once undo
exists.

## Interaction

- **Press on an existing note** — delete it.
- **Press on empty space** — create `length: 1`, audition it, begin a drag.
- **Drag right** — `length = max(1, col - startCol + 1)`.
- **Release** — commit.

No click-versus-drag threshold is needed: press-on-note and press-on-empty are
already unambiguous, and a press with no drag is simply length 1.

`length` is clamped so a note cannot run into the next note in its row:

    maxLength = (nextNoteStartCol ?? totalCols) - startCol

Dragging into a neighbour truncates rather than overwriting it.

## Playback

Durations are audible in this sub-project. Note that `p5.Envelope.play(unit,
startTime, sustainTime)` **cannot** be used: its implementation is

    triggerRelease(t, i + this.aTime + this.dTime + ~~n)

and `~~n` truncates sustain time to whole seconds, so a 0.5s note would floor to
0. Use `triggerAttack()` and a separately scheduled `triggerRelease()` instead.

`AudioEngine` gains a note-off path. Because the 16-voice pool steals the oldest
voice under load, a stolen voice's pending release would otherwise cut off
whichever note took it over. Each `noteOn` therefore increments a token on the
voice, and `noteOff(voice, token)` releases only while the token still matches.

Scheduling stays on the existing `setTimeout` transport — replacing it is
sub-project 2's job. This sub-project only makes length audible, not accurate.

## Layout

3 octaves is 22 rows. At 16px that is 352px, so the grid runs y=100 to y=452 and
the controls compact into the band below it.

The FFT has to move regardless: its panel is nominally y=310–480 at x=926–1126,
which overlaps the grid's bottom rows. It does not *look* overlapped today only
because of a rendering bug — `h = map(spectrum[i], 0, 255, fftHeight, 0)` maps
silence to full height, and `rect(x, fftHeight, w, h)` then draws downward from
the panel's bottom edge. The result is a solid green block 170px below the panel,
which is what the app renders while silent.

New band (all below y=470):

| Element | Position |
| --- | --- |
| Envelope panel | x `width*0.25`, y 500, 350x150 |
| Amplitude | centre (`width*0.1`, 600), radius 80 |
| FFT | x `width*0.65`, y 500, 200x150 |
| Buttons | x `width-260`, y 500 / 545 / 590 |

Two one-line fixes are in scope because the move forces touching this code:

- FFT: `h = map(spectrum[i], 0, 255, 0, fftHeight)`, `rect(x, fftHeight - h, w, h)`
- Amplitude: prefill `amphistory` with 360 zeros. It currently reads
  `amphistory[i]` for i up to 359 before the array is that long, so `map(undefined, ...)`
  yields NaN vertices and the circle does not render.

## Rendering

A note is a rounded rect with corner radius `dotSize / 2`:

    width = (length - 1) * cellWidth + dotSize

At length 1 this is exactly `dotSize` — a circle, identical to today's dot. Ends
stay centred on cell centres at every length.

The polyline connecting selected cells (`Score.drawSelf`) is **removed**. With
durations and simultaneous notes it no longer describes anything.

## Export

`toNyquist` currently hardcodes every duration to `logicalStopTime`. It becomes
`note.length * logicalStopTime`, which is the first time the exported score has
actually matched what the grid shows.

## Testing

All of the following are pure functions, testable in `tests.html` without audio
or a canvas:

- `midiForRow`: bottom row is the root; top row is root + `12 * octaves`; a known
  C-major row/MIDI table
- `labelForRow`: MIDI 60 is `C4` and 73 is `C#5` — a regression test for the two
  wrong labels being removed
- `clampLength` against the next note in the row, and against the grid edge
- Scale change: clamping and duplicate-dropping
- `toNyquist`: durations reflect `note.length`, notes stay in ascending time order

## Files touched

`js/audio/Voice.js` (reverted), `js/audio/MasterBus.js` and `js/audio/presets.js`
(deleted), `js/audio/AudioEngine.js` (note-off + tokens), `js/score/Cell.js`
(deleted), `js/score/Note.js` (new), `js/score/Scale.js` (new),
`js/score/Score.js`, `js/config.js`, `js/ui/Transport.js`, `js/ui/Visualizers.js`,
`js/nyquist.js`, `js/main.js`, `tests.html`.
