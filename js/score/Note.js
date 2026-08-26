export class Note {
  constructor(row, startCol, length = 1, waveType = "sine") {
    this.row = row;
    this.startCol = startCol;
    this.length = length;
    this.waveType = waveType;
    this.playing = false;
  }

  // Exclusive: a length-1 note at column 4 ends at 5 and covers only 4.
  get endCol() {
    return this.startCol + this.length;
  }

  covers(col) {
    return col >= this.startCol && col < this.endCol;
  }
}

export function noteAt(notes, row, col) {
  return notes.find((n) => n.row === row && n.covers(col)) ?? null;
}

// How long a note starting at (row, startCol) may grow before it would run
// into the next note in that row, or off the end of the grid.
export function maxLengthFor(notes, row, startCol, totalCols) {
  let next = totalCols;
  for (const n of notes) {
    if (n.row === row && n.startCol > startCol && n.startCol < next) next = n.startCol;
  }
  return next - startCol;
}

// Switching to a smaller scale leaves notes on rows that no longer exist.
// Clamp them into range, then drop the duplicates that clamping creates,
// keeping the longer note. Lossy at the top of the range, and unrecoverable
// until undo lands - see the spec.
export function remapRows(notes, newRowCount) {
  const kept = new Map();
  for (const n of notes) {
    n.row = Math.min(n.row, newRowCount - 1);
    const key = n.row + ":" + n.startCol;
    const prev = kept.get(key);
    if (!prev || n.length > prev.length) kept.set(key, n);
  }
  return [...kept.values()];
}
