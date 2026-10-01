// Dots on one line, such as you and your rivals on a pillar from 0 to 100. Dots that would hide
// each other step into lanes: you always stay on the line, and a rival that would overlap a dot
// already placed moves one lane down, then another. Pure, so the dashboard and the PDF agree.

export interface DotSizes {
  /** Radius of your dot and of a rival's, and the space kept between two dots. */
  you: number;
  rival: number;
  gap: number;
}

/** The lane of each dot, in the order given: 0 on the line, 1 one step below, and so on. */
export function dotLanes(dots: ReadonlyArray<{ x: number; you: boolean }>, sizes: DotSizes): number[] {
  const lanes: number[] = dots.map(() => 0);
  const placed: number[] = [];
  const radius = (index: number) => (dots[index]?.you ? sizes.you : sizes.rival);
  const order = dots.map((_, index) => index).sort((a, b) => Number(dots[b]?.you) - Number(dots[a]?.you));
  for (const index of order) {
    const dot = dots[index];
    if (!dot) continue;
    let lane = 0;
    const clashes = (candidate: number) =>
      placed.some((other) => lanes[other] === candidate && Math.abs((dots[other]?.x ?? 0) - dot.x) < radius(other) + radius(index) + sizes.gap);
    if (!dot.you) while (clashes(lane)) lane += 1;
    lanes[index] = lane;
    placed.push(index);
  }
  return lanes;
}
