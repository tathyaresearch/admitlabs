// Start onboarding (spec section 26): what Drishti already knows from the college's latest Audit,
// pre-filled for the team to confirm, correct or take out. Fees and program pages the website
// shows, the approvals held officially, the placements page and the listing sites found in
// Other places. Each keeps where it was found and when. Nothing is suggested that the details
// added by you, or the Brain, already have. Pure.

import type { FeesShownValue, PlacementProofValue, ProgramPageValue } from '../domain/facts.ts';
import type { InstitutionDetails, ProgramDetails } from '../domain/details.ts';
import { formatInr, hostAndPath } from '../domain/format.ts';
import type { CheckKey } from '../domain/types.ts';
import type { BrainFields, BrainKind, LinkType } from './model.ts';

export interface PrefillSignal {
  checkKey: CheckKey;
  programId: string | null;
  value: unknown;
  sourceUrl: string;
  fetchedAt: string;
}

export interface PrefillFinding {
  place: 'people' | 'other';
  kind: string;
  sourceName: string;
  sourceUrl: string;
  checkedAt: string;
}

export interface PrefillInput {
  programs: ReadonlyArray<{ id: string; name: string; details: ProgramDetails }>;
  details: InstitutionDetails;
  /** The latest signal for each check (and program). */
  signals: readonly PrefillSignal[];
  findings: readonly PrefillFinding[];
  /** Links the Brain has already, so none comes twice. */
  knownUrls: ReadonlySet<string>;
}

export interface FoundItem<K extends BrainKind = BrainKind> {
  kind: K;
  fields: BrainFields[K];
  sourceUrl: string;
  foundAt: string;
}

/** "₹92,000 a year, all fees listed": the amount and what it is for, when the page gives one exact fee. */
export function parseFees(text: string): { amount: number; period: 'year' | 'total' } | null {
  const amounts = [...text.matchAll(/₹\s?([\d,]+)/g)].map((match) => Number((match[1] ?? '').replace(/,/g, '')));
  if (amounts.length !== 1 || !amounts[0]) return null;
  const period = /\b(total|full course|whole course|in all)\b/i.test(text) ? 'total' : 'year';
  return { amount: amounts[0], period };
}

const found = <K extends BrainKind>(kind: K, fields: BrainFields[K], sourceUrl: string, foundAt: string): FoundItem => ({ kind, fields, sourceUrl, foundAt }) as FoundItem;

function listingType(url: string): LinkType {
  if (/shiksha/i.test(url)) return 'shiksha';
  if (/collegedunia/i.test(url)) return 'collegedunia';
  return 'other';
}

export function prefill(input: PrefillInput): FoundItem[] {
  const items: FoundItem[] = [];
  const signal = (key: CheckKey, programId: string | null) => input.signals.find((entry) => entry.checkKey === key && entry.programId === programId);

  for (const program of input.programs) {
    const fees = signal('fees_shown', program.id);
    const feeValue = fees?.value as FeesShownValue | undefined;
    if (fees && feeValue?.amountText && program.details.feesAmount === null && feeValue.disclosure !== 'on_request') {
      const parsed = parseFees(feeValue.amountText);
      items.push(
        found(
          'found',
          {
            target: `program:${program.id}:fees`,
            label: `${program.name} fees`,
            value: parsed ? `${formatInr(parsed.amount)} ${parsed.period === 'year' ? 'a year' : 'for the full course'}` : feeValue.amountText,
            feesAmount: parsed?.amount ?? null,
            feesPeriod: parsed?.period ?? null,
            pageUrl: null,
            approvals: null,
          },
          feeValue.pageUrl ?? fees.sourceUrl,
          fees.fetchedAt,
        ),
      );
    }
    const page = signal('program_page', program.id);
    const pageValue = page?.value as ProgramPageValue | undefined;
    if (page && pageValue?.ownPage && pageValue.pageUrl && !program.details.pageUrl) {
      items.push(
        found(
          'found',
          { target: `program:${program.id}:page`, label: `${program.name} page`, value: hostAndPath(pageValue.pageUrl), feesAmount: null, feesPeriod: null, pageUrl: pageValue.pageUrl, approvals: null },
          pageValue.pageUrl,
          page.fetchedAt,
        ),
      );
    }
    const placements = signal('placement_proof', program.id) ?? signal('placement_proof', null);
    const placementValue = placements?.value as PlacementProofValue | undefined;
    if (placements && placementValue?.found && !input.knownUrls.has(placements.sourceUrl) && !items.some((item) => item.sourceUrl === placements.sourceUrl)) {
      items.push(found('placement_list', { programId: placements.programId, year: placementValue.year, link: placements.sourceUrl }, placements.sourceUrl, placements.fetchedAt));
    }
  }

  // The approvals official records say the college holds, when the details have none yet.
  const d = input.details;
  const official = input.signals.find((entry) => entry.checkKey === 'approvals' && (entry.value as { source?: string } | null)?.source === 'official');
  const held = (official?.value as { held?: string[] } | undefined)?.held ?? [];
  if (official && held.length && !d.naacGrade && d.ugcRecognised === null && d.aicteApproved === null && !d.skillingRecognition.length) {
    const has = (name: string) => held.some((entry) => entry.toUpperCase().startsWith(name));
    items.push(
      found(
        'found',
        {
          target: 'about:approvals',
          label: 'Approvals held',
          value: held.join(', '),
          feesAmount: null,
          feesPeriod: null,
          pageUrl: null,
          approvals: { ugc: has('UGC'), aicte: has('AICTE'), naac: has('NAAC'), other: held.filter((entry) => !['UGC', 'AICTE', 'NAAC'].some((name) => entry.toUpperCase().startsWith(name))) },
        },
        official.sourceUrl,
        official.fetchedAt,
      ),
    );
  }

  // Listing sites in Other places: Shiksha, CollegeDunia and the rest.
  for (const finding of input.findings) {
    if (finding.place !== 'other' || (finding.kind !== 'listing' && finding.kind !== 'directory')) continue;
    if (input.knownUrls.has(finding.sourceUrl) || items.some((item) => item.sourceUrl === finding.sourceUrl)) continue;
    const type = listingType(finding.sourceUrl);
    items.push(found('link', { type, label: type === 'other' ? finding.sourceName : null, url: finding.sourceUrl, shared: false }, finding.sourceUrl, finding.checkedAt));
  }
  return items;
}
