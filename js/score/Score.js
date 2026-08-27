import { COLORS, GRID, colorForWave } from "../config.js";
import { Scale } from "./Scale.js";
import { noteAt, ghostLength } from "./Note.js";

export class Score {
  constructor(y, scale = new Scale()) {
    this.x = width * GRID.xRatio;
    this.y = y;
    this.w = width * GRID.wRatio;
    this.cellWidth = GRID.cellWidth;
    this.cellHeight = GRID.cellHeight;
    this.scale = scale;
    // ceil, not floor: the last dot centre sits at x + (cols-1)*cellWidth,
    // which still fits inside w - flooring would silently drop a usable column.
    this.cols = Math.ceil(this.w / this.cellWidth);
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

  hoveredCell() {
    if (!this.inside(mouseX, mouseY)) return null;
    return { row: this.rowAt(mouseY), col: this.colAt(mouseX) };
  }

  // The hint that a note can be dragged out to the right. Only ever drawn on
  // an empty cell: on an existing note a click deletes, so pointing right
  // there would advertise a gesture that does something else.
  drawGhost(row, col) {
    const len = ghostLength(this.notes, row, col, this.cols, GRID.ghostColumns);
    if (len < 2) return;

    const d = GRID.dotSize;
    const left = this.cellX(col) - d / 2;
    const y = this.cellY(row);
    const w = (len - 1) * this.cellWidth + d;

    noStroke();
    fill(...COLORS.ghost);
    rect(left, y - d / 2, w, d, d / 2);

    // Chevron just past the tip, so the direction reads without the capsule
    // having to be bright enough to compete with real notes.
    const tip = left + w + 5;
    push();
    noFill();
    stroke(...COLORS.ghostTip);
    strokeWeight(1.5);
    line(tip - 4, y - 4, tip, y);
    line(tip, y, tip - 4, y + 4);
    pop();
  }

  drawSelf() {
    push();
    noStroke();

    const hovered = this.hoveredCell();
    const hoveredNote = hovered ? noteAt(this.notes, hovered.row, hovered.col) : null;
    const d = GRID.dotSize;

    // Background dots and row labels.
    for (let row = 0; row < this.rows; row++) {
      const y = this.cellY(row);
      fill(...COLORS.cell);
      for (let col = 0; col < this.cols; col++) {
        ellipse(this.cellX(col), y, d, d);
      }
      fill(COLORS.content);
      text(this.scale.labelForRow(row), this.x - 24, y);
    }

    // Hint and hover emphasis, over an empty cell only.
    if (hovered && !hoveredNote) {
      this.drawGhost(hovered.row, hovered.col);
      noStroke();
      fill(COLORS.content);
      const hd = d * GRID.hoverScale;
      ellipse(this.cellX(hovered.col), this.cellY(hovered.row), hd, hd);
    }

    // Notes as capsules. At length 1 the width equals dotSize, so the note
    // renders as a circle identical to a background dot.
    rectMode(CORNER);
    for (const note of this.notes) {
      fill(colorForWave(note.waveType));
      const w = (note.length - 1) * this.cellWidth + d;
      const h = note.playing || note === hoveredNote ? d * GRID.hoverScale : d;
      rect(this.cellX(note.startCol) - d / 2, this.cellY(note.row) - h / 2, w, h, h / 2);
    }

    this.collide();
    pop();
  }

  collide() {
    cursor(this.inside(mouseX, mouseY) ? CROSS : ARROW);
  }
}
