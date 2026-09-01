# GOMI roadmap

A running list of what could come next, roughly ordered by what changes the
project most per unit of work. Nothing here is committed to — it is a menu to
pick from. Move an item to **Done** with the commit that closes it.

Status: all items **Not started** unless noted.

## The gap that matters most

Nothing you make survives the tab. There is no save, no load, no sharing, and
no way back in from the exports. Every piece is disposable unless it is
hand-written as a script like `examples/falling-water.js`.

### 1. Save / load / share
Serialize the whole score — notes, glides, root, scale, wave, envelope, column
length — and restore it. Three tiers, in increasing effort:

- localStorage autosave, so a reload does not lose the piece
- download / upload a `.gomi.json` file
- pack the score into the URL hash, so a link *is* the piece

The last tier is what makes GOMI shareable: the README example becomes
something anyone can post.

## Deeper composing

### 2. Undo / redo
One mis-click erases a long note with no recovery. Cheap once the score is
serializable — an undo entry is the same snapshot as a save.

### 3. Loop and playhead scrubbing
Play from the column you click; loop a region. Playback currently always starts
at the leftmost column, which makes editing the end of a piece slow.

### 4. Per-note velocity
Vertical drag after placing, or a right-drag, mapped to gain. Every note is at
one level today, which is most of why a score sounds mechanical.

### 5. Layers
Wave type is a global brush and the canvas is a single plane. Separate layers,
each with its own wave and envelope and its own mute / hide toggle, would let a
bass line and a melody differ in timbre. The Nyquist export already names one
instrument per wave, so the idea is half-present in the file format.

### 6. More scales, plus a chromatic escape hatch
Whole tone, blues, harmonic minor — and a "no scale" mode for anyone who wants
the wrong notes back.

## Wider reach

### 7. MIDI export, and MIDI keyboard input
MIDI is the format that opens in every DAW; the Nyquist export reaches a much
smaller audience. Input from a connected keyboard is the same data flowing the
other way.

### 8. Keyboard navigation and ARIA on the grid
A grid of dots is unusually close to being playable without a mouse, and is
currently not playable without one at all.

### 9. Touch and mobile
Press-and-drag is a touch-native gesture, so it may already half-work. Nobody
has checked.

## Sound

### 10. A master effect or two
Reverb (a `ConvolverNode`) and a filter with cutoff exposed on the panel. Likely
the largest jump in perceived quality per line of code — dry oscillators are
what make the output sound like a demo.

### 11. Tempo and quantization
BPM plus subdivisions as an alternative to setting `logical-stop-time` in raw
seconds. Reads more like music than a column duration does.

## Suggested order

1. **Save / load / share** (#1) — small, and it makes the project demoable
2. **Undo / redo** (#2) — nearly free once #1 exists
3. **Reverb** (#10) — the cheapest real improvement to how it sounds
4. **Layers** (#5) — the next actual feature

## Done

_(nothing yet)_
