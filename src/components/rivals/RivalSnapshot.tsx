// Home's rival snapshot (spec section 13): where you stand in one sentence and one list, and on
// Paid and Client the latest move. The Rivals page has the rest.

import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Layout';
import { formatDate } from '@/domain/format';
import type { RivalSnapshot as Snapshot } from '@/lib/rivals/load';
import { moveNotice } from '@/rivals/text';
import { LadderList, StandingList } from './StandBand';
import audit from '@/components/audit/audit.module.css';
import styles from './rivals.module.css';

export function RivalSnapshot({ snapshot, youName, canChoose }: { snapshot: Snapshot; youName: string; canChoose: boolean }) {
  if (snapshot.rivals.length === 0) {
    return (
      <Card>
        <div className={styles.snapshot}>
          <p className={audit.quietNote}>Pick 3 to 5 rivals to see who&apos;s ahead, pillar by pillar. Rivals never know who tracks them.</p>
          {canChoose ? (
            <div>
              <ButtonLink href="/rivals/choose" size="sm" icon="rivals">
                Choose rivals
              </ButtonLink>
            </div>
          ) : null}
        </div>
      </Card>
    );
  }
  return (
    <Card>
      <div className={styles.snapshot}>
        {snapshot.verdict ? <p className={audit.fixTitle}>{snapshot.verdict}</p> : null}
        {snapshot.ladder ? <LadderList rows={snapshot.ladder} youName={youName} /> : null}
        {snapshot.standings ? <StandingList rivals={snapshot.standings} youName={youName} /> : null}
        {snapshot.latestMove ? (
          <p className={styles.snapshotFoot}>
            <span>
              Latest move, {formatDate(snapshot.latestMove.detectedAt)}: {moveNotice(snapshot.latestMove.rivalName, snapshot.latestMove.description)}
            </span>
            <Link href={`/rivals/${snapshot.latestMove.rivalId}`} className={styles.back}>
              See {snapshot.latestMove.rivalName}
            </Link>
          </p>
        ) : null}
      </div>
    </Card>
  );
}
