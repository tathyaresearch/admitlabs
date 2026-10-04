// Mock findings for What people say and Other places (spec 7.2): what the search tool (Quora,
// forums, news, listing sites, directories) and Reddit "find" about an institution. Sample
// institutions follow their hand-written findings (src/sample/findings.ts); any other gets a
// small, stable set. Never a person: one short line, where it was found, a .example link.

import { istParts } from '../../domain/dates.ts';
import { SAMPLE_FINDING_SLUGS, sampleFindings, type FindingFixture } from '../../sample/findings.ts';
import { makeSignal, type AnySignal, type InstitutionRef, type Target } from '../types.ts';
import { rngFor } from './random.ts';
import { slugify } from './shared.ts';

function isoDay(date: Date): string {
  const { year, month, day } = istParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** A small, stable set for an institution outside the sample: a question, perhaps praise, a listing. */
function generalFindings(institution: InstitutionRef): FindingFixture[] {
  const rng = rngFor('findings', institution.slug);
  const slug = institution.slug;
  const program = institution.programKeys[0]?.replace(/-/g, ' ') ?? 'admission';
  const rows: FindingFixture[] = [];
  if (rng.chance(0.7)) {
    rows.push({
      slug,
      key: `${slug}-quora-${slugify(program)}`,
      place: 'people',
      kind: 'unanswered',
      line: `“Is ${institution.name} good for ${program}?” has no answer from the ${institution.type === 'skilling' ? 'institute' : institution.type}.`,
      source: 'Quora',
      url: `https://quora.example/Is-${slugify(institution.name)}-good-for-${slugify(program)}`,
      from: '2026-01-01',
    });
  }
  if (rng.chance(0.5)) {
    rows.push({
      slug,
      key: `${slug}-reddit-good`,
      place: 'people',
      kind: 'good',
      line: rng.pick(['A student says the teachers make time for questions.', 'A thread calls the campus friendly.', 'A learner says the classes are practical.']),
      source: 'Reddit',
      url: `https://reddit.example/r/india/comments/${slug}`,
      from: '2026-01-01',
    });
  }
  const listed = rng.chance(0.5);
  rows.push({
    slug,
    key: `${slug}-collegeguide`,
    place: 'other',
    kind: 'listing',
    line: listed ? 'Listed with the right programs.' : `Not listed. Students compare ${institution.city} institutions here.`,
    source: 'collegeguide.example',
    url: listed ? `https://collegeguide.example/${slug}` : `https://collegeguide.example/${slugify(institution.city)}`,
    from: '2026-01-01',
    listing: listed ? null : 'missing',
  });
  return rows;
}

/** The findings one provider brings back: Reddit's threads from `reddit`, everything else from `search`. */
export function findingSignals(provider: 'search' | 'reddit', target: Target, asOf: Date): AnySignal[] {
  if (target.kind !== 'institution') return [];
  const { institution } = target;
  const rows = SAMPLE_FINDING_SLUGS.has(institution.slug) ? sampleFindings(institution.slug, isoDay(asOf)) : generalFindings(institution);
  return rows
    .filter((row) => (row.source === 'Reddit') === (provider === 'reddit'))
    .map((row) =>
      makeSignal(
        provider,
        'finding',
        target,
        { place: row.place, kind: row.kind, line: row.line, source: row.source, key: row.key, repeats: row.repeats ?? 1, listing: row.listing ?? null },
        row.url,
        asOf,
      ),
    );
}
