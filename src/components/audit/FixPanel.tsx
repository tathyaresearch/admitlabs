'use client';

// The fix panel (spec 7.7 and section 13), in one order: the fix (its name as on Home, the place
// and check, impact, effort, the programs); 1. what we found, program by program, with the link,
// the date and the short line; 2. why it matters to a student; 3. the steps; 4. the ready fix, with
// Copy; what was added by you; and in the footer Mark as done and Let AdmitLabs fix this. A Strong
// check opens the same panel with what was found and why it matters. Opens from ?fix=<id>, so it
// can be linked and survives a reload. Details the plan does not include never reach the page.

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import type { FixView } from '@/audit/places';
import { AddedNote } from '@/components/details/Added';
import { Icon } from '@/components/ui/Icon';
import { CheckIcon } from '@/components/ui/Marks';
import { SidePanel } from '@/components/ui/Overlay';
import { ResultBar } from '@/components/ui/Results';
import type { AddedByYou } from '@/domain/details';
import { joinNames } from '@/domain/format';
import { PLACE_LABELS } from '@/domain/types';
import { FixActions, type FixActionHandlers, type FixActionState } from './FixActions';
import { ImpactTags, PLACE_ICONS, ProofLine, ReadyFixView } from './PlaceBits';
import styles from './places.module.css';

export interface PanelAdded {
  label?: string;
  added: AddedByYou;
}

export function FixPanel({
  entries,
  state,
  handlers,
  added = {},
}: {
  /** Every fix the reader may open, and each Strong check (marked `strong`). */
  entries: readonly FixView[];
  /** Mark as done and Let AdmitLabs fix this. Null where nothing can be done (a shared Audit, the team). */
  state: FixActionState | null;
  handlers: FixActionHandlers | null;
  /** What the institution added in Settings that relates to each fix, by its id. */
  added?: Readonly<Record<string, readonly PanelAdded[]>>;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const id = params.get('fix');
  const entry = entries.find((candidate) => candidate.id === id) ?? null;

  const close = () => {
    if (!params.has('fix')) return;
    const next = new URLSearchParams(params);
    next.delete('fix');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <SidePanel
      open={entry !== null}
      onClose={close}
      title={
        entry ? (
          <span className={styles.panelHeading}>
            {entry.checkKey ? <CheckIcon check={entry.checkKey} size={20} /> : <Icon name={PLACE_ICONS[entry.place]} size={20} />}
            {entry.title}
          </span>
        ) : (
          ''
        )
      }
      description={entry ? `${PLACE_LABELS[entry.place]} · ${entry.label}` : undefined}
      footer={entry && !entry.strong && state && handlers ? <FixActions fix={entry} state={state} handlers={handlers} layout="panel" /> : undefined}
    >
      {entry ? <FixDetails entry={entry} added={added[entry.id] ?? []} /> : null}
    </SidePanel>
  );
}

/** A fix explained in full: the panel's body, and each of the top 3 on a shared Audit (`ownDetails` false there). */
export function FixDetails({ entry, added = [], ownDetails = true }: { entry: FixView; added?: readonly PanelAdded[]; ownDetails?: boolean }) {
  // The parts this fix has, numbered in their order.
  const parts: Array<{ key: string; title: string; body: ReactNode }> = [
    {
      key: 'found',
      title: 'What we found',
      body: entry.found.length ? (
        <ul className={styles.panelProofs}>
          {entry.found.map((proof, index) => (
            <li key={index}>
              <ProofLine proof={proof} />
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.panelText}>What was found, with its link and date, comes with Paid.</p>
      ),
    },
    ...(entry.why ? [{ key: 'why', title: 'Why it matters', body: <p className={styles.panelText}>{entry.why}</p> }] : []),
    ...(entry.advice.length
      ? [
          {
            key: 'how',
            title: 'How to fix it',
            body: entry.advice.map((item) => (
              <div key={item.steps.join(' ')} className={styles.panelAdvice}>
                {item.programs.length ? <p className={styles.panelFor}>For {joinNames(item.programs)}</p> : null}
                <ol className={styles.steps}>
                  {item.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            )),
          },
        ]
      : []),
    ...(entry.readyFix ? [{ key: 'ready', title: 'Ready to copy', body: <ReadyFixView ready={entry.readyFix} ownDetails={ownDetails} /> }] : []),
  ];
  return (
    <div className={styles.panel}>
      {entry.strong ? <p className={styles.panelStrong}>Strong everywhere. Keep it going.</p> : <ImpactTags impact={entry.impact} effort={entry.effort} programs={entry.programs} />}
      {entry.results.length > 1 ? (
        <ul className={styles.panelResults}>
          {entry.results.map((result) => (
            <li key={result.program ?? 'institution'}>
              <span>{result.program ?? 'Your institution'}</span>
              <ResultBar result={result.result} showPoints={false} size="sm" />
            </li>
          ))}
        </ul>
      ) : null}
      {parts.map((part, index) => (
        <section key={part.key} className={styles.panelPart}>
          <h3 className={styles.panelTitle}>
            <span className="num">{index + 1}</span> {part.title}
          </h3>
          {part.body}
        </section>
      ))}
      {added.map((item, index) => (
        <AddedNote key={index} added={item.added} showAdvice={!entry.strong} label={item.label} />
      ))}
    </div>
  );
}
