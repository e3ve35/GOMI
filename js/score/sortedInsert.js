// Inserts `value` keeping `arr` sorted DESCENDING by the comparator's key.
// Descending is deliberate: Score.drawSelf connects consecutive entries, and
// nyquist.js walks the array backwards to emit ascending start times.
export function sortedInsert(arr, value, compare = (a, b) => a.x - b.x) {
  let left = 0;
  let right = arr.length;
  while (left < right) {
    const mid = Math.floor(left + (right - left) / 2);
    if (compare(value, arr[mid]) > 0) right = mid;
    else left = mid + 1;
  }
  arr.splice(left, 0, value);
}
