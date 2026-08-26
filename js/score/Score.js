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
