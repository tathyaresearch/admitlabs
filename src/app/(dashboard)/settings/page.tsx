import { AddedTag } from '@/components/details/Added';
import { Button } from '@/components/ui/Button';
import { Card, FactList, PageHead } from '@/components/ui/Layout';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { institutionDetailLines, isEmptyProgram, programDetailLines, EMPTY_PROGRAM_DETAILS } from '@/domain/details';
import { formatDate } from '@/domain/format';
import { INSTITUTION_TYPE_LABELS, MEMBERSHIP_ROLE_LABELS } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadAuditPage, nextAuditText } from '@/lib/audit/load';
import { loadAddedDetails } from '@/lib/details/load';
import { createClient } from '@/lib/supabase/server';
import { removeMemberAction, revokeInviteAction } from './actions';
import { InstitutionDetailsForm, ProgramDetailsForm } from './DetailsForms';
import { DetailsForm, FreeProgramForm, InviteForm, ProgramsForm } from './SettingsForms';
import styles from './settings.module.css';

export const metadata = { title: 'Settings' };

// Settings: "Your institution, programs and people." One tab per form, each with its own Save.
export default async function SettingsPage() {
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  const owner = role === 'owner';
  const supabase = await createClient();

  const [details, audit, peopleRows, invites, added] = await Promise.all([
    supabase.from('institutions').select('name, type, city, state, website, instagram, youtube, other_links').eq('id', institution.id).single(),
    loadAuditPage(viewer),
    supabase.rpc('institution_people', { p_institution: institution.id }),
    supabase.from('invites').select('id, email, created_at').eq('institution_id', institution.id).is('accepted_at', null).order('created_at'),
    loadAddedDetails(institution.id),
  ]);
  const row = details.data;
  const links = (row?.other_links ?? {}) as { facebook?: string; linkedin?: string };
  const programs = audit.programs.filter((program) => !program.archived);
  const freeProgram = programs.find((program) => program.id === viewer.plan?.freeProgramId);
  const initial = {
    name: row?.name ?? '',
    type: row?.type ?? '',
    city: row?.city ?? '',
    state: row?.state ?? '',
    website: row?.website ?? '',
    instagram: row?.instagram ? `@${row.instagram}` : '',
    youtube: row?.youtube ?? '',
    facebook: links.facebook ?? '',
    linkedin: links.linkedin ?? '',
  };

  const people = peopleRows.data ?? [];
  const invited = invites.data ?? [];

  const tabs: TabItem[] = [
    {
      id: 'details',
      label: 'Details',
      content: (
        <div className={styles.tab}>
          <p className={styles.tabNote}>What Drishti checks: your name, type, city and public links.</p>
          <Card padding="md">
            {owner ? (
              <DetailsForm initial={initial} />
            ) : (
              <FactList
                items={[
                  { label: 'Name', value: initial.name },
                  { label: 'Type', value: row ? INSTITUTION_TYPE_LABELS[row.type] : '' },
                  { label: 'City', value: `${initial.city}, ${initial.state}` },
                  { label: 'Website', value: initial.website.replace(/^https?:\/\//, '') },
                  { label: 'Instagram', value: initial.instagram || 'Not added' },
                  { label: 'YouTube', value: initial.youtube || 'Not added' },
                  { label: 'Facebook', value: initial.facebook || 'Not added' },
                  { label: 'LinkedIn', value: initial.linkedin || 'Not added' },
                ]}
              />
            )}
          </Card>
        </div>
      ),
    },
    {
      id: 'about',
      label: 'About',
      content: (
        <div className={styles.tab}>
          <div className={styles.tabNoteRow}>
            <AddedTag />
            <p className={styles.tabNote}>Drishti shows this next to what it finds, and uses it in how to fix and your report. It never changes your score.</p>
          </div>
          <Card padding="md">
            {owner ? (
              <InstitutionDetailsForm initial={added.institution} institutionType={institution.type} />
            ) : institutionDetailLines(added.institution, institution.type).length ? (
              <FactList items={institutionDetailLines(added.institution, institution.type)} />
            ) : (
              <p className={styles.plainText}>Nothing added yet. The owner adds these.</p>
            )}
          </Card>
        </div>
      ),
    },
    {
      id: 'programs',
      label: 'Programs',
      count: programs.length,
      content: (
        <div className={styles.tab}>
          <p className={styles.tabNote}>Every program you offer. Removing one keeps it in past Audits.</p>
          <Card padding="md">
            {owner ? (
              <ProgramsForm programs={programs.map((program) => ({ name: program.name, programKey: program.programKey }))} />
            ) : (
              <ul className={styles.plainList}>
                {programs.map((program) => (
                  <li key={program.id}>{program.name}</li>
                ))}
              </ul>
            )}
          </Card>
          <div className={styles.programDetailsHead}>
            <h2 className={styles.programDetailsTitle}>Details for each program</h2>
            <div className={styles.tabNoteRow}>
              <AddedTag />
              <p className={styles.tabNote}>Fees, seats, placements and dates. Shown as added by you. Never part of your score.</p>
            </div>
          </div>
          <div className={styles.programDetails}>
            {programs.map((program) => {
              const programAdded = added.programs.get(program.id) ?? EMPTY_PROGRAM_DETAILS;
              const lines = programDetailLines(programAdded);
              return (
                <details key={program.id} className={styles.programDetail}>
                  <summary className={styles.programSummary}>
                    <span className={styles.programName}>
                      {program.name}
                      <span className={styles.programMeta}>{isEmptyProgram(programAdded) ? 'Nothing added yet' : lines.map((line) => line.label).join(', ')}</span>
                    </span>
                  </summary>
                  <div className={styles.programBody}>
                    {owner ? (
                      <ProgramDetailsForm programId={program.id} programName={program.name} initial={programAdded} />
                    ) : lines.length ? (
                      <FactList items={lines} />
                    ) : (
                      <p className={styles.plainText}>Nothing added yet. The owner adds these.</p>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      ),
    },
    ...(viewer.tier === 'free'
      ? [
          {
            id: 'free-program',
            label: 'Free Audit program',
            content: (
              <div className={styles.tab}>
                <p className={styles.tabNote}>Your free Audit covers one program. Paid covers every program.</p>
                <Card padding="md">
                  {owner ? (
                    <FreeProgramForm
                      programs={programs.map((program) => ({ id: program.id, name: program.name }))}
                      current={freeProgram?.id ?? null}
                      note={`You can change it at any time. It applies at your next free Audit${audit.nextAudit ? `, on ${formatDate(audit.nextAudit.on)}` : ''}.`}
                    />
                  ) : (
                    <p className={styles.plainText}>
                      {freeProgram ? `Your free Audit covers ${freeProgram.name}. ${nextAuditText(audit)}.` : 'The owner has not picked a program yet.'}
                    </p>
                  )}
                </Card>
              </div>
            ),
          },
        ]
      : []),
    {
      id: 'people',
      label: 'People',
      count: people.length + invited.length,
      content: (
        <div className={styles.tab}>
          <p className={styles.tabNote}>Everyone who can see this dashboard.</p>
          <Card padding="md">
            <ul className={styles.people}>
              {people.map((person) => (
                <li key={person.user_id} className={styles.person}>
                  <span className={styles.personEmail}>
                    {person.email}
                    <span className={styles.personRole}>
                      {MEMBERSHIP_ROLE_LABELS[person.role]}
                      {person.user_id === viewer.userId ? ', you' : ''}
                    </span>
                  </span>
                  {owner && person.role === 'member' ? (
                    <form action={removeMemberAction}>
                      <input type="hidden" name="user" value={person.user_id} />
                      <Button type="submit" variant="quiet" size="sm">
                        Remove
                      </Button>
                    </form>
                  ) : null}
                </li>
              ))}
              {invited.map((invite) => (
                <li key={invite.id} className={styles.person}>
                  <span className={styles.personEmail}>
                    {invite.email}
                    <span className={styles.personRole}>Invited {formatDate(invite.created_at)}</span>
                  </span>
                  {owner ? (
                    <form action={revokeInviteAction}>
                      <input type="hidden" name="invite" value={invite.id} />
                      <Button type="submit" variant="quiet" size="sm">
                        Cancel invite
                      </Button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
            {owner ? <InviteForm /> : null}
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHead
        title="Settings"
        question="Your institution, programs and people."
        caption={owner ? ['Changes apply from your next Audit'] : ['Only the owner of this account can change these']}
      />
      <Tabs label="Settings" items={tabs} />
    </div>
  );
}
