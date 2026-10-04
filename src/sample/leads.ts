// Leads for Brightpath Skills Academy, the sample Client (spec 20 and 23): the 4 tracking links
// the AdmitLabs team made in July, and the enquiries students sent through them from July to
// September (10, then 17, then 23). Every name is made up, every email is at mail.example and
// every phone number starts 00000, so none can belong to a real person.

import type { LeadSource } from '../domain/types.ts';

export interface SampleLeadLink {
  slug: string;
  code: string;
  name: string;
  usedOn: LeadSource;
  programKey: string;
  /** India date the team made it. */
  createdOn: string;
}

export interface SampleLead {
  slug: string;
  linkCode: string;
  /** The course the student picked: usually the link's program. */
  programKey: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  /** India date and hour it was sent. */
  sentOn: string;
  hour: number;
}

export const SAMPLE_LEAD_LINKS: readonly SampleLeadLink[] = [
  { slug: 'brightpath-skills', code: 'bp4k7m2q', name: 'Instagram bio', usedOn: 'instagram', programKey: 'digital-marketing', createdOn: '2026-07-01' },
  { slug: 'brightpath-skills', code: 'bp9d3r8w', name: 'Reel: Data Analytics placements', usedOn: 'instagram', programKey: 'data-analytics', createdOn: '2026-07-04' },
  { slug: 'brightpath-skills', code: 'bp2h6t5c', name: 'YouTube: Hotel Management campus tour', usedOn: 'youtube', programKey: 'hotel-management', createdOn: '2026-07-10' },
  { slug: 'brightpath-skills', code: 'bp7f1n4x', name: 'Facebook page', usedOn: 'facebook', programKey: 'digital-marketing', createdOn: '2026-07-15' },
];

/** Who gets the alert email (the admissions email Brightpath added) and how long enquiries are kept. */
export const SAMPLE_LEAD_SETTINGS = [{ slug: 'brightpath-skills', alertEmails: ['hello@brightpath-skills.example'], keepMonths: 12, updatedOn: '2026-07-01' }] as const;

/** Enquiries per link and month: the placements reel brings the most, and more each month. */
const PER_MONTH: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  '2026-07': { bp4k7m2q: 4, bp9d3r8w: 3, bp2h6t5c: 2, bp7f1n4x: 1 },
  '2026-08': { bp4k7m2q: 5, bp9d3r8w: 7, bp2h6t5c: 3, bp7f1n4x: 2 },
  '2026-09': { bp4k7m2q: 6, bp9d3r8w: 11, bp2h6t5c: 4, bp7f1n4x: 2 },
};

const FIRST = [
  'Ankita', 'Bikash', 'Chandana', 'Dipankar', 'Eshita', 'Farhan', 'Gitanjali', 'Himangshu', 'Ishita', 'Jahnavi', 'Kaushik', 'Lakhya', 'Mriganka',
  'Nandini', 'Pallab', 'Priyanka', 'Rituraj', 'Sanjukta', 'Tanmoy', 'Upasana', 'Vikram', 'Yashashree', 'Abhijit', 'Barnali', 'Debojit', 'Kangkana',
] as const;
const LAST = ['Baruah', 'Bora', 'Das', 'Deka', 'Gogoi', 'Hazarika', 'Kalita', 'Medhi', 'Phukan', 'Saikia', 'Sarma', 'Talukdar', 'Choudhury', 'Nath', 'Ahmed', 'Rahman'] as const;
const CITIES = ['Guwahati', 'Guwahati', 'Guwahati', 'Guwahati', 'Guwahati', 'Nagaon', 'Tezpur', 'Jorhat', 'Barpeta', 'Shillong'] as const;
const OTHER_COURSE: Readonly<Record<string, string>> = { 'digital-marketing': 'data-analytics', 'data-analytics': 'digital-marketing', 'hotel-management': 'digital-marketing' };

const pick = <T>(list: readonly T[], at: number): T => list[at % list.length] as T;
const pad = (value: number, size = 2) => String(value).padStart(size, '0');

function daysIn(month: string): number {
  const [year, value] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(year, value, 0)).getUTCDate();
}

/** Every sample enquiry, oldest first, spread over each month from the day its link was made. */
export const SAMPLE_LEADS: readonly SampleLead[] = (() => {
  const leads: SampleLead[] = [];
  let n = 0;
  for (const [month, counts] of Object.entries(PER_MONTH)) {
    for (const link of SAMPLE_LEAD_LINKS) {
      const count = counts[link.code] ?? 0;
      const firstDay = link.createdOn.startsWith(month) ? Number(link.createdOn.slice(8)) + 1 : 1;
      const lastDay = daysIn(month);
      for (let index = 0; index < count; index += 1) {
        n += 1;
        const day = firstDay + Math.floor(((index + 0.5) * (lastDay - firstDay + 1)) / count);
        const first = pick(FIRST, n * 7 + 3);
        const last = pick(LAST, n * 5 + 1);
        leads.push({
          slug: link.slug,
          linkCode: link.code,
          // One in five picks another course on the form.
          programKey: n % 5 === 0 ? (OTHER_COURSE[link.programKey] ?? link.programKey) : link.programKey,
          name: `${first} ${last}`,
          phone: `+9100000${pad(10000 + n * 37, 5)}`,
          email: `${first}.${last}${pad(n)}@mail.example`.toLowerCase(),
          city: pick(CITIES, n * 3),
          sentOn: `${month}-${pad(Math.min(lastDay, day))}`,
          hour: 9 + ((n * 5) % 12),
        });
      }
    }
  }
  return leads.sort((a, b) => a.sentOn.localeCompare(b.sentOn) || a.hour - b.hour);
})();
