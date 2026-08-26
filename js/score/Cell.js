import { state } from "../state.js";
import { colorForWave } from "../config.js";
import { sortedInsert } from "./sortedInsert.js";
import { audio } from "../audio/AudioEngine.js";

export class Cell {
  constructor(row, col, x, y, freq = 440) {
    this.row = row;
    this.col = col;
    this.x = x;
    this.y = y;
    this.r = 7;
    this.minR = this.r;
    this.maxR = this.r * 2;
    this.selected = false;
    this.freq = freq;
    this.waveType = "sine";
    this.color = "#C6D8AF";
    this.playing = false;
  }

  drawSelf() {
    if (this.playing) {
      this.r = min(this.r + 1, this.maxR * 1.5);
      // fill("#FBFEF9");
      fill(this.color);
    } else if (this.selected) {
      fill(this.color);
    }
    ellipse(this.x, this.y, this.r, this.r);
    this.collide();
  }

  collide() {
    if (dist(this.x, this.y, mouseX, mouseY) < this.r) {
      this.r = min(this.r + 1, this.maxR);
      state.currentCell = this;
      return true;
    }
    if (!this.playing) {
      this.r = max(this.r - 1, this.minR);
    }
    return false;
  }

  compare(other) {
    if (this.x < other.x) {
      return -1;
    } else if (this.x > other.x) {
      return 1;
    }
    return 0;
  }
}

export function handleMousePressed() {
  // console.log(mouseX, mouseY);
  if (state.currentCell && state.currentCell.collide()) {
    if (state.currentCell.selected) {
      // console.log(currentCell.row, currentCell.col);
      state.currentCell.selected = false;
      state.selectedCells.splice(state.selectedCells.indexOf(state.currentCell), 1);
    } else {
      // represent different wave types with different colors on canvas
      state.currentCell.color = colorForWave(state.radio.value());
      state.currentCell.waveType = state.radio.value();
      audio.noteOn(state.currentCell.freq, state.currentCell.waveType);
      state.currentCell.selected = true;
      sortedInsert(state.selectedCells, state.currentCell);
    }
    state.currentCell = null;
  }
}
