'use client';

// Bulk Audit in three steps on one page: add a list (paste it or choose a CSV file), check every
// row, then run a team Audit for each ready row with a progress bar and see the results.

import Link from 'next/link';
import { useState, useTransition, type ReactNode } from 'react';
import { checkListAction, runRowAction, startRunAction, type BulkCheck, type BulkResult } from '@/app/team/bulk/actions';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Data';
import { TextAreaField } from '@/components/ui/Form';
import { plural } from '@/domain/format';
import { SAMPLE_BULK_LIST } from '@/sample/bulk';
import styles from './team.module.css';

const STATUS_WORDS = { ready: 'Ready', fix: 'Needs fixing', skip: 'Skipped' } as const;

function Step({ number, title, done, children }: { number: number; title: string; done: boolean; children: ReactNode }) {
  return (
    <section className={styles.facts} aria-labelledby={`step-${number}`}>
      <div className={styles.stepHead}>
        <span className={`${styles.stepNumber} num`} data-done={done ? 'true' : 'false'}>
          {number}
        </span>
        <h2 id={`step-${number}`} className={styles.itemTitle}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export function BulkAudit({ maxRows }: { maxRows: number }) {
  const [text, setText] = useState('');
  const [source, setSource] = useState<'paste' | 'csv'>('paste');
  const [check, setCheck] = useState<BulkCheck | null>(null);
  const [checking, startChecking] = useTransition();
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [runError, setRunError] = useState<string | null>(null);

  const ready = check?.rows.filter((row) => row.status === 'ready').length ?? 0;
  const done = results.length;

  function edit(value: string, from: 'paste' | 'csv') {
    setText(value);
    setSource(from);
    setCheck(null);
  }

  async function run() {
    setRunning(true);
    setRunError(null);
    setResults([]);
    const started = await startRunAction(text, source);
    if (started.error || !started.runId) {
      setRunError(started.error ?? 'The run could not be started.');
      setRunning(false);
      return;
    }
    setRunId(started.runId);
    setTotal(started.positions.length);
    for (const position of started.positions) {
      const result = await runRowAction(started.runId, position);
      setResults((previous) => [...previous, result]);
    }
    setRunning(false);
  }

  return (
    <div className={styles.steps}>
      <Step number={1} title="Add the list" done={Boolean(check)}>
        <TextAreaField
          id="bulk-list"
          label="The list of institutions"
          hideLabel
          rows={8}
          value={text}
          onChange={(event) => edit(event.target.value, 'paste')}
          placeholder={'name, website, city, type, programs, instagram\nBrahmaputra Valley College, brahmaputra-valley.example, Tezpur, College, BBA; BCA, @brahmaputravalley'}
          spellCheck={false}
          disabled={running}
        />
        <div className={styles.fileRow}>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className={styles.fileInput}
            aria-label="Choose a CSV file"
            disabled={running}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) edit(await file.text(), 'csv');
            }}
          />
          <Button type="button" size="sm" variant="quiet" onClick={() => edit(SAMPLE_BULK_LIST, 'paste')} disabled={running}>
            Try a sample list
          </Button>
        </div>
        <p className={styles.format}>
          One institution per line: <code>name, website, city, type, programs, instagram</code>. Separate programs with semicolons. A header row can put
          the columns in any order and add a <code>state</code> column. Type is College, University or Skilling institute. Up to {maxRows} at a time.
        </p>
        <div className={styles.inlineForm}>
          <Button
            type="button"
            loading={checking}
            disabled={!text.trim() || running}
            onClick={() =>
              startChecking(async () => {
                setCheck(await checkListAction(text));
                setResults([]);
                setRunId(null);
              })
            }
          >
            Check the list
          </Button>
        </div>
      </Step>

      {check ? (
        <Step number={2} title="Check every row" done={running || done > 0}>
          {check.error ? (
            <p className={styles.formError} role="alert">
              {check.error}
            </p>
          ) : (
            <>
              <p className={styles.formNote}>
                {plural(ready, 'row', 'rows')} ready
                {check.rows.length - ready ? `, ${check.rows.length - ready} not added` : ''}. Nothing is added until you run the Audits.
              </p>
              <div className={styles.rows}>
                {check.rows.map((row) => (
                  <div key={row.position} className={styles.checkRow}>
                    <span className={styles.checkPosition}>{row.position}</span>
                    <span>
                      <span className={styles.itemTitle}>{row.label}</span>
                      {row.place ? <span className={styles.itemMeta}> {row.place}</span> : null}
                      {row.problems.length ? (
                        <span className={styles.problems}>
                          {row.problems.map((problem) => (
                            <span key={problem}>{problem}</span>
                          ))}
                        </span>
                      ) : null}
                      {row.note ? <span className={styles.problems}>{row.note}</span> : null}
                    </span>
                    <Tag variant={row.status === 'ready' ? 'solid' : row.status === 'fix' ? 'outline' : 'quiet'}>{STATUS_WORDS[row.status]}</Tag>
                  </div>
                ))}
              </div>
              <div className={styles.inlineForm}>
                <Button type="button" onClick={run} loading={running} disabled={!ready || running || done > 0}>
                  {`Add ${plural(ready, 'institution', 'institutions')} and run their Audits`}
                </Button>
              </div>
              {runError ? (
                <p className={styles.formError} role="alert">
                  {runError}
                </p>
              ) : null}
            </>
          )}
        </Step>
      ) : null}

      {running || done ? (
        <Step number={3} title="Run the Audits" done={!running && done > 0}>
          <div className={styles.progress} aria-live="polite">
            <p className={styles.formNote}>{running ? `Auditing ${done + 1} of ${total}` : `Done: ${plural(results.filter((result) => result.status === 'audited').length, 'Audit', 'Audits')} saved. Each stays private until you share it.`}</p>
            <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Audits done">
              <div className={styles.progressFill} style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>
          </div>
          <div className={styles.results}>
            {results.map((result) => (
              <div key={result.position} className={styles.resultRow}>
                <span className={styles.rowName}>
                  {result.name}
                  <span className={styles.rowSub}>{result.status === 'audited' ? (result.reused ? 'Record reused' : 'New prospect') : result.message}</span>
                </span>
                <span className={styles.rowScore}>
                  {result.overall !== null ? <span className={`${styles.rowScoreNumber} num`}>{result.overall}</span> : null}
                  <span>{result.label ?? 'No Audit'}</span>
                </span>
                <span className={styles.pillarsMini}>
                  {result.pillars ? (
                    <>
                      <span>
                        Discovered <strong className="num">{result.pillars.discovered}</strong>
                      </span>
                      <span>
                        Trusted <strong className="num">{result.pillars.trusted}</strong>
                      </span>
                      <span>
                        Chosen <strong className="num">{result.pillars.chosen}</strong>
                      </span>
                    </>
                  ) : null}
                </span>
                <span className={styles.topFix}>{result.topFix ? `Top fix: ${result.topFix}` : ''}</span>
                <span className={styles.resultActions}>
                  {result.institutionId ? (
                    <ButtonLink href={`/team/institutions/${result.institutionId}`} size="sm" variant="secondary">
                      Open
                    </ButtonLink>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
          {!running && runId ? (
            <p className={styles.formNote}>
              These results stay under <Link href={`/team/bulk/${runId}`}>this run</Link>. Open a prospect to add notes and share its Audit.
            </p>
          ) : null}
        </Step>
      ) : null}
    </div>
  );
}
