import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionButton } from '@/components/team/InstitutionPanels';
import { TeamUserForm } from '@/components/team/TeamUserForm';
import { NameForm } from '@/components/people/NameForm';
import { PageHead } from '@/components/ui/Layout';
import { formatDate, plural } from '@/domain/format';
import { TEAM_ROLE_LABELS, TEAM_ROLE_LINES, TEAM_ROLES, type TeamRole } from '@/domain/types';
import { requireAdmin } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { loadManagedClients, loadTeamPeople } from '@/lib/team/load';
import { addTeamUserAction, removeTeamInviteAction, removeTeamUserAction, setTeamRoleAction } from './actions';
import audit from '@/components/audit/audit.module.css';
import styles from '@/components/team/team.module.css';

// The title only names the page for an Admin, so the page stays invisible to everyone else.
export async function generateMetadata(): Promise<Metadata> {
  const viewer = await getViewer();
  return { title: viewer?.teamRole === 'admin' ? 'Team' : 'Page not found' };
}

/** Changing someone's level: a line on what they get, asked before it happens. */
const MAKE: Readonly<Record<TeamRole, { label: string; confirm: string }>> = {
  admin: { label: 'Make them an Admin', confirm: 'Admins also change plans and the team, here.' },
  team: { label: 'Make them a Team member', confirm: 'They open the whole team area, without plans and this page.' },
  client_manager: { label: 'Make them a Client manager', confirm: 'They see only the Clients assigned to them, and their own Enquiries.' },
};

// The Team page (spec section 27): Admins only. Everyone on the AdmitLabs team with their level,
// a Client manager's Clients, adding someone, and what each level can open.
export default async function TeamPage() {
  const viewer = await requireAdmin();
  const [people, managed] = await Promise.all([loadTeamPeople(), loadManagedClients()]);
  // Admins first, then Team members, then Client managers.
  const members = people.filter((person) => !person.pending).sort((a, b) => TEAM_ROLES.indexOf(a.role) - TEAM_ROLES.indexOf(b.role));
  const waiting = people.filter((person) => person.pending);
  const admins = members.filter((person) => person.role === 'admin').length;
  const managers = members.filter((person) => person.role === 'client_manager').length;

  return (
    <div className={audit.page}>
      <PageHead
        title="Team"
        question="Who is on the AdmitLabs team, and what can each open?"
        caption={[plural(members.length, 'person', 'people') + ' on the team', plural(admins, 'Admin', 'Admins'), plural(managers, 'Client manager', 'Client managers')]}
      />
      <div className={styles.split}>
        <section className={styles.panel} aria-labelledby="team-title">
          <h2 id="team-title" className={styles.panelTitle}>
            The team
          </h2>
          <div className={styles.rows}>
            {members.map((person) => {
              const self = person.userId === viewer.userId;
              const lastAdmin = person.role === 'admin' && admins === 1;
              const clients = person.userId ? (managed.get(person.userId) ?? []) : [];
              return (
                <div key={person.email} className={styles.item}>
                  <div className={styles.itemHead}>
                    <span className={styles.itemTitle}>{person.name ?? person.email}</span>
                    <span className={styles.itemRole}>
                      {TEAM_ROLE_LABELS[person.role]}
                      {self ? <span className={styles.itemQuiet}>, you</span> : null}
                    </span>
                  </div>
                  <p className={styles.itemMeta}>
                    {person.name ? `${person.email}. ` : ''}On the team since {formatDate(person.since)}
                  </p>
                  {person.role === 'client_manager' ? (
                    <p className={styles.itemBody}>
                      {clients.length ? (
                        <>
                          Looks after{' '}
                          {clients.map((client, index) => (
                            <span key={client.id}>
                              {index ? (index === clients.length - 1 ? ' and ' : ', ') : ''}
                              <Link href={`/team/institutions/${client.id}`} className={styles.link}>
                                {client.name}
                              </Link>
                            </span>
                          ))}
                          .
                        </>
                      ) : (
                        'No Clients yet. Assign them on a Client’s page.'
                      )}
                    </p>
                  ) : null}
                  {self ? <NameForm name={person.name} hint="Clients see it in their Brain’s History, beside what you changed." /> : null}
                  {person.userId && !self ? (
                    lastAdmin ? (
                      <p className={styles.formNote}>The only Admin. Make someone else an Admin to change this.</p>
                    ) : (
                      <div className={styles.itemActions}>
                        {TEAM_ROLES.filter((role) => role !== person.role).map((role) => (
                          <ActionButton key={role} action={setTeamRoleAction.bind(null, person.userId as string, role)} label={MAKE[role].label} variant="secondary" confirm={MAKE[role].confirm} />
                        ))}
                        <ActionButton
                          action={removeTeamUserAction.bind(null, person.userId)}
                          label="Remove from the team"
                          variant="quiet"
                          confirm="They lose the team area at once. Their notes stay."
                        />
                      </div>
                    )
                  ) : null}
                  {self ? <p className={styles.formNote}>Another Admin can change your level.</p> : null}
                </div>
              );
            })}
            {waiting.map((person) => (
              <div key={person.email} className={styles.item}>
                <div className={styles.itemHead}>
                  <span className={styles.itemTitle}>{person.email}</span>
                  <span className={styles.itemRole}>
                    {TEAM_ROLE_LABELS[person.role]}
                    <span className={styles.itemQuiet}>, not signed in yet</span>
                  </span>
                </div>
                <p className={styles.itemMeta}>Added {formatDate(person.since)}. Joins at first sign in.</p>
                <div className={styles.itemActions}>
                  <ActionButton action={removeTeamInviteAction.bind(null, person.email)} label="Remove" variant="quiet" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className={styles.stack}>
          <section className={styles.panel} aria-labelledby="add-title">
            <h2 id="add-title" className={styles.panelTitle}>
              Add someone
            </h2>
            <p className={styles.panelHelp}>Someone who has signed in before joins at once. Anyone else joins when they first sign in with this email.</p>
            <TeamUserForm action={addTeamUserAction} />
          </section>
          <section className={styles.panel} aria-labelledby="roles-title">
            <h2 id="roles-title" className={styles.panelTitle}>
              What each level can open
            </h2>
            <p className={styles.panelHelp}>Enforced by the database, not only by the menu.</p>
            <div className={styles.rows}>
              {TEAM_ROLES.map((role) => (
                <div key={role} className={styles.item}>
                  <span className={styles.itemTitle}>{TEAM_ROLE_LABELS[role]}</span>
                  <p className={styles.itemBody}>{TEAM_ROLE_LINES[role]}</p>
                </div>
              ))}
            </div>
            <p className={styles.formNote}>Only Admins and Team members make a won enquiry a Client. A team email cannot also be used for an institution.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
