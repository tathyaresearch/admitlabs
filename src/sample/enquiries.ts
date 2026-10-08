// Sample Enquiries, AdmitLabs' own leads (spec section 27): the team's tracking links, what came in
// through the website's Talk to us form (one lead came back through an event link), requests from
// dashboards, leads added by hand, and what the team did with each. Northbank, Silverline and
// Loomcraft come in on their own when they sign up for Free (the seed's plans). Requests from a
// dashboard are handled already, so every sample dashboard shows what it showed before.

import type { EnquiryRole } from '../site/enquiry.ts';
import type { LostReason, SocialSource, TeamLeadStatus } from '../enquiries/model.ts';
import { ADMIN_EMAIL, MANAGER_EMAIL, TEAM_EMAIL } from './institutions.ts';

export const SAMPLE_TEAM_LINKS: ReadonlyArray<{ code: string; name: string; source: SocialSource; by: string; on: string }> = [
  { code: 'admitig1', name: 'Instagram bio', source: 'instagram', by: TEAM_EMAIL, on: '2026-09-01' },
  { code: 'eduexpo26', name: 'EduConnect fair, Guwahati', source: 'event', by: ADMIN_EMAIL, on: '2026-09-25' },
];

/** What came in through the website's form, oldest first. `link`: the tracking link it came through. */
export const SAMPLE_TALK_ENQUIRIES: ReadonlyArray<{
  name: string;
  institution: string;
  role: EnquiryRole;
  email: string;
  phone: string;
  program: string | null;
  message: string | null;
  on: string;
  hour: number;
  link?: string;
}> = [
  { name: 'Ankit Sharma', institution: 'Hillview Skills Institute', role: 'marketing', email: 'ankit@hillview-skills.example', phone: '+919900112233', program: 'Data Analytics', message: 'We want our certificate courses to show up when students search in Shillong.', on: '2026-08-20', hour: 12 },
  { name: 'Kavya Iyer', institution: 'Lakeshore Business School', role: 'admissions', email: 'kavya@lakeshore-business.example', phone: '+919845098450', program: 'MBA', message: 'Our MBA applications dropped this year. Can you help?', on: '2026-08-28', hour: 16 },
  { name: 'Sunita Borah', institution: 'Riverside Nursing College', role: 'principal_dean', email: 'sunita@riverside-nursing.example', phone: '+919864012345', program: 'B.Sc Nursing', message: 'Our nursing seats are not filling. We need students from outside Assam.', on: '2026-09-05', hour: 11 },
  { name: 'Priya Nair', institution: 'Coastal Institute of Management', role: 'admissions', email: 'priya@coastal-institute.example', phone: '+919812345670', program: 'MBA', message: 'We need more MBA admissions from Kerala and Karnataka.', on: '2026-09-18', hour: 15 },
  { name: 'Rahul Mehta', institution: 'Pinewood College', role: 'founder_director', email: 'rahul@pinewood-college.example', phone: '+919876500011', program: null, message: 'Saw your post on fee pages. What would you do for us?', on: '2026-10-02', hour: 19, link: 'admitig1' },
  // The same person again, from the fair: it joins her lead.
  { name: 'Sunita Borah', institution: 'Riverside Nursing College', role: 'principal_dean', email: 'sunita@riverside-nursing.example', phone: '+919864012345', program: null, message: 'Met your team at the EduConnect fair. Can we talk this week?', on: '2026-10-06', hour: 17, link: 'eduexpo26' },
];

/** Requests from a dashboard, handled already: the lead they join shows them as coming back. */
export const SAMPLE_DASHBOARD_ASKS: ReadonlyArray<{ kind: 'ask_paid' | 'ask_services'; slug: string; months?: 1 | 3; on: string; handledOn: string }> = [
  { kind: 'ask_paid', slug: 'northbank-college', months: 3, on: '2026-10-05', handledOn: '2026-10-06' },
  { kind: 'ask_services', slug: 'loomcraft-skills', on: '2026-10-07', handledOn: '2026-10-07' },
];

/** Added by hand, from a call or a message. */
export const SAMPLE_HAND_LEADS: ReadonlyArray<{ name: string; institution: string; city: string; phone: string | null; email: string | null; wants: string; source: SocialSource; by: string; on: string }> = [
  {
    name: 'Deepak Gogoi',
    institution: 'Brahmaputra Polytechnic',
    city: 'Dibrugarh',
    phone: '+919435012345',
    email: null,
    wants: 'Referred by Ritu Bora at Brightpath. Wants a content plan for diploma admissions.',
    source: 'referral',
    by: TEAM_EMAIL,
    on: '2026-09-22',
  },
  {
    name: 'Fatima Khan',
    institution: 'Crescent Women’s College',
    city: 'Guwahati',
    phone: null,
    email: 'fatima@crescent-womens.example',
    wants: 'Saw our LinkedIn post on fee pages. Wants an Audit walk-through.',
    source: 'linkedin',
    by: MANAGER_EMAIL,
    on: '2026-10-03',
  },
];

/** What the team did with each lead, matched by email or phone, in date order. */
export const SAMPLE_LEAD_WORK: ReadonlyArray<{
  match: string;
  on: string;
  by: string;
  owner?: string | null;
  status?: TeamLeadStatus;
  lost?: { reason: LostReason; note: string | null };
  followUp?: string | null;
  note?: string;
  /** Won and made a Client: the college it became. */
  madeClient?: string;
}> = [
  { match: 'owner@northbank-college.example', on: '2026-09-14', by: TEAM_EMAIL, owner: TEAM_EMAIL, status: 'contacted', note: 'Showed her how to put the full BBA fees on one page. She will do it herself.' },
  { match: 'ankit@hillview-skills.example', on: '2026-08-21', by: ADMIN_EMAIL, owner: ADMIN_EMAIL, status: 'call_booked' },
  { match: 'ankit@hillview-skills.example', on: '2026-09-10', by: ADMIN_EMAIL, status: 'won', note: 'Signed for 3 months of content. Waiting for them to sign up in Drishti.' },
  { match: 'kavya@lakeshore-business.example', on: '2026-08-29', by: ADMIN_EMAIL, owner: ADMIN_EMAIL, status: 'proposal_sent' },
  { match: 'kavya@lakeshore-business.example', on: '2026-09-15', by: ADMIN_EMAIL, status: 'lost', lost: { reason: 'price', note: 'Wanted a smaller first project. Write again in March.' } },
  { match: 'sunita@riverside-nursing.example', on: '2026-09-06', by: TEAM_EMAIL, owner: MANAGER_EMAIL, status: 'contacted' },
  { match: 'sunita@riverside-nursing.example', on: '2026-10-06', by: MANAGER_EMAIL, status: 'call_booked', followUp: '2026-10-09', note: 'Met her at the fair. Call booked for Thursday at 11.' },
  { match: 'priya@coastal-institute.example', on: '2026-09-19', by: TEAM_EMAIL, owner: TEAM_EMAIL, status: 'contacted' },
  { match: 'priya@coastal-institute.example', on: '2026-09-25', by: TEAM_EMAIL, status: 'proposal_sent', followUp: '2026-10-10', note: 'Sent the 3 month proposal for MBA admissions. She decides with the director.' },
  { match: 'owner@silverline-college.example', on: '2026-08-02', by: ADMIN_EMAIL, owner: ADMIN_EMAIL, status: 'contacted' },
  { match: 'owner@silverline-college.example', on: '2026-09-28', by: ADMIN_EMAIL, status: 'won', note: 'Signed for the full service from October.' },
  // The day Silverline became a Client (SAMPLE_NEW_CLIENTS).
  { match: 'owner@silverline-college.example', on: '2026-10-01', by: ADMIN_EMAIL, madeClient: 'silverline-college' },
  { match: '+919435012345', on: '2026-09-23', by: TEAM_EMAIL, owner: TEAM_EMAIL, status: 'contacted', followUp: '2026-10-12', note: 'Called him. Sending two sample plans next week.' },
  { match: 'fatima@crescent-womens.example', on: '2026-10-03', by: MANAGER_EMAIL, followUp: '2026-10-08' },
  { match: 'owner@loomcraft-skills.example', on: '2026-10-07', by: TEAM_EMAIL, owner: TEAM_EMAIL, status: 'contacted', followUp: '2026-10-14', note: 'Asked about the services from the card. Call to set up for next week.' },
  { match: 'owner@eastgate-university.example', on: '2026-09-25', by: ADMIN_EMAIL, owner: ADMIN_EMAIL, followUp: '2026-10-08' },
];
