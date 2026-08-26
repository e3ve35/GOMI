import { state } from "../state.js";
import { Note, noteAt, maxLengthFor } from "./Note.js";
import { audio } from "../audio/AudioEngine.js";

export function handleMousePressed(event) {
  // p5 fires this for clicks anywhere on the page, including the buttons and
  // sliders layered over the canvas - only the canvas itself places notes.
  if (event && event.target && event.target.tagName !== "CANVAS") return;

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
  state.auditionHandle = audio.noteOn(score.freqForRow(row), note.waveType);
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
  audio.noteOff(state.auditionHandle);
  state.auditionHandle = null;
  state.dragging = null;
}
