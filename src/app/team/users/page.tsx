import type { Metadata } from 'next';
import { ActionButton } from '@/components/team/InstitutionPanels';
import { TeamUserForm } from '@/components/team/TeamUserForm';
import { NameForm } from '@/components/people/NameForm';
import { PageHead } from '@/components/ui/Layout';
import { formatDate, plural } from '@/domain/format';
import { TEAM_ROLE_LABELS } from '@/domain/types';
import { requireTeamViewer } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { loadTeamPeople } from '@/lib/team/load';
import { addTeamUserAction, removeTeamInviteAction, removeTeamUserAction, setTeamRoleAction } from './actions';
import audit from '@/components/audit/audit.module.css';
import styles from '@/components/team/team.module.css';

// The title only names the page for the team, so the team area stays invisible to everyone else.
export async function generateMetadata(): Promise<Metadata> {
  const viewer = await getViewer();
  return { title: viewer?.teamRole ? 'Team users' : 'Page not found' };
}

// Team users: everyone on the AdmitLabs team, adding someone, and what each role can do.
export default async function TeamUsersPage() {
  const viewer = await requireTeamViewer();
  const isAdmin = viewer.teamRole === 'admin';
  const people = await loadTeamPeople();
  const members = people.filter((person) => !person.pending);
  const waiting = people.filter((person) => person.pending);
  const admins = members.filter((person) => person.role === 'admin').length;

  return (
    <div className={audit.page}>
      <PageHead
        title="Team users"
        question="Who can open the team area, and what each role can do."
        caption={[plural(members.length, 'person', 'people') + ' on the team', plural(admins, 'Admin', 'Admins'), isAdmin ? 'You are an Admin' : 'An Admin adds and removes people']}
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
                  {self ? <NameForm name={person.name} hint="Clients see it in their Brain’s History, beside what you changed." /> : null}
                  {isAdmin && person.userId && !self ? (
                    lastAdmin ? (
                      <p className={styles.formNote}>The only Admin. Make someone else an Admin to change this.</p>
                    ) : (
                      <div className={styles.itemActions}>
                        {person.role === 'team' ? (
                          <ActionButton
                            action={setTeamRoleAction.bind(null, person.userId, 'admin')}
                            label="Make them an Admin"
                            variant="secondary"
                            confirm="Admins also change plans and team users."
                          />
                        ) : (
                          <ActionButton
                            action={setTeamRoleAction.bind(null, person.userId, 'team')}
                            label="Make them Team"
                            variant="secondary"
                            confirm="They keep the team area, without plans and team users."
                          />
                        )}
                        <ActionButton
                          action={removeTeamUserAction.bind(null, person.userId)}
                          label="Remove from the team"
                          variant="quiet"
                          confirm="They lose the team area at once. Their notes stay."
                        />
                      </div>
                    )
                  ) : null}
                  {isAdmin && self ? <p className={styles.formNote}>Another Admin can change your role.</p> : null}
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
                {isAdmin ? (
                  <div className={styles.itemActions}>
                    <ActionButton action={removeTeamInviteAction.bind(null, person.email)} label="Remove" variant="quiet" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <div className={styles.stack}>
          {isAdmin ? (
            <section className={styles.panel} aria-labelledby="add-title">
              <h2 id="add-title" className={styles.panelTitle}>
                Add someone
              </h2>
              <p className={styles.panelHelp}>Someone who has signed in before joins at once. Anyone else joins when they first sign in with this email.</p>
              <TeamUserForm action={addTeamUserAction} />
            </section>
          ) : null}
          <section className={styles.panel} aria-labelledby="roles-title">
            <h2 id="roles-title" className={styles.panelTitle}>
              What each role can do
            </h2>
            <p className={styles.panelHelp}>Set here by an Admin.</p>
            <div className={styles.rows}>
              <div className={styles.item}>
                <span className={styles.itemTitle}>Team</span>
                <p className={styles.itemBody}>Every institution, Audits and bulk Audits, sharing, notes, manual entry, and dashboards read only.</p>
              </div>
              <div className={styles.item}>
                <span className={styles.itemTitle}>Admin</span>
                <p className={styles.itemBody}>Everything Team can do, plus plans and team users.</p>
              </div>
            </div>
            <p className={styles.formNote}>A team email cannot also be used for an institution.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
