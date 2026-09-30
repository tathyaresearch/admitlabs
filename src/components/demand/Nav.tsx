// How wide to look (City, State, All India) and which program, as links: the page is rendered
// on the server, so each choice is a plain address that can be shared or reloaded.

import Link from 'next/link';
import { DEMAND_SCOPES, DEMAND_SCOPE_LABELS, type DemandScope } from '@/domain/types';
import audit from '@/components/audit/audit.module.css';
import styles from './demand.module.css';

function href(scope: DemandScope, programId: string | null): string {
  const params = new URLSearchParams();
  if (scope !== 'city') params.set('scope', scope);
  if (programId) params.set('program', programId);
  const query = params.toString();
  return query ? `/demand?${query}` : '/demand';
}

export function RegionSwitch({ scope, programId, labels }: { scope: DemandScope; programId: string | null; labels: Readonly<Record<DemandScope, string>> }) {
  return (
    <nav aria-label="How wide to look" className={styles.regions}>
      {DEMAND_SCOPES.map((option) => (
        <Link key={option} href={href(option, programId)} className={styles.region} aria-current={option === scope ? 'page' : undefined}>
          {DEMAND_SCOPE_LABELS[option]}
          {option !== 'india' ? <span className="visually-hidden">, {labels[option]}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export function DemandProgramTabs({ scope, programs, active }: { scope: DemandScope; programs: ReadonlyArray<{ id: string; name: string }>; active: string | null }) {
  return (
    <nav aria-label="Programs" className={audit.tabs}>
      <Link href={href(scope, null)} className={audit.tab} aria-current={active === null ? 'page' : undefined}>
        All programs
      </Link>
      {programs.map((program) => (
        <Link key={program.id} href={href(scope, program.id)} className={audit.tab} aria-current={active === program.id ? 'page' : undefined}>
          {program.name}
        </Link>
      ))}
    </nav>
  );
}
