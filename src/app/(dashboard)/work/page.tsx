import { notFound } from 'next/navigation';
import { EmptyState } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/Layout';
import { WorkList } from '@/components/work/WorkList';
import { ADMITLABS_EMAIL } from '@/config/team';
import { formatMonth } from '@/domain/format';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadWork } from '@/lib/team/work';
import { workByMonth } from '@/team/work';
import styles from '@/components/work/work-page.module.css';

export const metadata = { title: 'Your AdmitLabs team' };

// A Client's work page answers "What has our AdmitLabs team done?": what the team does next,
// then everything it did, by month, newest first, each with the day and a link to see it. Only
// a Client has an AdmitLabs team; the database shows the log to Clients only too.
export default async function WorkPage() {
  const viewer = await requireInstitutionViewer();
  if (viewer.tier !== 'client') notFound();
  const { next, months } = workByMonth(await loadWork(viewer.membership.institution.id));
  return (
    <div className={styles.page}>
      <PageHead
        back={{ href: '/', label: 'Home' }}
        title="Your AdmitLabs team"
        question="What has our AdmitLabs team done?"
        caption={[
          <span key="mail">
            Write to your team at{' '}
            <a href={`mailto:${ADMITLABS_EMAIL}`} className={styles.mail}>
              {ADMITLABS_EMAIL}
            </a>
          </span>,
        ]}
      />
      {next.length || months.length ? (
        <>
          {next.length ? (
            <section className={styles.group} aria-labelledby="work-next">
              <h2 id="work-next" className={styles.groupTitle}>
                Next
              </h2>
              <WorkList entries={next} />
            </section>
          ) : null}
          {months.map((group) => (
            <section key={group.month} className={styles.group} aria-labelledby={`work-${group.month}`}>
              <h2 id={`work-${group.month}`} className={styles.groupTitle}>
                Done in {formatMonth(group.month)}
              </h2>
              <WorkList entries={group.entries} />
            </section>
          ))}
        </>
      ) : (
        <EmptyState icon="team" title="Nothing logged yet" headingLevel={2}>
          Your AdmitLabs team adds each piece of work here as it is done, with the day and a link to see it. What it does next shows here too.
        </EmptyState>
      )}
    </div>
  );
}
