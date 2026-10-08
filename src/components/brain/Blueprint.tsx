// The Blueprint section (spec section 26), first in the Brain: the latest version on top (its
// number and status, the file, who uploaded it and when, View and Download), what the college
// said, then Past versions. The team uploads versions and sets their status; the college sees
// Shared and Approved versions only, and approves the latest Shared one or asks for changes.
// After Ready, the team sees two steps follow it: Blueprint shared, Blueprint approved.

import { afterReadySteps, BLUEPRINT_STATUS_LABELS, blueprintStale, fileSize, readableBlueprint, type BlueprintStatus, type BlueprintVersion } from '@/brain/blueprint';
import { personName } from '@/brain/history';
import { AnchorButton, Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { BRAIN_RULES } from '@/config/brain';
import { formatDate } from '@/domain/format';
import { addBlueprintAction, approveBlueprintAction, askBlueprintChangesAction, setBlueprintStatusAction } from '@/lib/brain/blueprint-actions';
import type { BrainPage } from '@/lib/brain/page';
import { brainHref, NeedsChecking, StateTag } from './Bits';
import { AskChangesForm, BlueprintUpload } from './BlueprintForms';
import styles from './brain.module.css';

/** The team's buttons for a version's status: to each status it is not in. */
const MOVES: Readonly<Record<BlueprintStatus, ReadonlyArray<{ to: BlueprintStatus; label: string }>>> = {
  draft: [
    { to: 'shared', label: 'Share with the college' },
    { to: 'approved', label: 'Mark as approved' },
  ],
  shared: [
    { to: 'approved', label: 'Mark as approved' },
    { to: 'draft', label: 'Back to Draft' },
  ],
  approved: [
    { to: 'shared', label: 'Back to Shared' },
    { to: 'draft', label: 'Back to Draft' },
  ],
};

function FileLinks({ version }: { version: BlueprintVersion }) {
  return (
    <>
      <AnchorButton href={`/brain/blueprint/${version.id}`} size="sm" variant="secondary" icon="external" target="_blank" rel="noreferrer">
        View
        <span className="visually-hidden"> version {version.version} (opens in a new tab)</span>
      </AnchorButton>
      <AnchorButton href={`/brain/blueprint/${version.id}?download=1`} size="sm" variant="quiet" icon="download">
        Download
        <span className="visually-hidden"> version {version.version}</span>
      </AnchorButton>
    </>
  );
}

export function BlueprintSection({ page, base, canEdit, team }: { page: BrainPage; base: string; canEdit: boolean; team: boolean }) {
  const institutionId = page.brain.institution.id;
  const ctx = { institutionId, returnTo: brainHref(base, { section: 'blueprint' }) };
  const [latest, ...past] = page.blueprints;
  const who = (userId: string | null) => (userId ? personName(page.people.get(userId)) : 'Someone');
  const readable = readableBlueprint(page.blueprints);
  // The two steps after Ready are the team's onboarding; the college reads the same on the version.
  const ready = team && page.brain.status === 'ready';
  return (
    <>
      {ready ? (
        <section className={styles.group} aria-labelledby="blueprint-steps">
          <div className={styles.groupHead}>
            <h3 id="blueprint-steps" className={styles.groupTitle}>
              After Ready
            </h3>
          </div>
          <p className={styles.groupNote}>Two steps that follow the Brain being Ready. They never hold it back.</p>
          <ul className={styles.blueprintSteps}>
            {afterReadySteps(page.blueprints).map((step) => (
              <li key={step.key} className={styles.blueprintStep}>
                <Icon name={step.done ? 'checkCircle' : 'stopwatch'} size={16} />
                <span className={step.done ? styles.blueprintStepDone : undefined}>{step.name}</span>
                <span className={styles.blueprintStepWhen}>{step.done && step.at ? formatDate(step.at) : 'Not yet'}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {team && canEdit ? (
        <section className={styles.group} aria-labelledby="blueprint-upload">
          <div className={styles.groupHead}>
            <h3 id="blueprint-upload" className={styles.groupTitle}>
              Upload blueprint
            </h3>
          </div>
          <div className={styles.form}>
            <BlueprintUpload institutionId={institutionId} action={addBlueprintAction.bind(null, ctx)} next={(latest?.version ?? 0) + 1} />
          </div>
        </section>
      ) : null}

      {latest ? (
        <section className={`${styles.group} ${styles.loud}`} aria-labelledby="blueprint-latest">
          <div className={styles.groupHead}>
            <h3 id="blueprint-latest" className={styles.groupTitle}>
              Version <span className="num">{latest.version}</span>
              <StateTag>{BLUEPRINT_STATUS_LABELS[latest.status]}</StateTag>
              {blueprintStale(latest, new Date()) ? <NeedsChecking /> : null}
            </h3>
          </div>
          <div className={styles.blueprintFile}>
            <Icon name="note" size={20} />
            <span>
              <span className={styles.blueprintName}>{latest.fileName}</span>
              <span className={styles.blueprintMeta}>
                {fileSize(latest.sizeBytes)}. Uploaded {formatDate(latest.uploadedAt)} by {who(latest.uploadedBy)}
              </span>
            </span>
          </div>
          <ul className={styles.blueprintFacts}>
            {latest.status === 'draft' ? <li>A Draft: only the AdmitLabs team sees it. Share it when it is ready.</li> : null}
            {latest.sharedAt && latest.status !== 'draft' ? (
              <li>
                Shared {formatDate(latest.sharedAt)}
                {latest.sharedBy ? ` by ${who(latest.sharedBy)}` : ''}.
              </li>
            ) : null}
            {latest.approvedAt ? (
              <li>
                Approved {formatDate(latest.approvedAt)} by {who(latest.approvedBy)}.
              </li>
            ) : null}
            {latest.changesAt ? (
              <li>
                {who(latest.changesBy)} asked for changes on {formatDate(latest.changesAt)}: “{latest.changesNote}”
              </li>
            ) : null}
            {blueprintStale(latest, new Date()) ? <li>It is older than {BRAIN_RULES.blueprint.checkDays} days: time for a fresh version.</li> : null}
            {readable ? <li>{readable.text ? `Ask the brain reads version ${readable.version}.` : `Ask the brain cannot read version ${readable.version} yet: its words are not plain text in the PDF.`}</li> : null}
          </ul>
          <div className={`${styles.rowActions} ${styles.blueprintActions}`}>
            <FileLinks version={latest} />
          </div>
          {team && canEdit ? (
            <div className={`${styles.rowActions} ${styles.blueprintActions}`}>
              {MOVES[latest.status].map((move) => (
                <form key={move.to} action={setBlueprintStatusAction.bind(null, { ...ctx, blueprintId: latest.id, status: move.to })} className={styles.inlineForm}>
                  <Button type="submit" size="sm" variant={move.to === 'shared' && latest.status === 'draft' ? 'primary' : 'secondary'}>
                    {move.label}
                  </Button>
                </form>
              ))}
            </div>
          ) : null}
          {!team && canEdit && latest.status === 'shared' ? (
            <div className={styles.blueprintAnswer}>
              <p className={styles.groupNote}>Read it, then approve it, or ask your AdmitLabs team for changes.</p>
              <form action={approveBlueprintAction.bind(null, { ...ctx, blueprintId: latest.id })} className={styles.inlineForm}>
                <Button type="submit" icon="checkCircle">
                  Approve
                </Button>
              </form>
              <div className={styles.form}>
                <AskChangesForm action={askBlueprintChangesAction.bind(null, { ...ctx, blueprintId: latest.id })} />
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <section className={styles.group} aria-labelledby="blueprint-none">
          <div className={styles.groupHead}>
            <h3 id="blueprint-none" className={styles.groupTitle}>
              No Blueprint yet
            </h3>
          </div>
          <p className={styles.groupNote}>
            {team ? 'Upload the PDF above. It stays a Draft, for the team only, until you share it with the college.' : 'Your AdmitLabs team shares your Blueprint here: the plan for your college, as a PDF to read and approve.'}
          </p>
        </section>
      )}

      {past.length ? (
        <section className={styles.group} aria-labelledby="blueprint-past">
          <div className={styles.groupHead}>
            <h3 id="blueprint-past" className={styles.groupTitle}>
              Past versions
            </h3>
            <span className={`${styles.count} num`}>{past.length}</span>
          </div>
          <ul className={styles.rows}>
            {past.map((version) => (
              <li key={version.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <p className={styles.rowLabel}>
                    Version <span className="num">{version.version}</span>
                    <StateTag>{BLUEPRINT_STATUS_LABELS[version.status]}</StateTag>
                  </p>
                  <p className={styles.rowValue}>{version.fileName}</p>
                  <p className={styles.checkLine}>
                    Uploaded {formatDate(version.uploadedAt)} by {who(version.uploadedBy)}
                    {version.approvedAt ? `. Approved ${formatDate(version.approvedAt)} by ${who(version.approvedBy)}` : ''}.
                  </p>
                </div>
                <div className={`${styles.rowActions} ${styles.blueprintActions}`}>
                  <FileLinks version={version} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
