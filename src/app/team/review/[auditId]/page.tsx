import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ProofView } from '@/audit/places';
import { loadReview, type ReviewState } from '@/audit/review-jobs';
import { Moved, PLACE_ICONS, SectionTitle } from '@/components/audit/PlaceBits';
import { ApproveButton, ReviewRows, type ReviewRowData } from '@/components/team/ReviewRows';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { checkName, checksForPlace } from '@/domain/checks';
import { formatDate } from '@/domain/format';
import { readyFixText } from '@/domain/ready-fix';
import { scoreLabel } from '@/domain/scores';
import { FINDING_PLACES, PLACE_LABELS, PILLAR_LABELS, PILLARS, RESULT_LABELS, RESULTS, type CheckResult, type FindingKind, type Place } from '@/domain/types';
import { requireTeamViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { waitedFor } from '@/team/review';
import { approveAuditAction, reviewChangeAction } from '../actions';
import audit from '@/components/audit/places.module.css';
import styles from '@/components/team/review.module.css';

export const metadata: Metadata = { title: 'Review' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WORD_ORDER = ['Weak', 'Okay', 'Strong'];
const FINDING_PHRASES: Readonly<Record<FindingKind, string>> = {
  good: 'a good word',
  bad: 'a complaint',
  unanswered: 'an unanswered question',
  listing: 'a listing',
  news: 'a news story',
  directory: 'a directory entry',
};

/** How a word moved since the last approved Audit: "up from Weak", "no change". */
function wordMoved(word: string, before: string | null): string {
  if (!before || before === word) return 'no change';
  return `${WORD_ORDER.indexOf(word) > WORD_ORDER.indexOf(before) ? 'up' : 'down'} from ${before}`;
}

/** The latest result change the team made to each check in this review, by check target. */
function resultChanges(state: ReviewState): Map<string, { by: string | null; before: CheckResult; after: CheckResult; reason: string | null }> {
  const changes = new Map<string, { by: string | null; before: CheckResult; after: CheckResult; reason: string | null }>();
  for (const edit of state.edits) {
    if (edit.what !== 'result') continue;
    const before = edit.before as CheckResult;
    const after = edit.after as CheckResult;
    if (!(RESULTS as readonly string[]).includes(before) || !(RESULTS as readonly string[]).includes(after)) continue;
    const first = changes.get(edit.target);
    // Before as it first was, after as it is now.
    changes.set(edit.target, { by: edit.by, before: first?.before ?? before, after, reason: edit.reason });
  }
  return changes;
}

const LINE_NAMES: Readonly<Record<string, string>> = {
  finding: 'what was seen',
  line: 'what was seen',
  fix_title: 'the fix’s name',
  fix_steps: 'the steps',
  ready_fix: 'the ready fix',
};

/** The lines the team rewrote, by what they belong to ("check:fees_shown:<program>", "finding:<key>"). */
function lineRewrites(state: ReviewState): Map<string, { what: string; by: string | null }> {
  const fields = new Map<string, { fields: Set<string>; by: string | null }>();
  for (const edit of state.edits) {
    if (edit.what !== 'line') continue;
    const at = edit.target.lastIndexOf(':');
    const owner = edit.target.slice(0, at);
    const entry = fields.get(owner) ?? { fields: new Set<string>(), by: edit.by };
    entry.fields.add(LINE_NAMES[edit.target.slice(at + 1)] ?? 'a line');
    entry.by = edit.by;
    fields.set(owner, entry);
  }
  return new Map([...fields].map(([owner, entry]) => [owner, { what: [...entry.fields].join(', '), by: entry.by }]));
}

function checkRows(state: ReviewState, place: Place): ReviewRowData[] {
  const changes = resultChanges(state);
  const rewrites = lineRewrites(state);
  const { institution, names } = state;
  return checksForPlace(place).flatMap((definition) =>
    state.audit.checks
      .filter((check) => check.key === definition.key)
      .sort((a, b) => (a.programId ? (names.get(a.programId) ?? '') : '').localeCompare(b.programId ? (names.get(b.programId) ?? '') : ''))
      .map((check): ReviewRowData => {
        const proof: ProofView | null = check.detail
          ? { url: check.detail.sourceUrl, date: check.checkedAt, line: check.detail.finding, program: null, byTeam: Boolean(check.teamCheckedAt) }
          : null;
        const target = `check:${check.key}:${check.programId ?? 'institution'}`;
        const changed = changes.get(target) ?? null;
        return {
          id: check.id,
          on: 'check',
          place,
          name: checkName(check.key, institution.type, institution.city),
          program: check.programId ? (names.get(check.programId) ?? null) : null,
          checkKey: check.key,
          result: check.result,
          findingKind: null,
          isNew: false,
          proof,
          hasFix: check.result !== 'strong',
          values: {
            line: check.detail?.finding ?? '',
            fixTitle: check.detail?.fixTitle ?? '',
            steps: check.detail?.fixSteps.join('\n') ?? '',
            readyFix: check.detail?.readyFix ? readyFixText(check.detail.readyFix) : '',
          },
          changed: changed && changed.before !== changed.after ? changed : null,
          rewritten: rewrites.get(target) ?? null,
        };
      }),
  );
}

function findingRows(state: ReviewState, place: Place): ReviewRowData[] {
  const added = new Set(state.changes.findings.added.map((finding) => finding.id));
  const rewrites = lineRewrites(state);
  return state.findings
    .filter((finding) => finding.place === place && !finding.removed)
    .map((finding) => ({
      id: finding.id,
      on: 'finding',
      place,
      name: finding.sourceName,
      program: null,
      checkKey: null,
      result: null,
      findingKind: finding.kind,
      isNew: added.has(finding.id),
      proof: { url: finding.sourceUrl, date: finding.checkedAt, line: finding.line, program: null, byTeam: false },
      hasFix: finding.fix !== null,
      values: {
        line: finding.line,
        fixTitle: finding.fix?.title ?? '',
        steps: finding.fix?.steps.join('\n') ?? '',
        readyFix: finding.fix?.readyFix ? readyFixText(finding.fix.readyFix) : '',
      },
      changed: null,
      rewritten: rewrites.get(`finding:${finding.findingKey}`) ?? null,
    }));
}

export default async function ReviewPage({ params }: { params: Promise<{ auditId: string }> }) {
  await requireTeamViewer();
  const { auditId } = await params;
  if (!UUID.test(auditId)) notFound();
  const state = await loadReview(await createClient(), auditId);
  if (!state) notFound();

  const { audit: waiting, institution, changes, before } = state;
  if (waiting.review !== 'waiting') {
    return (
      <div className={audit.page}>
        <PageHead back={{ href: '/team/review', label: 'To review' }} title={institution.name} question="Is this right before it goes out?" />
        <EmptyState icon="checkCircle" title="This Audit has been approved" action={<ButtonLink href={`/team/institutions/${institution.id}`}>Open their page</ButtonLink>}>
          The college sees it now. Every change made in its review is kept.
        </EmptyState>
      </div>
    );
  }

  const first = before === null;
  const removed = state.findings.filter((finding) => finding.removed);
  const editCount = state.edits.length;
  const words = PILLARS.map((pillar) => `${PILLAR_LABELS[pillar]} ${scoreLabel(waiting.scores[pillar])}`).join(', ');
  return (
    <div className={[audit.page, styles.withBar].join(' ')}>
      <div className={audit.top}>
        <PageHead
          back={{ href: '/team/review', label: 'To review' }}
          title={institution.name}
          question="Is this right before it goes out?"
          caption={[
            `${first ? 'First Audit' : waiting.trigger === 'manual' ? 'New Audit, extra refresh' : 'New Audit'}, ${formatDate(waiting.runAt)}`,
            institution.tier === 'free' && institution.freeProgram ? `Free: ${institution.freeProgram}` : { free: 'Free', paid: 'Paid', client: 'Client' }[institution.tier],
            `Waiting ${waitedFor(waiting.runAt, new Date())}`,
            'Review first',
          ]}
        />
      </div>

      <section className={audit.block} aria-labelledby="since-title">
        <SectionTitle id="since-title" icon="refresh" title={first ? 'Their first Audit' : `What changed since the last approved Audit, ${formatDate(before.runAt)}`} />
        <div className={audit.card}>
          {first ? (
            <p className={audit.quiet}>Nothing to compare with: this is what they see first. Check the results and lines below, then approve.</p>
          ) : (
            <div className={audit.changedGrid}>
              <div>
                <p className={audit.miniTitle}>Words</p>
                <ul className={audit.plainList}>
                  {changes.words.map((word) => (
                    <li key={word.pillar}>
                      <span className={audit.strongText}>{word.name}</span> {word.word}
                      <span className={audit.quiet}>, {wordMoved(word.word, word.before)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className={audit.miniTitle}>Checks that moved</p>
                {changes.checks.length ? (
                  <ul className={audit.plainList}>
                    {changes.checks.map((check) => (
                      <li key={`${check.key}-${check.program ?? ''}`} className={audit.movedRow}>
                        <span>
                          {check.name}
                          {check.program ? <span className={audit.quiet}> {check.program}</span> : null}
                        </span>
                        <Moved before={check.before} after={check.after} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={audit.quiet}>Every check held its result.</p>
                )}
              </div>
              <div>
                <p className={audit.miniTitle}>Findings</p>
                <ul className={audit.plainList}>
                  {changes.findings.added.length ? (
                    <li>
                      {changes.findings.added.length} new: {changes.findings.added.map((finding) => `${FINDING_PHRASES[finding.kind]} on ${finding.sourceName}`).join(', ')}
                    </li>
                  ) : (
                    <li className={audit.quiet}>Nothing new</li>
                  )}
                  <li className={audit.quiet}>{changes.findings.gone.length ? `${changes.findings.gone.length} gone since then` : 'None gone'}</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className={audit.block} aria-labelledby="edit-title">
        <SectionTitle id="edit-title" icon="wrench" title="The Audit, place by place" help="Fix a result or a line where the reader got it wrong. The words update straight away. Every change is kept." />
        {(['website', 'google', 'social'] as const).map((place) => (
          <div key={place} className={audit.card}>
            <p className={audit.columnTitle}>
              <Icon name={PLACE_ICONS[place]} size={16} /> {PLACE_LABELS[place]}
            </p>
            <ReviewRows auditId={auditId} rows={checkRows(state, place)} onChange={reviewChangeAction} />
          </div>
        ))}
        {FINDING_PLACES.map((place) => {
          const rows = findingRows(state, place);
          return (
            <div key={place} className={audit.card}>
              <p className={audit.columnTitle}>
                <Icon name={PLACE_ICONS[place]} size={16} /> {PLACE_LABELS[place]}
              </p>
              {rows.length ? <ReviewRows auditId={auditId} rows={rows} onChange={reviewChangeAction} /> : <p className={audit.quiet}>Nothing found here.</p>}
            </div>
          );
        })}
        {removed.length ? (
          <div className={audit.card}>
            <p className={audit.columnTitle}>Taken out, so the college never sees {removed.length === 1 ? 'it' : 'them'}</p>
            <ul className={audit.plainList}>
              {removed.map((finding) => (
                <li key={finding.id}>
                  <span className={audit.strongText}>{finding.sourceName}</span>
                  <span className={audit.quiet}>: {finding.line}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className={audit.quiet}>
          Results to choose from: {RESULTS.map((result) => RESULT_LABELS[result]).join(', ')}. A changed result keeps its link, shows the day the team checked it, and reads “Checked by the AdmitLabs team”.
        </p>
      </section>

      <div className={styles.approveBar}>
        <span className={styles.approveText}>
          <span className={audit.strongText}>{editCount ? `${editCount} ${editCount === 1 ? 'change' : 'changes'}.` : 'No changes.'}</span>
          <span className={styles.approveMore}> {words}. Approving shows it to the college and tells them in Notifications.</span>
        </span>
        <ApproveButton id={auditId} onApprove={approveAuditAction} />
      </div>
    </div>
  );
}
