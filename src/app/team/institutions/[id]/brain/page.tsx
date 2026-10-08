import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BRAIN_SECTIONS, type BrainSection } from '@/brain/model';
import { BrainScreen } from '@/components/brain/BrainScreen';
import { BrainTab, OnboardingCard, TeamOnlyNotes, ToConfirm } from '@/components/brain/Team';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PageHead } from '@/components/ui/Layout';
import { formatDate } from '@/domain/format';
import { canManage, requireInstitutionAccess } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { askBrain, historyTitle, loadBrainPage, loadFactHistory } from '@/lib/brain/page';
import { createClient } from '@/lib/supabase/server';
import { viewAsAction } from '../../../view-as-actions';
import styles from '@/components/brain/brain.module.css';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;

async function institutionOf(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('institutions').select('id, name').eq('id', id).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const viewer = await getViewer();
  const { id } = await params;
  if (!viewer?.teamRole || !UUID.test(id) || !(await canManage(viewer, id))) return { title: 'Page not found' };
  const institution = await institutionOf(id);
  return { title: institution ? `Client Brain: ${institution.name}` : 'Client Brain' };
}

// The team's Client Brain (spec section 26): the college's Brain, editable, with onboarding on top
// while it lasts (what's missing, the checklist, Mark as Ready, what Drishti found to confirm) and
// the team's own notes in Notes.
export default async function TeamBrainPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await requireInstitutionAccess(id);
  const institution = await institutionOf(id);
  if (!institution) notFound();
  const query = await searchParams;
  const page = await loadBrainPage(id, true);
  const base = `/team/institutions/${id}/brain`;
  if (!page) {
    return (
      <div className={styles.page}>
        <PageHead back={{ href: `/team/institutions/${id}`, label: institution.name }} title="Client Brain" question={`What do we know about ${institution.name}?`} />
        <BrainTab institutionId={id} page={null} name={institution.name} />
      </div>
    );
  }
  const asked = one(query.section);
  const section: BrainSection | 'overview' = BRAIN_SECTIONS.includes(asked as BrainSection) ? (asked as BrainSection) : 'overview';
  const target = one(query.history);
  const question = one(query.ask)?.trim().slice(0, 200) || null;
  const edit = one(query.edit);
  const [history, answer] = await Promise.all([target ? loadFactHistory(page, target, true) : Promise.resolve(null), question ? askBrain(page, question, true) : Promise.resolve(null)]);
  const onboarding = page.brain.status === 'onboarding';
  // A Client whose service ended: the team still reads the Brain, and nobody changes it.
  const { data: tier } = await (await createClient()).from('team_institutions').select('tier').eq('id', id).maybeSingle();
  const canEdit = tier?.tier === 'client';
  return (
    <BrainScreen
      page={page}
      base={base}
      section={section}
      edit={canEdit ? edit : null}
      canEdit={canEdit}
      team
      history={target && history ? { target, title: historyTitle(page, target), lines: history } : null}
      asked={answer}
      head={
        <PageHead
          back={{ href: `/team/institutions/${id}`, label: institution.name }}
          title="Client Brain"
          question={`What do we know about ${institution.name}?`}
          caption={[
            onboarding ? `Onboarding started ${formatDate(page.brain.started.at)}` : page.brain.ready ? `Ready since ${formatDate(page.brain.ready.at)}` : null,
            canEdit ? null : 'Not a Client now: read only',
          ]}
          actions={
            <>
              {onboarding && canEdit ? (
                <ButtonLink href={`${base}/kickoff`} variant="secondary" iconAfter="arrowRight">
                  Kickoff call
                </ButtonLink>
              ) : null}
              <form action={viewAsAction.bind(null, id)}>
                <Button type="submit" variant="quiet" iconAfter="arrowRight">
                  Open their dashboard
                </Button>
              </form>
            </>
          }
        />
      }
      top={
        onboarding && canEdit && section === 'overview' ? (
          <>
            <OnboardingCard page={page} base={base} />
            <ToConfirm page={page} base={base} edit={edit} />
          </>
        ) : canEdit && section === 'overview' ? (
          <ToConfirm page={page} base={base} edit={edit} />
        ) : null
      }
      teamOnly={<TeamOnlyNotes page={page} base={base} />}
    />
  );
}
