// The one-sentence verdict at the top of an Audit: the strength first, then the next step.
// Never framed as a failing (spec 7.7).
//
//   Strongest pillar is Strong:   "Students can find you. Next step: earning their trust."
//   Strongest is not Strong yet:  "Your strongest area is being found. Next step: ..."
//   All three close together:     "Room to grow in all three: being found, trusted and chosen."
//   All three Strong:             "Students can find you, trust you and choose you. Next step: keeping it that way."

import { SCORING_V1 } from '../config/scoring.v1.ts';
import { scoreLabel } from '../domain/scores.ts';
import type { ScoringConfig } from '../domain/scoring-config.ts';
import { PILLARS, type Pillar } from '../domain/types.ts';

/** Pillars this close (in points) count as level, so none is singled out. */
export const CLOSE_PILLARS = 10;

const STRENGTH: Readonly<Record<Pillar, string>> = {
  discovered: 'Students can find you.',
  trusted: 'Students trust what they see.',
  chosen: 'Students find it easy to choose you.',
};

const STRONGEST_AREA: Readonly<Record<Pillar, string>> = {
  discovered: 'Your strongest area is being found.',
  trusted: 'Your strongest area is being trusted.',
  chosen: 'Your strongest area is being chosen.',
};

const NEXT_STEP: Readonly<Record<Pillar, string>> = {
  discovered: 'Next step: being easier to find.',
  trusted: 'Next step: earning their trust.',
  chosen: 'Next step: making it easy to choose you.',
};

export function auditVerdict(pillars: Readonly<Record<Pillar, number>>, config: Pick<ScoringConfig, 'labels'> = SCORING_V1): string {
  const strong = (pillar: Pillar) => scoreLabel(pillars[pillar], config) === 'Strong';
  if (PILLARS.every(strong)) return 'Students can find you, trust you and choose you. Next step: keeping it that way.';

  // Ties go to the first pillar in spec order: Discovered, Trusted, Chosen.
  const best = PILLARS.reduce((top, pillar) => (pillars[pillar] > pillars[top] ? pillar : top));
  const weakest = PILLARS.reduce((low, pillar) => (pillars[pillar] < pillars[low] ? pillar : low));
  if (pillars[best] - pillars[weakest] < CLOSE_PILLARS) return 'Room to grow in all three: being found, trusted and chosen.';

  return `${strong(best) ? STRENGTH[best] : STRONGEST_AREA[best]} ${NEXT_STEP[weakest]}`;
}
