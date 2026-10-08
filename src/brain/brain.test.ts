import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { BRAIN_RULES } from '../config/brain.ts';
import { EMPTY_INSTITUTION_DETAILS, EMPTY_PROGRAM_DETAILS, programDetailsToRow, type ProgramDetails } from '../domain/details.ts';
import { askFacts, matchQuestion, questionTags } from './ask.ts';
import { describeItem } from './facts.ts';
import { factInputs, institutionDetailsForm, programDetailsForm, withCurrent } from './form-spec.ts';
import { factSize, readFact } from './forms.ts';
import { CONTACT_MESSAGE, LOGIN_MESSAGE, hasContactDetails, looksLikeLogin } from './guard.ts';
import { changeLines, personName, type ChangeRow } from './history.ts';
import { brainCardLine, brainLine } from './line.ts';
import { SINGLE_KINDS, STEPS, targetSection, type AnyBrainItem, type Brain, type BrainFields, type BrainKind } from './model.ts';
import { parseFees, prefill } from './prefill.ts';
import { brainProgress, brainSlots, readiness, stepBlocked } from './progress.ts';
import { isStale, needsChecking, nextAdmissions, seasonAhead } from './stale.ts';
import { brainWriting, fitIdea } from './writing.ts';

const form = (values: Record<string, string | string[]>) => ({
  get: (name: string) => {
    const value = values[name];
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  },
  all: (name: string) => {
    const value = values[name];
    return Array.isArray(value) ? value : value ? [value] : [];
  },
  has: (name: string) => name in values,
});

let counter = 0;
function item<K extends BrainKind>(kind: K, fields: BrainFields[K], extra: Partial<AnyBrainItem> = {}): AnyBrainItem {
  counter += 1;
  return {
    id: `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`,
    kind,
    fields,
    toConfirm: false,
    source: 'college',
    viaHelp: false,
    sourceUrl: null,
    foundAt: null,
    checkedAt: '2026-10-01T05:00:00.000Z',
    checkedBy: 'u-ritu',
    updatedAt: '2026-10-01T05:00:00.000Z',
    updatedBy: 'u-ritu',
    ...extra,
  } as AnyBrainItem;
}

const PROGRAM: ProgramDetails = {
  ...EMPTY_PROGRAM_DETAILS,
  level: 'ug',
  durationValue: 3,
  durationUnit: 'years',
  feesAmount: 92000,
  feesPeriod: 'year',
  seats: 120,
  eligibility: '12th pass with 45% marks',
  applicationsOpen: '2026-12-01',
  placedPercent: 82,
  averagePackage: 3.6,
};

function brain(items: AnyBrainItem[], extra: Partial<Brain> = {}): Brain {
  return {
    institution: { id: 'i-1', name: 'Silverline College', type: 'college', city: 'Guwahati', state: 'Assam', website: 'https://silverline-college.example', instagram: 'silverlinecollege', youtube: null, facebook: null, linkedin: null, googleMaps: null },
    status: 'onboarding',
    started: { at: '2026-10-03T05:00:00.000Z', by: 'u-kabir' },
    ready: null,
    items,
    details: { ...EMPTY_INSTITUTION_DETAILS, foundedYear: 2009, ugcRecognised: true, campusAddress: 'GS Road, Guwahati' },
    programs: [{ id: 'p-bba', name: 'BBA', details: PROGRAM, push: true }],
    checks: new Map([
      ['about', { at: '2026-10-01T05:00:00.000Z', by: 'u-ritu' }],
      ['program:p-bba:fees', { at: '2026-03-06T05:00:00.000Z', by: 'u-ritu' }],
      ['program:p-bba:dates', { at: '2026-09-20T05:00:00.000Z', by: 'u-ritu' }],
      ['program:p-bba:details', { at: '2026-09-20T05:00:00.000Z', by: 'u-ritu' }],
    ]),
    steps: new Map(),
    ...extra,
  };
}

const complete = () => [
  item('contact', { role: 'main', name: 'Arup Baruah', title: 'Admissions head', phone: '+91 00000 51870', email: 'arup@silverline-college.example', best: 'Phone', approves: null }),
  item('contact', { role: 'approver', name: 'Meera Kalita', title: 'Principal', phone: null, email: null, best: 'WhatsApp', approves: 'Reels and posts' }),
  item('talk', { how: 'WhatsApp for quick questions' }),
  item('goals', { goals: ['Fill every BBA seat'] }),
  item('target', { count: 600, note: null }),
  item('logo', { link: 'https://drive.google.example/logo', file: null }),
  item('colours', { colours: [{ name: 'Navy', hex: '#1F3A5F' }] }),
  item('tone', { tone: 'friendly', line: null }),
  item('avoid', { items: ['Guaranteed jobs'] }),
  item('award', { type: 'award', title: 'Best Hospitality Program', year: 2025, link: null }),
  item('link', { type: 'drive', label: null, url: 'https://drive.google.example/shared', shared: true }),
  item('plan', { month: '2026-10', link: null, status: 'agreed', agreedBy: 'Meera', note: null }),
];

describe('the password guard', () => {
  test('stops a password, an OTP, a login and a link with a password in it', () => {
    for (const text of ['user: brightpath.official, password: Bright@2026', 'pwd = hunter2', 'Passcode is 4455', 'OTP: 123456', 'login: admin', 'Username: college', 'Here are the login details', 'https://name:secret@host.example/x']) {
      assert.ok(looksLikeLogin(text), text);
    }
  });

  test('lets ordinary words through, a PIN code in an address included', () => {
    for (const text of ['Admission portal login page', 'We never ask for passwords', 'PIN code 781024, GS Road', 'Log in to the portal to apply', 'https://apply.college.example/login']) {
      assert.ok(!looksLikeLogin(text), text);
    }
  });

  test('a form with a login in any field is refused, with the reason', () => {
    const read = readFact('link', form({ type: 'other', label: 'Instagram login', url: 'https://instagram.example', note: 'password: Bright@2026' }));
    assert.equal(read.fields, null);
    assert.equal(read.errors.form, LOGIN_MESSAGE);
  });

  test('alumni and reviews never carry a phone number or an email', () => {
    assert.ok(hasContactDetails('Call her on +91 98765 43210'));
    assert.ok(hasContactDetails('priya@mail.example'));
    assert.ok(!hasContactDetails('BBA 2023, now an analyst at a bank'));
    const read = readFact('alumnus', form({ name: 'Priya', line: 'Reach her at priya@mail.example', link: '' }));
    assert.equal(read.errors.form, CONTACT_MESSAGE);
  });

  test('the database runs the same checks (brain_text_ok, brain_contact_free)', () => {
    const sql = readFileSync(new URL('../../supabase/migrations/20261021120100_client_brain.sql', import.meta.url), 'utf8');
    for (const word of ['pass ?words?', 'otp', 'user ?names?', 'credentials', '://[^[:space:]/@:]+:[^[:space:]/@]+@']) assert.ok(sql.includes(word), word);
    assert.ok(sql.includes("p_kind not in ('alumnus', 'review')"));
    // The size the database allows is never below what the forms let through.
    const limit = Number(/char_length\(fields::text\) <= (\d+)/.exec(sql)?.[1]);
    assert.ok(limit >= BRAIN_RULES.factMax, `${limit}`);
    // One of each single kind, in both places.
    const single = /brain_items_single_idx[\s\S]*?where kind in \(([^)]*)\)/.exec(sql)?.[1] ?? '';
    for (const kind of SINGLE_KINDS) assert.ok(single.includes(`'${kind}'`), kind);
  });
});

describe('reading a fact from its form', () => {
  test('a contact keeps its role, with a tidy phone and email', () => {
    const read = readFact('contact', form({ role: 'main', name: '  Arup   Baruah ', title: 'Admissions head', phone: '+91 00000 51870', email: 'ARUP@college.example' }));
    assert.deepEqual(read.fields, { role: 'main', name: 'Arup Baruah', title: 'Admissions head', phone: '+91 00000 51870', email: 'arup@college.example', best: null, approves: null });
  });

  test('says what is missing, field by field', () => {
    const read = readFact('contact', form({ role: 'main', name: '', email: 'not an email' }));
    assert.equal(read.fields, null);
    assert.ok(read.errors.name);
    assert.ok(read.errors.email);
  });

  test('colours need a hex code, kept in capitals with its #', () => {
    assert.deepEqual(readFact('colours', form({ colour_name_1: 'Navy', colour_hex_1: '1f3a5f' })).fields, { colours: [{ name: 'Navy', hex: '#1F3A5F' }] });
    assert.ok(readFact('colours', form({ colour_name_1: 'Navy', colour_hex_1: 'blue' })).errors.colour_hex_1);
  });

  test('lists split on new lines and commas, up to the limit', () => {
    assert.deepEqual(readFact('avoid', form({ items: 'Guaranteed jobs\nComparisons, Stock photos' })).fields, { items: ['Guaranteed jobs', 'Comparisons', 'Stock photos'] });
    assert.ok(readFact('rivals', form({ names: 'a, b, c, d, e, f' })).errors.names);
  });

  test('a date ends after it starts, and a season needs no name', () => {
    assert.deepEqual(readFact('date', form({ type: 'season', from: '2027-01-05', to: '2027-05-31' })).fields, { type: 'season', title: '', from: '2027-01-05', to: '2027-05-31' });
    assert.ok(readFact('date', form({ type: 'fest', title: 'Fest', from: '2026-12-12', to: '2026-12-01' })).errors.to);
    assert.ok(readFact('date', form({ type: 'fest', from: '2026-12-12' })).errors.title);
  });

  test('a link is http or https; a Drive folder says whether it is shared', () => {
    assert.ok(readFact('link', form({ type: 'drive', url: 'javascript:alert(1)' })).errors.url);
    assert.deepEqual(readFact('link', form({ type: 'drive', url: 'drive.google.example/x', shared: 'on' })).fields, { type: 'drive', label: null, url: 'https://drive.google.example/x', shared: true });
  });

  test('a student review needs the student’s agreement', () => {
    assert.ok(readFact('review', form({ quote: 'Great faculty', by: 'BBA student' })).errors.consent);
    assert.ok(readFact('review', form({ quote: 'Great faculty', by: 'BBA student', consent: 'on' })).fields);
  });

  test('every form shows a saved fact back, and reads it again the same', () => {
    const tone = { tone: 'formal', line: 'Calm and clear.' } as const;
    const values = Object.fromEntries(factInputs('tone', tone).map((input) => [input.name, input.value ?? '']));
    assert.deepEqual(readFact('tone', form(values)).fields, tone);
    const contact = { role: 'approver', name: 'Meera Kalita', title: 'Principal', phone: '+91 00000 51801', email: 'meera@college.example', best: 'WhatsApp', approves: 'Reels and posts' } as const;
    const contactValues = Object.fromEntries(factInputs('contact', contact).map((input) => [input.name, input.value ?? '']));
    assert.deepEqual(readFact('contact', form(contactValues)).fields, contact);
  });

  test('a partial form keeps every detail it does not show', () => {
    const sent = form({ fees_amount: '95000', fees_period: 'year' });
    const merged = withCurrent(sent, programDetailsForm(PROGRAM));
    assert.equal(merged.get('fees_amount'), '95000');
    assert.equal(merged.get('seats'), '120');
    assert.equal(merged.get('level'), 'ug');
    assert.equal(withCurrent(form({}), institutionDetailsForm({ ...EMPTY_INSTITUTION_DETAILS, foundedYear: 2009 })).get('founded_year'), '2009');
  });

  test('a fact’s size is what the database checks again', () => {
    assert.ok(factSize({ how: 'x'.repeat(BRAIN_RULES.textMax) }) < BRAIN_RULES.factMax);
  });
});

describe('how complete a Brain is', () => {
  test('each must-have, every program’s fees, basics and dates, and the first content plan', () => {
    const slots = brainSlots(brain(complete()));
    assert.equal(slots.length, 8 + 3 + 4 + 2 + 1 + 1 + 1);
    assert.deepEqual(
      slots.filter((slot) => !slot.done).map((slot) => slot.key),
      [],
    );
    assert.equal(brainProgress(brain(complete())).percent, 100);
  });

  test('optional facts never lower it; a missing one does, rounded down', () => {
    const without = complete().filter((entry) => entry.kind !== 'logo');
    const progress = brainProgress(brain(without));
    assert.equal(progress.missing.map((slot) => slot.key).join(), 'logo');
    assert.equal(progress.percent, Math.floor((19 * 100) / 20));
  });

  test('what Drishti found counts only once confirmed', () => {
    const items = complete().map((entry) => (entry.kind === 'logo' ? { ...entry, toConfirm: true } : entry));
    assert.ok(brainProgress(brain(items)).missing.some((slot) => slot.key === 'logo'));
  });

  test('"Doesn’t apply" counts as done where it may', () => {
    const items = [...complete().filter((entry) => entry.kind !== 'award'), item('skip', { slot: 'awards', reason: 'No awards yet' })];
    const slots = brainSlots(brain(items));
    const awards = slots.find((slot) => slot.key === 'awards');
    assert.ok(awards?.done && awards.skipped);
    // A must-have that may not be skipped stays missing.
    const noLogo = [...complete().filter((entry) => entry.kind !== 'logo'), item('skip', { slot: 'logo', reason: 'None' })];
    assert.ok(!brainSlots(brain(noLogo)).find((slot) => slot.key === 'logo')?.done);
  });

  test('Ready waits for every must-have and the whole checklist', () => {
    const steps = new Map(STEPS.map((step) => [step, { at: '2026-10-08T05:00:00.000Z', by: 'u-kabir' }] as const));
    assert.deepEqual(readiness(brain(complete())), { ready: false, facts: 0, steps: 6 });
    assert.deepEqual(readiness(brain(complete(), { steps })), { ready: true, facts: 0, steps: 0 });
    assert.equal(readiness(brain(complete().slice(1), { steps })).ready, false);
  });

  test('three steps need their fact first', () => {
    assert.ok(stepBlocked('drive_shared', brain([])));
    assert.ok(stepBlocked('approver_confirmed', brain([])));
    assert.ok(stepBlocked('plan_agreed', brain([item('plan', { month: '2026-10', link: null, status: 'draft', agreedBy: null, note: null })])));
    assert.ok(!stepBlocked('brand_kit', brain([])));
    assert.ok(!stepBlocked('plan_agreed', brain(complete())));
  });

  test('a slot or a found fact sits in its section', () => {
    assert.equal(targetSection('program:p-bba:fees'), 'programs');
    assert.equal(targetSection('about:approvals'), 'basics');
    assert.equal(targetSection('logo'), 'brand');
    assert.equal(targetSection('season'), 'calendar');
  });
});

describe('Needs checking', () => {
  const now = new Date('2026-10-08T06:00:00.000Z');

  test('fees and dates after 6 months, everything else after 12', () => {
    assert.ok(isStale('2026-03-06T05:00:00.000Z', 'fees', now));
    assert.ok(!isStale('2026-04-09T05:00:00.000Z', 'fees', now));
    assert.ok(!isStale('2026-03-06T05:00:00.000Z', 'other', now));
    assert.ok(isStale('2025-10-01T05:00:00.000Z', 'other', now));
  });

  test('finds old fees first; notes, scripts and events never go stale', () => {
    const old = '2025-09-01T05:00:00.000Z';
    const items = [
      item('contact', { role: 'main', name: 'Arup', title: null, phone: null, email: null, best: null, approves: null }, { checkedAt: old }),
      item('note', { type: 'note', title: null, body: 'An old note', on: null, link: null }, { checkedAt: old }),
      item('date', { type: 'fest', title: 'Fest', from: '2025-12-01', to: null }, { checkedAt: old }),
    ];
    const stale = needsChecking(brain(items), now);
    assert.deepEqual(
      stale.map((fact) => fact.key),
      ['program:p-bba:fees', `item:${items[0]?.id}`],
    );
    assert.equal(stale[0]?.label, 'BBA fees');
  });

  test('admissions open next, and the weeks before them', () => {
    assert.equal(nextAdmissions(brain([]), now), '2026-12-01');
    assert.equal(seasonAhead(brain([]), now), '2026-12-01');
    assert.equal(seasonAhead(brain([]), new Date('2026-09-01T06:00:00.000Z')), null);
    const season = item('date', { type: 'season', title: '', from: '2026-11-15', to: '2027-01-31' });
    assert.equal(nextAdmissions(brain([season]), now), '2026-11-15');
  });

  test('the Brain in one line, and on Home’s team card', () => {
    assert.equal(brainLine({ status: 'onboarding', percent: 80, stale: 0, season: null }), 'Your Brain is being set up with your AdmitLabs team: 80% complete.');
    assert.equal(brainLine({ status: 'ready', percent: 100, stale: 2, season: '2026-12-01' }), 'Your Brain is Ready. Check 2 facts before admissions open on 1 Dec 2026.');
    assert.equal(brainLine({ status: 'ready', percent: 100, stale: 1, season: null }), 'Your Brain is Ready. 1 fact needs checking.');
    assert.equal(brainCardLine({ status: 'ready', percent: 100, stale: 0, season: null }), 'Ready and up to date.');
  });
});

describe('Ask the brain', () => {
  const asked = brain(complete());
  const facts = askFacts(asked, [{ id: 'n-1', body: 'Meera decides fast on WhatsApp.' }]);

  test('reads what a question is about', () => {
    assert.deepEqual(questionTags('What’s the BBA fee?'), ['fees']);
    assert.ok(questionTags('Who approves reels?').includes('approver'));
    assert.ok(questionTags('When is the next open day?').includes('open_day'));
  });

  test('“What’s the BBA fee?” answers with the fee and where it came from', () => {
    const answer = matchQuestion('What’s the BBA fee?', facts);
    assert.equal(answer.facts[0]?.answer, 'BBA fees: ₹92,000 a year.');
    assert.equal(answer.facts[0]?.where, 'Programs, BBA, Fees');
    assert.equal(answer.facts[0]?.stamp, 'program:p-bba:fees');
  });

  test('“Who approves reels?” answers with the person who approves', () => {
    const answer = matchQuestion('Who approves reels?', facts);
    assert.equal(answer.facts[0]?.answer, 'Who approves content: Meera Kalita, Principal. Reels and posts.');
    assert.equal(answer.facts[0]?.section, 'basics');
  });

  test('says where to add what it does not know', () => {
    assert.deepEqual(matchQuestion('When is the next open day?', facts), { facts: [], addIn: 'calendar' });
    assert.deepEqual(matchQuestion('Hello there', facts), { facts: [], addIn: null });
  });

  test('Team only notes answer the team alone', () => {
    assert.ok(facts.some((fact) => fact.teamOnly));
    assert.ok(!askFacts(asked).some((fact) => fact.teamOnly));
  });

  test('never answers from what Drishti found and nobody confirmed', () => {
    const found = item('tagline', { text: 'Unconfirmed tagline' }, { toConfirm: true });
    assert.ok(!askFacts(brain([found])).some((fact) => fact.answer.includes('Unconfirmed')));
  });
});

describe('Start onboarding’s pre-fill', () => {
  const input = {
    programs: [{ id: 'p-bba', name: 'BBA', details: EMPTY_PROGRAM_DETAILS }],
    details: EMPTY_INSTITUTION_DETAILS,
    knownUrls: new Set<string>(['https://shiksha.example/known']),
    signals: [
      { checkKey: 'fees_shown' as const, programId: 'p-bba', value: { disclosure: 'full', amountText: '₹1,20,000 a year, all fees listed', pageUrl: 'https://silverline-college.example/bba/fees' }, sourceUrl: 'https://silverline-college.example/bba', fetchedAt: '2026-10-01T05:00:00.000Z' },
      { checkKey: 'program_page' as const, programId: 'p-bba', value: { ownPage: true, onCombinedPage: false, wordCount: 900, pageUrl: 'https://silverline-college.example/programs/bba' }, sourceUrl: 'https://silverline-college.example', fetchedAt: '2026-10-01T05:00:00.000Z' },
      { checkKey: 'placement_proof' as const, programId: 'p-bba', value: { found: true, hasNumbers: true, hasCompanies: true, year: 2026, updatedDaysAgo: 30, vagueClaimsOnly: false }, sourceUrl: 'https://silverline-college.example/placements', fetchedAt: '2026-10-01T05:00:00.000Z' },
      { checkKey: 'approvals' as const, programId: null, value: { source: 'official', recognition: 'statutory', held: ['UGC', 'NAAC', 'AICTE'] }, sourceUrl: 'https://official-data.example/records/silverline', fetchedAt: '2026-10-01T05:00:00.000Z' },
    ],
    findings: [
      { place: 'other' as const, kind: 'listing', sourceName: 'shiksha.example', sourceUrl: 'https://shiksha.example/silverline', checkedAt: '2026-10-01T05:00:00.000Z' },
      { place: 'other' as const, kind: 'listing', sourceName: 'shiksha.example', sourceUrl: 'https://shiksha.example/known', checkedAt: '2026-10-01T05:00:00.000Z' },
      { place: 'other' as const, kind: 'news', sourceName: 'news.example', sourceUrl: 'https://news.example/x', checkedAt: '2026-10-01T05:00:00.000Z' },
    ],
  };

  test('reads one exact fee, never a range', () => {
    assert.deepEqual(parseFees('₹1,20,000 a year, all fees listed'), { amount: 120000, period: 'year' });
    assert.deepEqual(parseFees('₹85,000 for the full course'), { amount: 85000, period: 'total' });
    assert.equal(parseFees('₹40,000 to ₹90,000 a year'), null);
    assert.equal(parseFees('Contact us for fees'), null);
  });

  test('suggests fees, the page, a placements list, approvals and new listings, each with where and when', () => {
    const found = prefill(input);
    assert.deepEqual(
      found.map((entry) => `${entry.kind}:${(entry.fields as { target?: string }).target ?? (entry.fields as { url?: string; link?: string }).url ?? (entry.fields as { link?: string }).link}`),
      [
        'found:program:p-bba:fees',
        'found:program:p-bba:page',
        'placement_list:https://silverline-college.example/placements',
        'found:about:approvals',
        'link:https://shiksha.example/silverline',
      ],
    );
    const fees = found[0]?.fields as BrainFields['found'];
    assert.equal(fees.value, '₹1,20,000 a year');
    assert.equal(fees.feesAmount, 120000);
    assert.equal(found[0]?.sourceUrl, 'https://silverline-college.example/bba/fees');
    const approvals = found[3]?.fields as BrainFields['found'];
    assert.deepEqual(approvals.approvals, { ugc: true, aicte: true, naac: true, other: [] });
  });

  test('suggests nothing the details have already', () => {
    const found = prefill({ ...input, programs: [{ id: 'p-bba', name: 'BBA', details: { ...EMPTY_PROGRAM_DETAILS, feesAmount: 92000, feesPeriod: 'year' } }], details: { ...EMPTY_INSTITUTION_DETAILS, ugcRecognised: true } });
    assert.ok(!found.some((entry) => (entry.fields as { target?: string }).target === 'program:p-bba:fees'));
    assert.ok(!found.some((entry) => (entry.fields as { target?: string }).target === 'about:approvals'));
  });
});

describe('History in words', () => {
  const people = new Map([
    ['u-ritu', { name: 'Ritu Bora', email: 'ritu@college.example', team: false }],
    ['u-kabir', { name: 'Kabir Sen', email: 'kabir@admitlabs.example', team: true }],
    ['u-new', { name: null, email: 'new@college.example', team: false }],
  ]);
  const context = { people, programs: [{ id: 'p-da', name: 'Data Analytics' }], institutionType: 'skilling' as const };
  const row = (extra: Partial<ChangeRow>): ChangeRow => ({ id: 'c-1', at: '2026-09-20T06:30:00.000Z', by: 'u-ritu', what: 'changed', target: 'about', kind: null, field: null, before: null, after: null, teamOnly: false, ...extra });

  test('a name, or the email when there is none, and the team marked', () => {
    assert.equal(personName(people.get('u-ritu')), 'Ritu Bora');
    assert.equal(personName(people.get('u-kabir')), 'Kabir Sen, AdmitLabs');
    assert.equal(personName(people.get('u-new')), 'new@college.example');
    assert.equal(personName(undefined), 'Drishti');
  });

  test('a program’s fees, before and after', () => {
    const before = programDetailsToRow({ ...EMPTY_PROGRAM_DETAILS, feesAmount: 55000, feesPeriod: 'total' });
    const after = programDetailsToRow({ ...EMPTY_PROGRAM_DETAILS, feesAmount: 60000, feesPeriod: 'total' });
    const [line] = changeLines(row({ target: 'program:p-da', kind: 'details', before, after }), context);
    assert.equal(line?.text, 'Data Analytics fees: ₹55,000 in total to ₹60,000 in total');
    assert.equal(line?.who, 'Ritu Bora');
    assert.equal(line?.section, 'programs');
  });

  test('a fact added, changed, found and taken out', () => {
    const tagline = (text: string) => ({ text });
    assert.equal(changeLines(row({ what: 'added', target: 'item:x', kind: 'tagline', after: tagline('Skills that get you hired.') }), context)[0]?.text, 'Added the tagline: Skills that get you hired.');
    assert.equal(changeLines(row({ what: 'changed', target: 'item:x', kind: 'tagline', before: tagline('Old'), after: tagline('New') }), context)[0]?.text, 'Changed the tagline: Old to New');
    assert.equal(changeLines(row({ what: 'not_right', by: 'u-kabir', target: 'item:x', kind: 'link', before: { type: 'other', label: 'citydirectory.example', url: 'https://citydirectory.example/x', shared: false } }), context)[0]?.text, 'Took out a link as not right: citydirectory.example');
    assert.equal(changeLines(row({ what: 'found', by: null, target: 'item:x', kind: 'placement_list', after: { programId: 'p-da', year: 2026, link: 'https://x.example/list' } }), context)[0]?.who, 'Drishti');
  });

  test('onboarding, the checklist and Ready', () => {
    assert.equal(changeLines(row({ what: 'ready', target: 'brain', by: 'u-kabir' }), context)[0]?.text, 'Marked the Brain Ready');
    assert.equal(changeLines(row({ what: 'step_done', target: 'step:drive_shared', by: 'u-kabir' }), context)[0]?.text, 'Ticked: Drive folder shared');
  });

  test('a program’s first details are one line, its name as it is', () => {
    const after = programDetailsToRow({ ...EMPTY_PROGRAM_DETAILS, feesAmount: 85000, feesPeriod: 'total' });
    assert.equal(changeLines(row({ what: 'added', target: 'program:p-da', kind: 'details', before: null, after }), context)[0]?.text, 'Added the details for Data Analytics');
    const before = programDetailsToRow({ ...EMPTY_PROGRAM_DETAILS, feesAmount: 85000, feesPeriod: 'total' });
    const seats = programDetailsToRow({ ...EMPTY_PROGRAM_DETAILS, feesAmount: 85000, feesPeriod: 'total', seats: 35 });
    assert.equal(changeLines(row({ target: 'program:p-da', kind: 'details', before, after: seats }), context)[0]?.text, 'Added Data Analytics seats: 35');
  });

  test('a check without a change says still right', () => {
    assert.equal(changeLines(row({ what: 'checked', target: 'program:p-da', field: 'fees' }), context)[0]?.text, 'Still right: Data Analytics fees');
  });
});

describe('the brand voice in what Drishti writes', () => {
  const writing = brainWriting(
    [
      { kind: 'tone', fields: { tone: 'formal', line: null }, toConfirm: false },
      { kind: 'avoid', fields: { items: ['guaranteed'] }, toConfirm: false },
      { kind: 'tagline', fields: { text: 'Learn here. Lead anywhere.' }, toConfirm: false },
      { kind: 'contact', fields: { role: 'main', name: 'Arup', title: null, phone: null, email: 'arup@college.example', best: null, approves: null }, toConfirm: false },
      { kind: 'link', fields: { type: 'portal', label: null, url: 'https://apply.college.example', shared: false }, toConfirm: false },
      { kind: 'tagline', fields: { text: 'Never confirmed' }, toConfirm: true },
    ],
    [{ name: 'BBA', details: PROGRAM }],
    '2026-10-08',
  );

  test('reads the voice and the facts a ready fix fills in', () => {
    assert.equal(writing.tagline, 'Learn here. Lead anywhere.');
    assert.equal(writing.tone, 'formal');
    assert.equal(writing.contactEmail, 'arup@college.example');
    assert.equal(writing.portal, 'https://apply.college.example');
    assert.equal(writing.admissionsOpen, '2026-12-01');
    assert.equal(writing.programs.get('BBA')?.fees, '₹92,000 a year');
  });

  test('fits an idea: the fee for a fee question, nothing it avoids, a formal hook', () => {
    const fitted = fitIdea({ hook: 'Fees, finally explained!', points: ['What the fee covers', 'Guaranteed placement'], programName: 'BBA', topic: 'fees' }, writing);
    assert.equal(fitted.hook, 'Fees, finally explained.');
    assert.deepEqual(fitted.points, ['What the fee covers', 'Say the fee as it is: ₹92,000 a year.']);
    assert.equal(fitted.fact, 'Say the fee as it is: ₹92,000 a year.');
  });

  test('a hook with an avoided word is rewritten; the tagline closes ideas without a fact', () => {
    const fitted = fitIdea({ hook: 'Guaranteed jobs after BBA', points: ['a', 'b', 'c', 'd'], programName: 'BBA', topic: 'hostel' }, writing);
    assert.equal(fitted.hook, 'A straight answer about BBA, from the people who teach it.');
    assert.equal(fitted.points.length, 4);
    assert.equal(fitted.points[3], 'Close with your tagline: “Learn here. Lead anywhere.”');
  });
});

describe('a fact in words', () => {
  test('a colour keeps its name and hex; a Drive folder says whether it is shared', () => {
    assert.deepEqual(describeItem(item('colours', { colours: [{ name: 'Navy', hex: '#1F3A5F' }] })).swatches, [{ name: 'Navy', hex: '#1F3A5F' }]);
    assert.deepEqual(describeItem(item('link', { type: 'drive', label: null, url: 'https://drive.google.example/x', shared: false })).lines, [`Not shared with ${BRAIN_RULES.driveShareEmail} yet`]);
  });
});

describe('where the rest of Drishti reads the Brain', () => {
  test('a Client’s monthly summary keeps its Brain line; an older one without it still reads', async () => {
    const { parseSummary } = await import('../report/summary.ts');
    const base = { month: '2026-09', words: [], lines: { words: 'x', things: [], move: 'y', enquiries: null }, things: [] };
    assert.equal(parseSummary({ ...base, brain: 'Your Brain is Ready and up to date.' })?.brain, 'Your Brain is Ready and up to date.');
    assert.equal(parseSummary(base)?.brain, undefined);
  });

  test('an idea picked for a Client keeps the voice it was fitted to', async () => {
    const { parsePickedIdea } = await import('../demand/picks.ts');
    const idea = { title: 'T', text: 'Text', programName: 'BBA', programKey: 'bba', sourceUrl: 'https://quora.example/q', voice: { tone: 'formal', fact: 'Say the fee as it is: ₹92,000 a year.' } };
    assert.deepEqual(parsePickedIdea(idea)?.voice, { tone: 'formal', fact: 'Say the fee as it is: ₹92,000 a year.' });
    assert.equal(parsePickedIdea({ ...idea, voice: undefined })?.voice, undefined);
  });

  test('"Your Brain is ready" has its own filter on Notifications', async () => {
    const { alertFilter, alertLinkText } = await import('../domain/alert-kinds.ts');
    assert.equal(alertFilter('brain_ready'), 'brain');
    assert.equal(alertLinkText('brain_ready', '/brain'), 'See your Brain');
  });
});

describe('History of what Drishti found', () => {
  test('says the outcome and what Drishti had said', () => {
    const context = { people: new Map([['u-kabir', { name: 'Kabir Sen', email: null, team: true }]]), programs: [], institutionType: 'college' as const };
    const fields = { target: 'program:p:fees', label: 'B.Com fees', value: '₹1,80,000 a year', feesAmount: 180000, feesPeriod: 'year', pageUrl: null, approvals: null };
    const row = (what: ChangeRow['what']): ChangeRow => ({ id: 'c', at: '2026-10-08T06:00:00.000Z', by: 'u-kabir', what, target: 'item:x', kind: 'found', field: null, before: fields, after: null, teamOnly: false });
    assert.equal(changeLines(row('corrected'), context)[0]?.text, 'Corrected what Drishti found: B.Com fees (it said ₹1,80,000 a year)');
    assert.equal(changeLines(row('confirmed'), context)[0]?.text, 'Confirmed what Drishti found: B.Com fees, ₹1,80,000 a year');
    assert.equal(changeLines(row('not_right'), context)[0]?.text, 'Took out what Drishti found: B.Com fees, ₹1,80,000 a year');
  });
});
