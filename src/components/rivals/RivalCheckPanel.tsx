'use client';

// One check, you against a rival: what Drishti found for them, where and when, and your own
// result with a link to it on your Audit page. Opens from ?check=<key>.

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SourceLine } from '@/components/ui/Data';
import { Icon } from '@/components/ui/Icon';
import { SidePanel } from '@/components/ui/Overlay';
import { ResultMeter } from '@/components/ui/Results';
import { checkLooksAt, checkName } from '@/domain/checks';
import { PILLAR_LABELS, type InstitutionType } from '@/domain/types';
import type { CheckComparison } from '@/rivals/compare';
import { LEAD_WORDS } from '@/rivals/text';
import audit from '@/components/audit/audit.module.css';

export function RivalCheckPanel({ comparisons, rivalName, institutionType }: { comparisons: readonly CheckComparison[]; rivalName: string; institutionType: InstitutionType }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const key = params.get('check');
  const item = comparisons.find((candidate) => candidate.key === key) ?? null;

  const close = () => {
    if (!params.has('check')) return;
    const next = new URLSearchParams(params);
    next.delete('check');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <SidePanel
      open={item !== null}
      onClose={close}
      title={item ? checkName(item.key, institutionType) : ''}
      description={item ? `${PILLAR_LABELS[item.pillar]}. ${checkLooksAt(item.key, institutionType)}. ${LEAD_WORDS[item.lead]}.` : undefined}
    >
      {item ? (
        <div className={audit.panelStack}>
          <div className={audit.panelBlock}>
            <p className={audit.panelLabel}>{rivalName}</p>
          </div>
          {item.theirParts.length ? (
            item.theirParts.map((part) => (
              <div key={part.checkId} className={audit.panelPart}>
                <div className={audit.panelPartHead}>
                  {part.programName ? <p className={audit.panelProgram}>{part.programName}</p> : null}
                  <ResultMeter result={part.result} size="lg" />
                </div>
                {part.finding ? (
                  <div className={audit.panelBlock}>
                    <p className={audit.panelLabel}>What Drishti found</p>
                    <p>{part.finding}</p>
                  </div>
                ) : null}
                {part.sourceUrl ? <SourceLine url={part.sourceUrl} checkedAt={part.checkedAt} /> : null}
              </div>
            ))
          ) : (
            <p className={audit.strongNote}>Not checked for them yet.</p>
          )}

          <div className={audit.panelPart}>
            <div className={audit.panelBlock}>
              <p className={audit.panelLabel}>You</p>
              {item.yourParts.length ? (
                <div className={audit.parts}>
                  {item.yourParts.map((part) => (
                    <span key={part.checkId} className={audit.partResult}>
                      {part.programName ? <span className={audit.partName}>{part.programName}</span> : null}
                      <ResultMeter result={part.result} size="sm" />
                    </span>
                  ))}
                </div>
              ) : (
                <p className={audit.strongNote}>Not in your latest Audit.</p>
              )}
            </div>
            <p className={audit.strongNote}>Learn from what works for them, then do it your own way.</p>
            <Link href={`/audit?check=${item.key}`} className={audit.lockedLink}>
              See your check and how to fix it
              <Icon name="arrowRight" size={14} />
            </Link>
          </div>
        </div>
      ) : null}
    </SidePanel>
  );
}
