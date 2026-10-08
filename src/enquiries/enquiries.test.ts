import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { teamLeadAlertEmail, teamLeadAlertParts, type TeamLeadAlertInput } from './alert.ts';
import { AUTOMATIC_SOURCES, isOpen, leadTitle, LOST_REASONS, SOCIAL_SOURCES, sourceLine, TEAM_LEAD_SOURCE_LABELS, TEAM_LEAD_SOURCES, TEAM_LEAD_STATUSES, TEAM_LEAD_STATUS_LABELS } from './model.ts';

const sql = readFileSync(new URL('../../supabase/migrations/20261023120100_team_leads.sql', import.meta.url), 'utf8');
const enumValues = (name: string) => {
  const match = new RegExp(`create type public\\.${name} as enum \\(([^)]*)\\)`).exec(sql);
  return [...(match?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map((value) => value[1]);
};

describe('Enquiries: AdmitLabs own leads (spec section 27)', () => {
  test('sources, statuses and lost reasons are the database’s', () => {
    assert.deepEqual(enumValues('team_lead_source'), [...TEAM_LEAD_SOURCES]);
    assert.deepEqual(enumValues('team_lead_status'), [...TEAM_LEAD_STATUSES]);
    assert.deepEqual(enumValues('team_lead_lost_reason'), [...LOST_REASONS]);
  });

  test('the sources a person picks are the social ones; the rest come in on their own', () => {
    assert.deepEqual([...SOCIAL_SOURCES], ['instagram', 'facebook', 'linkedin', 'youtube', 'whatsapp', 'referral', 'event', 'other']);
    assert.deepEqual([...AUTOMATIC_SOURCES], ['website', 'free_signup', 'fix_request', 'services', 'ask_paid', 'continue_paid']);
    assert.match(sql, /p_source in \('instagram', 'facebook', 'linkedin', 'youtube', 'whatsapp', 'referral', 'event', 'other'\)/);
  });

  test('the words, as the team reads them', () => {
    assert.deepEqual(TEAM_LEAD_STATUSES.map((status) => TEAM_LEAD_STATUS_LABELS[status]), ['New', 'Contacted', 'Call booked', 'Proposal sent', 'Won', 'Lost']);
    assert.equal(TEAM_LEAD_SOURCE_LABELS.ask_paid, 'Asked for Paid');
    assert.equal(TEAM_LEAD_SOURCE_LABELS.continue_paid, 'Asked to renew');
    assert.equal(TEAM_LEAD_SOURCE_LABELS.website, 'Talk to us form');
    assert.equal(sourceLine('instagram', 'Bio link'), 'Instagram, Bio link');
    assert.equal(sourceLine('fix_request', 'Show your fees'), 'Let AdmitLabs fix this: Show your fees');
    assert.equal(sourceLine('free_signup', null), 'Free sign up');
    assert.ok(isOpen('call_booked') && !isOpen('won') && !isOpen('lost'));
    assert.equal(leadTitle({ name: null, institution: 'Hilltop Institute', email: 'x@y.example' }), 'Hilltop Institute');
  });

  const alert: TeamLeadAlertInput = {
    kind: 'new',
    name: 'Asha Rao',
    institution: 'Leadton College',
    city: 'Guwahati',
    phone: '+919876543210',
    email: 'asha@leadton.example',
    wants: 'More BBA admissions.',
    source: 'instagram',
    sourceDetail: 'Bio link',
    owner: null,
    at: '2026-10-08T06:30:00.000Z',
    url: 'http://localhost:3000/team/enquiries/abc',
  };

  test('the alert for a new lead: who, how to reach them, where from, and that it has no owner yet', () => {
    const email = teamLeadAlertEmail(alert, ['admin@admitlabs.example']);
    assert.equal(email.kind, 'team_lead_alert');
    assert.equal(email.subject, 'New enquiry: Asha Rao, Leadton College');
    assert.match(email.text, /Asha Rao, Leadton College came in through Instagram, Bio link\./);
    assert.match(email.text, /\+91 98765 43210/);
    assert.match(email.text, /every Admin gets this/);
    assert.match(email.html, /team\/enquiries\/abc/);
  });

  test('the alert when a lead comes back, to its owner', () => {
    const parts = teamLeadAlertParts({ ...alert, kind: 'returning', owner: 'Kabir Sen' });
    assert.equal(parts.title, 'An enquiry came back');
    assert.deepEqual(parts.after, []);
    assert.equal(teamLeadAlertEmail({ ...alert, kind: 'returning', owner: 'Kabir Sen' }, ['team@admitlabs.example']).subject, 'Came back: Asha Rao');
  });
});

describe('the sample Enquiries', () => {
  test('what the team did matches a lead the sample makes, and every link it names exists', async () => {
    const { SAMPLE_HAND_LEADS, SAMPLE_LEAD_WORK, SAMPLE_TALK_ENQUIRIES, SAMPLE_TEAM_LINKS } = await import('../sample/enquiries.ts');
    const { SAMPLE_INSTITUTIONS } = await import('../sample/institutions.ts');
    const owners = SAMPLE_INSTITUTIONS.flatMap((sample) => (sample.owner ? [sample.owner] : []));
    const known = [...SAMPLE_TALK_ENQUIRIES.map((entry) => entry.email), ...SAMPLE_HAND_LEADS.flatMap((entry) => [entry.email, entry.phone]), ...owners];
    for (const work of SAMPLE_LEAD_WORK) assert.ok(known.includes(work.match), work.match);
    for (const entry of SAMPLE_TALK_ENQUIRIES) if (entry.link) assert.ok(SAMPLE_TEAM_LINKS.some((link) => link.code === entry.link), entry.link);
    const lost = SAMPLE_LEAD_WORK.filter((work) => work.status === 'lost');
    assert.ok(lost.every((work) => work.lost), 'Lost always has a reason');
  });
});

describe('the Enquiries screens', async () => {
  const { activityLine, followUpState, followUpWords, leadFiltersQuery, NO_LEAD_FILTERS, parseLeadFilters, teamLeadsCsv, viewStatuses } = await import('./view.ts');

  test('filters from the address and back, the defaults left out', () => {
    const filters = parseLeadFilters({ view: 'won', source: 'instagram', owner: 'ME', due: '1', q: ' Asha ' });
    assert.deepEqual(filters, { view: 'won', source: 'instagram', owner: 'me', due: true, q: 'Asha' });
    assert.equal(leadFiltersQuery(filters), '?view=won&source=instagram&owner=me&due=1&q=Asha');
    assert.equal(leadFiltersQuery(NO_LEAD_FILTERS), '');
    assert.deepEqual(parseLeadFilters({ view: 'nope', source: 'tiktok', owner: 'x' }), NO_LEAD_FILTERS);
    assert.deepEqual([...viewStatuses('open')], ['new', 'contacted', 'call_booked', 'proposal_sent']);
  });

  test('a follow-up is overdue, today or later, and never on a closed lead', () => {
    assert.equal(followUpState('2026-10-07', 'contacted', '2026-10-08'), 'overdue');
    assert.equal(followUpState('2026-10-08', 'new', '2026-10-08'), 'today');
    assert.equal(followUpState('2026-10-12', 'call_booked', '2026-10-08'), 'later');
    assert.equal(followUpState('2026-10-07', 'won', '2026-10-08'), null);
    assert.equal(followUpWords('2026-10-08', 'new', '2026-10-08'), 'Today');
    assert.equal(followUpWords(null, 'new', '2026-10-08'), 'None');
  });

  test('History in words', () => {
    const name = (id: string | null) => (id === 'u1' ? 'Kabir Sen' : 'Someone');
    const institution = (id: string | null) => (id === 'i1' ? 'Silverline College' : null);
    const row = (kind: Parameters<typeof activityLine>[0]['kind'], data: Record<string, unknown>, body: string | null = null) => ({ id: 'a', at: '2026-10-08T06:30:00Z', by: 'u1', kind, body, data });
    assert.equal(activityLine(row('created', { source: 'website' }), name, institution), 'Came in through Talk to us form');
    assert.equal(activityLine(row('came_back', { source: 'event' }), name, institution), 'Came back through Event');
    assert.equal(activityLine(row('created', { source: 'referral', by_hand: true }), name, institution), 'Added by hand, from Referral');
    assert.equal(activityLine(row('status', { to: 'lost', reason: 'price', note: 'Too soon.' }), name, institution), 'Lost: Price. Too soon.');
    assert.equal(activityLine(row('status', { to: 'call_booked' }), name, institution), 'Status: Call booked');
    assert.equal(activityLine(row('owner', { to: 'u1' }), name, institution), 'Owner: Kabir Sen');
    assert.equal(activityLine(row('edited', { fields: ['phone', 'wants'] }), name, institution), 'Changed the phone and what they want');
    assert.equal(activityLine(row('made_client', { institution_id: 'i1' }), name, institution), 'Made a Client: Silverline College. Onboarding started');
  });

  test('the CSV: phones as text, every note, a formula never runs', () => {
    const csv = teamLeadsCsv([
      {
        createdAt: '2026-10-02T13:30:00.000Z',
        lastInAt: '2026-10-06T11:30:00.000Z',
        name: '=Rahul',
        institution: 'Pinewood College',
        city: 'Guwahati',
        phone: '+919876500011',
        email: 'rahul@pinewood-college.example',
        wants: 'More admissions, soon',
        source: 'instagram',
        sourceDetail: 'Instagram bio',
        status: 'lost',
        lostReason: 'price',
        owner: 'Kabir Sen',
        nextFollowUp: null,
        notes: ['Second note', 'First note'],
      },
    ]);
    const [header, line] = csv.replace('\uFEFF', '').trim().split('\r\n');
    assert.equal(header, 'Came in,Name,Institution,City,Phone,Email,What they want,Source,Status,Lost reason,Owner,Next follow-up,Last came in,Notes');
    assert.equal(line, "2026-10-02 19:00,'=Rahul,Pinewood College,Guwahati,91 98765 00011,rahul@pinewood-college.example,\"More admissions, soon\",\"Instagram, Instagram bio\",Lost,Price,Kabir Sen,,2026-10-06 17:00,Second note | First note");
  });
});
