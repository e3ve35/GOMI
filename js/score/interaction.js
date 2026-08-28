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
  state.dragging = null;
  state.dragAnchor = null;
  finishLink();
}

// A press that began on a note: delete it if the mouse never left it, join it
// to the note it was dropped on, or - dropped anywhere else - drop the glide
// it already had, so the same gesture that makes a link also unmakes one.
function finishLink() {
  const from = state.linking;
  if (!from) return;
  state.linking = null;

  const score = state.score;
  const target = score.inside(mouseX, mouseY)
    ? noteAt(score.notes, score.rowAt(mouseY), score.colAt(mouseX))
    : null;

  if (target === from) {
    score.notes.splice(score.notes.indexOf(from), 1);
    clearGlidesTo(score.notes, from);
    return;
  }

  const pair = glidePair(from, target);
  if (!pair) {
    from.glideTo = null;
    return;
  }
  pair.first.glideTo = pair.second;
}
