// "Falling Water" - a score for GOMI.
//
// GOMI has no way to load a score, so this writes one straight into the one
// on screen. Open the page, click to create a score, leave the root on C3
// and the scale on major, then paste this whole file into the browser
// console and press play. The paths are relative to the page, so it has to
// be run from there rather than imported.
//
// It is written in scale degrees rather than pitches, so choosing another
// scale first transposes it - minor pentatonic is worth hearing.
Promise.all([import("./js/state.js"), import("./js/score/Note.js")]).then(
  ([{ state }, { Note }]) => {
    const score = state.score;
    score.notes.length = 0;

    // Scale degrees counted up from the root: 0 = C3, 7 = C4, 14 = C5.
    const row = (degree) => score.scale.rowCount - 1 - degree;
    const put = (degree, col, len, wave) => {
      const n = new Note(row(degree), col, len, wave);
      score.notes.push(n);
      return n;
    };
    const glide = (a, b) => (a.glideTo = b);

    // Bass: C - G - F - C, one chord to a bar.
    put(0, 0, 4, "sine");
    put(4, 4, 4, "sine");
    put(3, 8, 4, "sine");
    put(0, 12, 6, "sine");

    // Melody: four notes, each falling or leaning into the next.
    const m1 = put(9, 0, 2, "triangle");   // E4
    const m2 = put(11, 4, 2, "triangle");  // G4
    const m3 = put(14, 8, 3, "triangle");  // C5
    const m4 = put(12, 12, 6, "triangle"); // A4
    glide(m1, m2);
    glide(m2, m3);
    glide(m3, m4);

    // Drops above it, in the wave that cuts through.
    put(14, 2, 1, "sawtooth");
    put(16, 6, 1, "sawtooth");
    put(18, 10, 1, "sawtooth");
    const tail = put(16, 14, 1, "sawtooth");
    glide(tail, put(11, 16, 2, "sawtooth"));
  }
);
