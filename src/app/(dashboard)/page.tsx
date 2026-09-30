import { ButtonLink } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Data';
import { Notice } from '@/components/ui/Feedback';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Card, CardLink, Eyebrow, FactList, PageHeader } from '@/components/ui/Layout';
import { formatDate } from '@/domain/format';
import { planReminder } from '@/domain/tiers';
import { INSTITUTION_TYPE_LABELS, MEMBERSHIP_ROLE_LABELS, TIER_LABELS } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import styles from './home.module.css';

export const metadata = { title: 'Home' };

const FEATURES: ReadonlyArray<{ href: string; name: string; question: string; text: string; phase: number; icon: IconName }> = [
  { href: '/audit', name: 'Audit', question: 'How do we look?', text: 'Checks your public presence the way a student sees it, and gives you a score.', phase: 2, icon: 'audit' },
  { href: '/rivals', name: 'Rivals', question: "Who's ahead of us?", text: 'Tracks 3 to 5 competing institutions: their score, best content and moves.', phase: 3, icon: 'rivals' },
  { href: '/demand', name: 'Demand', question: 'What do students want?', text: 'Listens to what students search and ask online, grouped, never personal.', phase: 4, icon: 'demand' },
];

export default async function HomePage() {
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  const supabase = await createClient();
  const { data: programs } = await supabase.from('programs').select('id, name').eq('institution_id', institution.id).order('name');
  const reminder = planReminder(viewer.plan, new Date());
  const freeProgram = viewer.tier === 'free' ? programs?.find((program) => program.id === viewer.plan?.freeProgramId) : undefined;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={`${INSTITUTION_TYPE_LABELS[institution.type]} in ${institution.city}, ${institution.state}`}
        title={institution.name}
        meta={
          <>
            <Tag variant="solid">{TIER_LABELS[viewer.tier]} plan</Tag>
            <Tag>{MEMBERSHIP_ROLE_LABELS[role]}</Tag>
            <a className={styles.site} href={institution.website} target="_blank" rel="noreferrer">
              {institution.website.replace(/^https?:\/\//, '')}
              <Icon name="external" size={14} />
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </>
        }
      />

      {reminder.stage === 'ends_soon' || reminder.stage === 'ends_very_soon' ? (
        <Notice
          tone="inverse"
          icon="info"
          title={`Your Paid plan ends in ${reminder.daysLeft} ${reminder.daysLeft === 1 ? 'day' : 'days'}.`}
          action={
            <ButtonLink href="/plan" size="sm" variant="secondary">
              See your plan
            </ButtonLink>
          }
        >
          It does not renew on its own. When it ends you move to Free and keep your last Audit score.
        </Notice>
      ) : null}

      <section aria-labelledby="features-title" className={styles.features}>
        <h2 id="features-title" className="visually-hidden">
          Drishti features
        </h2>
        {FEATURES.map((feature, index) => (
          <CardLink key={feature.href} href={feature.href} className={styles.feature}>
            <div className={styles.featureTop}>
              <Eyebrow>
                0{index + 1} / {feature.name}
              </Eyebrow>
              <Icon name={feature.icon} size={22} />
            </div>
            <h3 className={styles.featureQuestion}>{feature.question}</h3>
            <p className={styles.featureText}>{feature.text}</p>
            <Tag variant="quiet">Arrives in Phase {feature.phase}</Tag>
          </CardLink>
        ))}
      </section>

      <div className={styles.split}>
        <Card>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Programs</h2>
            <span className={styles.count}>{programs?.length ?? 0}</span>
          </div>
          <ul className={styles.programs}>
            {(programs ?? []).map((program) => (
              <li key={program.id} className={styles.program}>
                <span>{program.name}</span>
                {freeProgram?.id === program.id ? <Tag>Free Audit</Tag> : null}
              </li>
            ))}
          </ul>
          {freeProgram ? <p className={styles.note}>Your Free Audit covers one program: {freeProgram.name}.</p> : null}
        </Card>

        <Card>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Plan</h2>
            <Tag variant="solid">{TIER_LABELS[viewer.tier]}</Tag>
          </div>
          <FactList
            items={[
              { label: 'Started', value: viewer.plan ? formatDate(viewer.plan.startsAt) : 'Not set' },
              {
                label: 'Ends',
                value: viewer.plan?.endsAt ? formatDate(viewer.plan.endsAt) : viewer.tier === 'client' ? 'While your service is active' : 'No end date',
              },
              ...(viewer.tier === 'paid' ? [{ label: 'Renews', value: 'Only if you choose to' }] : []),
            ]}
          />
          <div className={styles.cardFoot}>
            <ButtonLink href="/plan" variant="secondary" size="sm" iconAfter="arrowRight">
              Plan and access
            </ButtonLink>
          </div>
        </Card>
      </div>
    </div>
  );
}
