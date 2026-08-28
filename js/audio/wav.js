// A 16-bit PCM WAV, written by hand: the browser can play audio but not save
// it, and a RIFF header is 44 bytes of arithmetic rather than a dependency.
const HEADER_BYTES = 44;
const BITS_PER_SAMPLE = 16;
const CHANNELS = 1;

// Floats outside -1..1 would wrap around when truncated to an integer, which
// is heard as a tear rather than the clipping it came from.
function toPcm16(sample) {
  const clamped = Math.max(-1, Math.min(1, sample));
  return Math.round(clamped * (clamped < 0 ? 0x8000 : 0x7fff));
}

export function encodeWav(samples, sampleRate) {
  const bytesPerSample = BITS_PER_SAMPLE / 8;
  const dataBytes = samples.length * bytesPerSample;
  const view = new DataView(new ArrayBuffer(HEADER_BYTES + dataBytes));

  const ascii = (offset, text) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, "RIFF");
  view.setUint32(4, HEADER_BYTES - 8 + dataBytes, true); // everything after this field
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true); // the fmt chunk's own length
  view.setUint16(20, 1, true); // 1 is uncompressed PCM
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * CHANNELS * bytesPerSample, true); // byte rate
  view.setUint16(32, CHANNELS * bytesPerSample, true); // block align
  view.setUint16(34, BITS_PER_SAMPLE, true);
  ascii(36, "data");
  view.setUint32(40, dataBytes, true);

  for (let i = 0; i < samples.length; i++) {
    view.setInt16(HEADER_BYTES + i * bytesPerSample, toPcm16(samples[i]), true);
  }
  return view.buffer;
}

// The last sample cut mid-wave is heard as a click, so the tail is faded out.
export function fadeOut(samples, sampleRate, seconds = 0.03) {
  const len = Math.min(Math.floor(seconds * sampleRate), samples.length);
  for (let i = 0; i < len; i++) samples[samples.length - 1 - i] *= i / len;
  return samples;
}
