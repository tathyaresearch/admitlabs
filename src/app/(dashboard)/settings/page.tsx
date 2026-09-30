import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Data';
import { Card, FactList, PageHeader, Section } from '@/components/ui/Layout';
import { formatDate } from '@/domain/format';
import { INSTITUTION_TYPE_LABELS, MEMBERSHIP_ROLE_LABELS } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadAuditPage, nextAuditText } from '@/lib/audit/load';
import { createClient } from '@/lib/supabase/server';
import { removeMemberAction, revokeInviteAction } from './actions';
import { DetailsForm, FreeProgramForm, InviteForm, ProgramsForm } from './SettingsForms';
import styles from './settings.module.css';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  const owner = role === 'owner';
  const supabase = await createClient();

  const [details, audit, people, invites] = await Promise.all([
    supabase.from('institutions').select('name, type, city, state, website, instagram, youtube, other_links').eq('id', institution.id).single(),
    loadAuditPage(viewer),
    supabase.rpc('institution_people', { p_institution: institution.id }),
    supabase.from('invites').select('id, email, created_at').eq('institution_id', institution.id).is('accepted_at', null).order('created_at'),
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

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Settings"
        title="Your institution"
        description={owner ? 'Details, programs and people. Changes apply from your next Audit.' : 'Only the owner of this account can change these.'}
      />

      <Section id="details" title="Institution details" description="What Drishti checks: your name, type, city and public links.">
        <Card padding="lg">
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
      </Section>

      <Section id="programs" title="Programs" description="Every program you offer. Removing one keeps it in past Audits.">
        <Card padding="lg">
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
      </Section>

      {viewer.tier === 'free' ? (
        <Section id="free-program" title="Free Audit program" description="Your free Audit covers one program. Paid covers every program.">
          <Card padding="lg">
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
        </Section>
      ) : null}

      <Section id="people" title="People" description="Everyone who can see this dashboard.">
        <Card padding="lg">
          <ul className={styles.people}>
            {(people.data ?? []).map((person) => (
              <li key={person.user_id} className={styles.person}>
                <span className={styles.personEmail}>{person.email}</span>
                <span className={styles.personMeta}>
                  <Tag variant={person.role === 'owner' ? 'solid' : 'outline'}>{MEMBERSHIP_ROLE_LABELS[person.role]}</Tag>
                  {person.user_id === viewer.userId ? <span className={styles.you}>You</span> : null}
                  {owner && person.role === 'member' ? (
                    <form action={removeMemberAction}>
                      <input type="hidden" name="user" value={person.user_id} />
                      <Button type="submit" variant="quiet" size="sm">
                        Remove
                      </Button>
                    </form>
                  ) : null}
                </span>
              </li>
            ))}
            {(invites.data ?? []).map((invite) => (
              <li key={invite.id} className={styles.person}>
                <span className={styles.personEmail}>{invite.email}</span>
                <span className={styles.personMeta}>
                  <Tag variant="quiet">Invited {formatDate(invite.created_at)}</Tag>
                  {owner ? (
                    <form action={revokeInviteAction}>
                      <input type="hidden" name="invite" value={invite.id} />
                      <Button type="submit" variant="quiet" size="sm">
                        Cancel invite
                      </Button>
                    </form>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          {owner ? <InviteForm /> : null}
        </Card>
      </Section>
    </div>
  );
}
