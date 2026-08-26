export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  "major pentatonic": [0, 2, 4, 7, 9],
  "minor pentatonic": [0, 3, 5, 7, 10],
};

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// MIDI 60 is C4, so the octave number is floor(midi / 12) - 1.
export function midiName(midi) {
  return NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}

export class Scale {
  constructor(rootMidi = 48, name = "major", octaves = 3) {
    this.rootMidi = rootMidi;
    this.name = name;
    this.intervals = SCALES[name];
    this.octaves = octaves;
  }

  // + 1 so the range closes on a root: 3 octaves of C major spans C3 to C6.
  get rowCount() {
    return this.intervals.length * this.octaves + 1;
  }

  // Row 0 is the TOP row and the highest pitch.
  midiForRow(row) {
    const fromBottom = this.rowCount - 1 - row;
    const n = this.intervals.length;
    return (
      this.rootMidi + 12 * Math.floor(fromBottom / n) + this.intervals[fromBottom % n]
    );
  }

  labelForRow(row) {
    return midiName(this.midiForRow(row));
  }
}
