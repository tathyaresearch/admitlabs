// The range a score chart draws, fitted to its values so a line uses its space: in tens, with
// room above and below, inside 0 to 100. The same rule as the monthly report's score history.
// Pure.

export function scoreRange(values: readonly number[], room = 8): [number, number] {
  if (values.length === 0) return [0, 100];
  const low = Math.max(0, Math.floor((Math.min(...values) - room) / 10) * 10);
  const high = Math.min(100, Math.ceil((Math.max(...values) + room) / 10) * 10);
  return high - low < 20 ? [Math.max(0, Math.min(low, high - 20)), Math.min(100, Math.max(high, low + 20))] : [low, high];
}

/** The lines a fitted chart shows: its ends, and where each score band starts when it falls inside. */
export function rangeTicks(range: readonly [number, number], bandStarts: readonly number[]): number[] {
  const [low, high] = range;
  return [low, ...bandStarts.filter((start) => start > low && start < high), high];
}
