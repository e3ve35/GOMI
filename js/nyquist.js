export function toNyquist(notes, scale, secondsPerCol) {
  const sorted = [...notes].sort((a, b) => a.startCol - b.startCol);
  let content = "{\n";
  for (const n of sorted) {
    const start = (n.startCol * secondsPerCol).toFixed(2);
    const dur = (n.length * secondsPerCol).toFixed(2);
    content += ` {${start} ${dur} {${n.waveType}-instr pitch: ${scale.midiForRow(n.row)}}} \n`;
  }
  return content + "}";
}

export function downloadText(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
