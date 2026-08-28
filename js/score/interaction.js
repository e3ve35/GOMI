import { state } from "../state.js";
import {
  Note, noteAt, maxLengthFor, minStartFor, glidePair, clearGlidesTo,
} from "./Note.js";
import { audio } from "../audio/AudioEngine.js";

// The audition sounds for as long as the button is held, so it is only ever
// silenced by an explicit noteOff - a missed one holds at sustain forever.
function releaseAudition() {
  audio.noteOff(state.auditionHandle);
  state.auditionHandle = null;
}

export function handleMousePressed(event) {
  // p5 fires this for clicks anywhere on the page, including the buttons and
  // sliders layered over the canvas - only the canvas itself places notes.
  if (event && event.target && event.target.tagName !== "CANVAS") return;
  // Without this, a right-click meant for the context menu writes a note.
  if (mouseButton !== LEFT) return;

  // Covers any earlier audition whose mouseup never arrived: its handle is
  // about to be overwritten, which would strand that voice permanently.
  releaseAudition();

  const score = state.score;
  if (!score || !score.inside(mouseX, mouseY)) return;

  const row = score.rowAt(mouseY);
  const col = score.colAt(mouseX);

  const hit = noteAt(score.notes, row, col);
  // Pressing a note starts a link rather than deleting it outright: where the
  // press ends decides between the two. Deleting therefore happens on the way
  // up, which for a plain click is the same gesture it always was.
  if (hit) {
    state.linking = hit;
    return;
  }

  const note = new Note(row, col, 1, state.radio.value());
  score.notes.push(note);
  state.dragging = note;
  // The press cell is the anchor, not necessarily the start: a drag that
  // goes left grows the note back from here instead of doing nothing.
  state.dragAnchor = col;
  state.auditionHandle = audio.noteOn(score.freqForRow(row), note.waveType);
}

export function handleMouseDragged() {
  const note = state.dragging;
  if (!note) return;
  const score = state.score;

  // Leaving the note's own row turns the drag into a glide: the note keeps
  // the length it has reached and the link follows the cursor from there.
  // Coming back to the row resumes lengthening, so neither gesture traps you.
  if (score.rowAt(mouseY) !== note.row) {
    state.linking = note;
    return;
  }
  state.linking = null;

  const others = score.notes.filter((n) => n !== note);
  const anchor = state.dragAnchor;
  // The neighbours either side of the anchor bound the drag in both
  // directions, so a note can never be grown over one by reaching past it.
  const first = minStartFor(others, note.row, anchor);
  const last = anchor + maxLengthFor(others, note.row, anchor, score.cols) - 1;
  const wanted = Math.max(first, Math.min(score.colAt(mouseX), last));
  note.startCol = Math.min(anchor, wanted);
  note.length = Math.abs(wanted - anchor) + 1;
}

export function handleMouseReleased() {
  releaseAudition();
  // A note the drag itself wrote, rather than one that was already there:
  // released over nothing it stays as it is, where an existing note would
  // have its glide cleared.
  const drawn = state.dragging !== null;
  state.dragging = null;
  state.dragAnchor = null;
  finishLink(drawn);
}

// Where a glide drag ended decides what it meant: back on the note it began
// on, delete it; on another note, join the two; on an empty cell, write the
// note that was missing; and for a note that was already there, dropping it
// on nothing clears the glide, so one gesture both makes and unmakes a link.
function finishLink(drawn) {
  const from = state.linking;
  if (!from) return;
  state.linking = null;

  const score = state.score;
  const inside = score.inside(mouseX, mouseY);
  const row = score.rowAt(mouseY);
  const col = score.colAt(mouseX);
  const target = inside ? noteAt(score.notes, row, col) : null;

  if (target === from) {
    score.notes.splice(score.notes.indexOf(from), 1);
    clearGlidesTo(score.notes, from);
    return;
  }

  // Dropped on an empty cell after writing a note: write the other end too,
  // so one gesture makes both notes and the glide between them.
  if (drawn && !target && inside) {
    const landed = new Note(row, col, 1, from.waveType);
    const drawnPair = glidePair(from, landed);
    if (drawnPair) {
      score.notes.push(landed);
      drawnPair.first.glideTo = drawnPair.second;
    }
    return;
  }

  const pair = glidePair(from, target);
  if (!pair) {
    // An existing note dropped on nothing loses the glide it had; a note this
    // drag wrote never had one to lose.
    if (!drawn) from.glideTo = null;
    return;
  }
  pair.first.glideTo = pair.second;
}
