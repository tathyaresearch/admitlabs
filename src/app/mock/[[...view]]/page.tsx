// Version 2, Step 2: the development only mock page. Every new screen on sample data, with two
// options where there is a real design choice. Not found in production (and the closed website
// routing turns it away too), never indexed. Removed at the end of Step 3.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { mockAudit } from '@/components/mock/data-audit';
import { mockRivals } from '@/components/mock/data-more';
import { AuditView, FixPanelView, FreeAuditView, HomeView, ThinView } from '@/components/mock/HomeAudit';
import { LeadsView, ReviewItemView, ReviewListView, TeamLinksView, WaitingView } from '@/components/mock/LeadsTeam';
import { PublicFormView, ReadyEmailView, SummaryEmailView } from '@/components/mock/Outside';
import { ChooserView, DemandView, RivalsView } from '@/components/mock/RivalsDemand';
import { InstitutionShell, TeamShell } from '@/components/mock/Shell';
import styles from '@/components/mock/mock.module.css';

export const metadata: Metadata = { title: 'Version 2 mock', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const SHELLS = {
  eastgate: { name: 'Eastgate University', detail: 'Paid plan, ends 15 Oct', email: 'owner@eastgate-university.example', client: false },
  brightpath: { name: 'Brightpath Skills Academy', detail: 'Client', email: 'owner@brightpath-skills.example', client: true },
  northbank: { name: 'Northbank College', detail: 'Free plan', email: 'owner@northbank-college.example', client: false },
  loomcraft: { name: 'Loomcraft Skills Institute', detail: 'Free plan', email: 'owner@loomcraft-skills.example', client: false },
} as const;

const VIEWS: ReadonlyArray<{ group: string; items: ReadonlyArray<{ href: string; label: string }> }> = [
  {
    group: 'Home',
    items: [
      { href: '/mock/home?opt=1', label: 'Home, option 1: three word tiles (Eastgate, Paid)' },
      { href: '/mock/home?opt=2', label: 'Home, option 2: one inverted band (Eastgate, Paid)' },
      { href: '/mock/home?opt=1&as=client', label: 'Home for a Client, with enquiries (Brightpath)' },
      { href: '/mock/home/waiting', label: 'First Audit being checked (Loomcraft, Free)' },
    ],
  },
  {
    group: 'Audit',
    items: [
      { href: '/mock/audit?opt=1', label: 'Audit, option 1: place tabs, three columns' },
      { href: '/mock/audit?opt=2', label: 'Audit, option 2: places stacked, found then good and fix' },
      { href: '/mock/audit/fix', label: 'The fix panel, with a ready fix' },
      { href: '/mock/audit/free', label: 'Free’s Audit (Northbank)' },
      { href: '/mock/audit/thin', label: 'Not much said about you yet (Brightpath)' },
      { href: '/mock/audit?opt=1&held=1', label: 'A new Audit being checked, over the last one' },
    ],
  },
  {
    group: 'Rivals',
    items: [
      { href: '/mock/rivals?opt=1', label: 'Rivals, option 1: place by place as a grid' },
      { href: '/mock/rivals?opt=2', label: 'Rivals, option 2: a card per place' },
      { href: '/mock/rivals/choose', label: 'Picking rivals with Nearby city (Loomcraft, Tezpur)' },
    ],
  },
  {
    group: 'Demand',
    items: [
      { href: '/mock/demand?opt=1', label: 'Demand, option 1: Make these 3 as cards' },
      { href: '/mock/demand?opt=2', label: 'Demand, option 2: Make these 3 as rows that open' },
    ],
  },
  {
    group: 'Leads',
    items: [
      { href: '/mock/leads', label: 'Leads, the Client’s view (Brightpath)' },
      { href: '/mock/team/institutions/brightpath', label: 'The team’s tracking links (Brightpath)' },
      { href: '/mock/form?opt=1', label: 'Public form, option 1: ivory card' },
      { href: '/mock/form?opt=2', label: 'Public form, option 2: dark band' },
      { href: '/mock/form?done=1', label: 'Public form, sent' },
    ],
  },
  {
    group: 'Emails and review',
    items: [
      { href: '/mock/email/summary', label: 'Monthly summary email (Brightpath, Client)' },
      { href: '/mock/email/ready', label: 'Audit ready email (Northbank, Free)' },
      { href: '/mock/team/review', label: 'To review (team)' },
      { href: '/mock/team/review/northbank', label: 'One review: Northbank’s new Audit' },
    ],
  },
];

function Index() {
  return (
    <main className={styles.index}>
      <h1 className={styles.indexTitle}>Drishti version 2: mock screens</h1>
      <p className={styles.quiet}>Development only. Sample data. Not found in production.</p>
      {VIEWS.map((group) => (
        <section key={group.group} className={styles.indexGroup}>
          <h2 className={styles.indexGroupTitle}>{group.group}</h2>
          <ul className={styles.indexList}>
            {group.items.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

export default async function MockPage({ params, searchParams }: { params: Promise<{ view?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const [{ view = [] }, query] = await Promise.all([params, searchParams]);
  const path = view.join('/');
  const opt = query.opt === '2' ? 2 : 1;

  switch (path) {
    case '':
      return <Index />;
    case 'home': {
      const client = query.as === 'client';
      const shell = client ? SHELLS.brightpath : SHELLS.eastgate;
      const slug = client ? 'brightpath-skills' : 'eastgate-university';
      const [audit, rivals] = await Promise.all([mockAudit(slug), mockRivals(slug)]);
      return (
        <InstitutionShell {...shell}>
          <HomeView audit={audit} rivals={rivals} option={opt} client={client} />
        </InstitutionShell>
      );
    }
    case 'home/waiting':
      return (
        <InstitutionShell {...SHELLS.loomcraft}>
          <WaitingView />
        </InstitutionShell>
      );
    case 'audit':
      return (
        <InstitutionShell {...SHELLS.eastgate}>
          <AuditView audit={await mockAudit('eastgate-university')} option={opt} held={query.held === '1'} />
        </InstitutionShell>
      );
    case 'audit/fix':
      return (
        <InstitutionShell {...SHELLS.eastgate}>
          <FixPanelView audit={await mockAudit('eastgate-university')} />
        </InstitutionShell>
      );
    case 'audit/free':
      return (
        <InstitutionShell {...SHELLS.northbank}>
          <FreeAuditView audit={await mockAudit('northbank-college')} />
        </InstitutionShell>
      );
    case 'audit/thin':
      return (
        <InstitutionShell {...SHELLS.brightpath}>
          <ThinView audit={await mockAudit('brightpath-skills')} />
        </InstitutionShell>
      );
    case 'rivals':
      return (
        <InstitutionShell {...SHELLS.eastgate}>
          <RivalsView rivals={await mockRivals('eastgate-university')} option={opt} />
        </InstitutionShell>
      );
    case 'rivals/choose':
      return (
        <InstitutionShell {...SHELLS.loomcraft}>
          <ChooserView />
        </InstitutionShell>
      );
    case 'demand':
      return (
        <InstitutionShell {...SHELLS.eastgate}>
          <DemandView option={opt} />
        </InstitutionShell>
      );
    case 'leads':
      return (
        <InstitutionShell {...SHELLS.brightpath}>
          <LeadsView />
        </InstitutionShell>
      );
    case 'team/review':
      return (
        <TeamShell>
          <ReviewListView />
        </TeamShell>
      );
    case 'team/review/northbank':
      return (
        <TeamShell>
          <ReviewItemView audit={await mockAudit('northbank-college', { full: true })} />
        </TeamShell>
      );
    case 'team/institutions/brightpath':
      return (
        <TeamShell>
          <TeamLinksView />
        </TeamShell>
      );
    case 'form':
      return <PublicFormView option={opt} done={query.done === '1'} />;
    case 'email/summary': {
      const [audit, rivals] = await Promise.all([mockAudit('brightpath-skills'), mockRivals('brightpath-skills')]);
      return <SummaryEmailView audit={audit} rivals={rivals} />;
    }
    case 'email/ready':
      return <ReadyEmailView audit={await mockAudit('northbank-college')} />;
    default:
      notFound();
  }
}
