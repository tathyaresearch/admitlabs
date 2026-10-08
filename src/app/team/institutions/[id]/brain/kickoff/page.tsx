import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BRAIN_SECTIONS, SECTION_INFO, type BrainSection } from '@/brain/model';
import { PasswordNote, SectionHead } from '@/components/brain/Bits';
import { SectionBody } from '@/components/brain/Sections';
import { TeamOnlyNotes } from '@/components/brain/Team';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { requireInstitutionAccess } from '@/lib/auth/guards';
import { loadBrainPage } from '@/lib/brain/page';
import { createClient } from '@/lib/supabase/server';
import styles from '@/components/brain/brain.module.css';

export const metadata: Metadata = { title: 'Kickoff call' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;

// The kickoff call (spec section 26): the Client Brain one section at a time, in order, with every
// missing fact's form open, so the team asks, types and moves on. Anything the college does not
// know yet stays on its Help us know you form.
export default async function KickoffPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await requireInstitutionAccess(id);
  const page = await loadBrainPage(id, true);
  if (!page) notFound();
  const { data: tier } = await (await createClient()).from('team_institutions').select('tier').eq('id', id).maybeSingle();
  if (tier?.tier !== 'client') notFound();
  const query = await searchParams;
  const asked = one(query.step);
  const step: BrainSection = BRAIN_SECTIONS.includes(asked as BrainSection) ? (asked as BrainSection) : 'basics';
  const index = BRAIN_SECTIONS.indexOf(step);
  const base = `/team/institutions/${id}/brain`;
  const here = `${base}/kickoff?step=${step}`;
  const missing = new Set(page.progress.missing.map((slot) => slot.section));
  const previous = BRAIN_SECTIONS[index - 1];
  const next = BRAIN_SECTIONS[index + 1];
  return (
    <div className={styles.page}>
      <PageHead
        back={{ href: base, label: 'Client Brain' }}
        title="Kickoff call"
        question={`${page.brain.institution.name}’s Brain, one section at a time.`}
        caption={[`Step ${index + 1} of ${BRAIN_SECTIONS.length}: ${SECTION_INFO[step].name}`, `${page.progress.percent}% complete`]}
      />
      <ol className={styles.stepper} aria-label="Sections">
        {BRAIN_SECTIONS.map((section, position) => {
          const state = section === step ? 'now' : missing.has(section) ? 'next' : 'done';
          return (
            <li key={section}>
              <Link href={`${base}/kickoff?step=${section}`} className={styles.stepperItem} data-state={state} aria-current={section === step ? 'step' : undefined}>
                <span className={`${styles.stepperNum} num`}>{state === 'done' ? <Icon name="check" size={12} /> : position + 1}</span>
                {SECTION_INFO[section].name}
                <span className="visually-hidden">{state === 'done' ? ', nothing missing' : state === 'next' ? ', something missing' : ''}</span>
              </Link>
            </li>
          );
        })}
      </ol>
      <section className={styles.kickoff} aria-labelledby="kickoff-title">
        <SectionHead section={step} />
        <p className={styles.groupNote}>Ask, type, move on. Anything they don’t know yet stays on their Help us know you form.</p>
        <div className={styles.sectionBody}>
          <SectionBody page={page} base={base} section={step} edit={one(query.edit)} canEdit team kickoff returnTo={here} teamOnly={step === 'notes' ? <TeamOnlyNotes page={page} base={base} /> : undefined} />
        </div>
        <PasswordNote team />
        <div className={styles.kickoffFoot}>
          {previous ? (
            <ButtonLink href={`${base}/kickoff?step=${previous}`} variant="secondary" icon="chevronLeft">
              {SECTION_INFO[previous].name}
            </ButtonLink>
          ) : (
            <span />
          )}
          {next ? (
            <ButtonLink href={`${base}/kickoff?step=${next}`} iconAfter="arrowRight">
              Next: {SECTION_INFO[next].name}
            </ButtonLink>
          ) : (
            <ButtonLink href={base} iconAfter="arrowRight">
              Back to the Client Brain
            </ButtonLink>
          )}
        </div>
      </section>
    </div>
  );
}
