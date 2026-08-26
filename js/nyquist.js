export function toNyquist(selected, noteNames, noteTable, logicalStopTime) {
  let content = "{\n";
  for (let i = selected.length - 1; i >= 0; i--) {
    const cell = selected[i];
    const startTime = cell.col * logicalStopTime;
    const instr = cell.waveType + "-instr";
    const pitch = noteTable[noteNames[cell.row]];
    content += ` {${startTime.toFixed(2)} ${logicalStopTime} {${instr} pitch: ${pitch}}} \n`;
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
