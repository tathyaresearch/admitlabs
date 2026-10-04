import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { LEAD_RULES } from '../config/leads.ts';
import { hasDashes } from '../domain/copy.ts';
import { leadAlertEmail } from './alert.ts';
import { csvCell, leadsCsv } from './csv.ts';
import { contactKey, indianPhone, parseLead } from './form.ts';
import { byLink, leadsSummary, monthWords, soFarWords, type LinkCount } from './summary.ts';
import { consentLine, thanksLine } from './text.ts';
import { readStart, signStart, tooQuick } from './token.ts';

const MIGRATION = readFileSync(new URL('../../supabase/migrations/20261016120000_leads.sql', import.meta.url), 'utf8');

describe('the enquiry form (spec section 23)', () => {
  const programs = ['p-bba', 'p-mba'];

  test('a sound enquiry, tidied: an Indian number gets +91, the email is lower case, email and city may be left out', () => {
    assert.deepEqual(parseLead({ name: '  Ankita   Baruah ', phone: '98765 43210', email: ' Ankita@Mail.example ', city: ' Guwahati ', program: 'p-mba' }, programs), {
      ok: true,
      lead: { name: 'Ankita Baruah', phone: '+919876543210', email: 'ankita@mail.example', city: 'Guwahati', programId: 'p-mba' },
    });
    assert.deepEqual(parseLead({ name: 'Bikash Bora', phone: '+91 98765-43210', email: '', city: '', program: 'p-bba' }, programs), {
      ok: true,
      lead: { name: 'Bikash Bora', phone: '+919876543210', email: null, city: null, programId: 'p-bba' },
    });
  });

  test('says what is wrong, field by field, in plain words', () => {
    const parsed = parseLead({ name: 'A', phone: '12345', email: 'not an email', city: 'X', program: 'p-bca' }, programs);
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.deepEqual(Object.keys(parsed.errors).sort(), ['city', 'email', 'name', 'phone', 'program']);
    for (const message of Object.values(parsed.errors)) assert.equal(hasDashes(message ?? ''), false, message);
    assert.equal(parseLead({ name: 'Bikash Bora', phone: '', program: 'p-bba' }, programs).ok, false, 'a phone number is needed');
  });

  test('phone numbers as stored', () => {
    assert.equal(indianPhone('98765 43210'), '+919876543210');
    assert.equal(indianPhone('098765 43210'), '+919876543210');
    assert.equal(indianPhone('91 98765 43210'), '+919876543210');
    assert.equal(indianPhone('+91 00000 10037'), '+910000010037', 'a number already with its country code stays');
    assert.equal(indianPhone('12345'), null);
  });

  test('the owner finds a student by phone number or email', () => {
    assert.equal(contactKey(' Ankita@Mail.example '), 'ankita@mail.example');
    assert.equal(contactKey('98765 43210'), '+919876543210');
    assert.equal(contactKey('hello'), null);
  });

  test('the consent line and the thanks, in the college’s name; the database keeps the same consent line', () => {
    assert.equal(consentLine('Brightpath Skills Academy'), 'Your details go to Brightpath Skills Academy so they can contact you about admission.');
    assert.equal(thanksLine('Brightpath Skills Academy'), 'Thanks. Brightpath Skills Academy will contact you soon.');
    const sql = /'(Your details go to )' \|\| v_college \|\| '( so they can contact you about admission\.)'/.exec(MIGRATION);
    assert.ok(sql, 'submit_lead writes the consent line');
    assert.equal(`${sql?.[1]}X${sql?.[2]}`, consentLine('X'));
  });

  test('the database checks the same limits (submit_lead)', () => {
    const hourly = /l\.link_id = v_link\.id and l\.created_at > now\(\) - interval '1 hour'\) >= (\d+)/.exec(MIGRATION)?.[1];
    assert.equal(Number(hourly), LEAD_RULES.perLinkPerHour);
    const daily = /l\.created_at >= v_day and \(l\.phone = v_phone or \(v_email is not null and l\.email = v_email\)\)\s*\) >= (\d+)/.exec(MIGRATION)?.[1];
    assert.equal(Number(daily), LEAD_RULES.perContactPerDay);
    assert.ok(MIGRATION.includes('p_keep_months not in (6, 12, 24)'));
    assert.deepEqual([...LEAD_RULES.keepMonths], [6, 12, 24]);
    assert.ok(MIGRATION.includes(`s.institution_id = l.institution_id), ${LEAD_RULES.keepMonthsDefault})`), 'the daily deletion keeps 12 months when none was chosen');
  });
});

describe('the form’s start time, signed', () => {
  test('only the server’s own token counts, and a quick send is turned away', () => {
    const token = signStart(1_790_000_000_000, 'secret');
    assert.equal(readStart(token, 'secret'), 1_790_000_000_000);
    assert.equal(readStart(token, 'another'), null);
    assert.equal(readStart('1790000000000.forged', 'secret'), null);
    assert.equal(readStart('nonsense', 'secret'), null);
    assert.equal(tooQuick(1_000_000, 1_002_000, 3), true, '2 seconds');
    assert.equal(tooQuick(1_000_000, 1_003_500, 3), false, '3.5 seconds');
    assert.equal(tooQuick(null, 1_003_500, 3), true, 'no token');
    assert.equal(tooQuick(2_000_000, 1_000_000, 3), true, 'from the future');
  });
});

const link = (name: string, counts: Partial<LinkCount>): LinkCount => ({
  id: name,
  code: name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8),
  name,
  usedOn: 'instagram',
  programName: 'BBA',
  createdAt: '2026-07-01T04:30:00.000Z',
  archivedAt: null,
  thisMonth: 0,
  lastMonthToDate: 0,
  lastMonth: 0,
  monthBefore: 0,
  total: 0,
  ...counts,
});

describe('what the Leads page says at the top', () => {
  const links = [
    link('Instagram bio', { thisMonth: 2, lastMonthToDate: 1, lastMonth: 6, monthBefore: 5, total: 15 }),
    link('Reel: Data Analytics placements', { thisMonth: 3, lastMonthToDate: 2, lastMonth: 11, monthBefore: 7, total: 21 }),
    link('Facebook page', { archivedAt: '2026-09-01T00:00:00.000Z', lastMonth: 2, monthBefore: 2, total: 5 }),
  ];

  test('this month against last month to the same day, last month in all, and the link that brought the most', () => {
    const summary = leadsSummary(links);
    assert.deepEqual(
      { thisMonth: summary.thisMonth, lastMonthToDate: summary.lastMonthToDate, lastMonth: summary.lastMonth, monthBefore: summary.monthBefore, total: summary.total },
      { thisMonth: 5, lastMonthToDate: 3, lastMonth: 19, monthBefore: 14, total: 41 },
    );
    assert.equal(summary.top?.link.name, 'Reel: Data Analytics placements');
    assert.equal(summary.top?.month, 'this');
  });

  test('with nothing yet this month, the link that brought the most last month; with nothing at all, none', () => {
    const quiet = links.map((entry) => ({ ...entry, thisMonth: 0 }));
    assert.deepEqual(leadsSummary(quiet).top && { name: leadsSummary(quiet).top?.link.name, count: leadsSummary(quiet).top?.count, month: leadsSummary(quiet).top?.month }, {
      name: 'Reel: Data Analytics placements',
      count: 11,
      month: 'last',
    });
    assert.equal(leadsSummary([link('New link', {})]).top, null);
  });

  test('links by what they brought this month, archived ones last', () => {
    assert.deepEqual(
      byLink(links).map((entry) => entry.name),
      ['Reel: Data Analytics placements', 'Instagram bio', 'Facebook page'],
    );
  });

  test('in words: up when up, plainly what there was when behind, never a failure', () => {
    assert.equal(soFarWords(5, 3, '2026-09'), '2 more than by this day in September');
    assert.equal(soFarWords(3, 3, '2026-09'), 'The same as by this day in September');
    assert.equal(soFarWords(0, 3, '2026-09'), 'By this day in September there were 3');
    assert.equal(soFarWords(0, 1, '2026-09'), 'By this day in September there was 1');
    assert.equal(monthWords(23, 17, '2026-08'), '6 more than August');
    assert.equal(monthWords(17, 17, '2026-08'), 'The same as August');
    assert.equal(monthWords(12, 17, '2026-08'), 'August had 17');
  });
});

describe('Download CSV', () => {
  test('a header and one row per enquiry, in India time, with a BOM and Windows line ends', () => {
    const csv = leadsCsv([
      { sentAt: '2026-09-28T08:35:00.000Z', name: 'Ankita Baruah', phone: '+919876543210', email: 'ankita@mail.example', city: 'Guwahati', course: 'Data Analytics', link: 'Reel: Data Analytics placements', usedOn: 'instagram' },
      { sentAt: '2026-09-27T05:00:00.000Z', name: 'Das, Bikash', phone: '+919876543211', email: null, city: null, course: null, link: null, usedOn: null },
    ]);
    assert.ok(csv.startsWith('﻿Sent,Name,Phone,Email,City,Course,Link,Used on\r\n'));
    const [, first, second] = csv.slice(1).split('\r\n');
    assert.equal(first, "2026-09-28 14:05,Ankita Baruah,'+919876543210,ankita@mail.example,Guwahati,Data Analytics,Reel: Data Analytics placements,Instagram");
    assert.equal(second, `2026-09-27 10:30,"Das, Bikash",'+919876543211,,,,,`);
  });

  test('a cell that starts like a formula can never run as one', () => {
    assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
    assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)");
    assert.equal(csvCell('-2+3'), "'-2+3");
    assert.equal(csvCell('Plain name'), 'Plain name');
    assert.equal(csvCell(null), '');
  });
});

describe('the email for each new enquiry', () => {
  const email = leadAlertEmail(
    {
      college: 'Brightpath Skills Academy',
      name: 'Ankita <b>Baruah</b>',
      phone: '+919876543210',
      email: 'ankita@mail.example',
      city: 'Guwahati',
      course: 'Data Analytics',
      link: { name: 'Reel: Data Analytics placements', usedOn: 'instagram' },
      sentAt: '2026-09-28T08:35:00.000Z',
      leadsUrl: 'http://localhost:3000/leads',
    },
    ['hello@brightpath-skills.example'],
  );

  test('who asked, about what, how to reach them and which link brought them', () => {
    assert.equal(email.kind, 'lead_alert');
    assert.deepEqual(email.to, ['hello@brightpath-skills.example']);
    assert.equal(email.subject, 'New enquiry: Ankita <b>Baruah</b>, Data Analytics');
    for (const line of [
      'New enquiry for Brightpath Skills Academy',
      'Phone: +91 98765 43210',
      'Email: ankita@mail.example',
      'City: Guwahati',
      'From: Reel: Data Analytics placements (Instagram)',
      'Sent: 28 Sep 2026, 2:05 pm',
      'They agreed to be contacted by Brightpath Skills Academy about admission.',
      'See every enquiry: http://localhost:3000/leads',
    ]) {
      assert.ok(email.text.includes(line), line);
    }
  });

  test('a name typed into the form is shown as text, never run as HTML; no dashes', () => {
    assert.ok(email.html.includes('Ankita &lt;b&gt;Baruah&lt;/b&gt; asked about Data Analytics.'));
    assert.ok(!email.html.includes('<b>Baruah</b>'));
    assert.equal(hasDashes(email.text), false);
  });
});
