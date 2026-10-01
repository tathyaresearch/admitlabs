/** A name short enough for its column: whole words while they fit, then an ellipsis. */
export function fit(name: string, chars: number): string {
  if (name.length <= chars) return name;
  const words = name.split(' ');
  let out = '';
  for (const word of words) {
    if (`${out} ${word}`.trim().length > chars - 1) break;
    out = `${out} ${word}`.trim();
  }
  return `${out || name.slice(0, chars - 1)}…`;
}
