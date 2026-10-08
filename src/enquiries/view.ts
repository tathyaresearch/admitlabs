// The Enquiries screens' rules (spec section 27): the list's filters and their address, when a
// follow-up is due, a lead's History in words, and the CSV file. Pure.

import { istParts, istTime } from '../domain/dates.ts';
import { formatDate } from '../domain/format.ts';
import { csvCell, csvPhone } from '../leads/csv.ts';
import {
  LOST_REASON_LABELS,
  sourceLine,
  TEAM_LEAD_SOURCE_LABELS,
  TEAM_LEAD_SOURCES,
  TEAM_LEAD_STATUSES,
  TEAM_LEAD_STATUS_LABELS,
  type LostReason,
  type TeamLeadSource,
  type TeamLeadStatus,
} from './model.ts';

/** The list's views: the open ones (default), one status, or every lead. */
export const LEAD_VIEWS = ['open', ...TEAM_LEAD_STATUSES, 'all'] as const;
export type LeadView = (typeof LEAD_VIEWS)[number];

export const LEAD_VIEW_LABELS: Readonly<Record<LeadView, string>> = { open: 'Open', ...TEAM_LEAD_STATUS_LABELS, all: 'All' };

export interface LeadFilters {
  view: LeadView;
  source: TeamLeadSource | null;
  /** 'me', 'none' (nobody yet), or someone on the team. */
  owner: string | null;
  /** Only those with a follow-up today or before. */
  due: boolean;
  q: string;
}

export const NO_LEAD_FILTERS: LeadFilters = { view: 'open', source: null, owner: null, due: false, q: '' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';

export function parseLeadFilters(query: Record<string, string | string[] | undefined>): LeadFilters {
  const view = one(query.view);
  const source = one(query.source);
  const owner = one(query.owner).toLowerCase();
  return {
    view: (LEAD_VIEWS as readonly string[]).includes(view) ? (view as LeadView) : 'open',
    source: (TEAM_LEAD_SOURCES as readonly string[]).includes(source) ? (source as TeamLeadSource) : null,
    owner: owner === 'me' || owner === 'none' || UUID.test(owner) ? owner : null,
    due: one(query.due) === '1',
    q: one(query.q).trim().slice(0, 80),
  };
}

/** The list's address for these filters, with the defaults left out: "?view=won&source=instagram". */
export function leadFiltersQuery(filters: LeadFilters, changes: Partial<LeadFilters> = {}): string {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (next.view !== 'open') params.set('view', next.view);
  if (next.source) params.set('source', next.source);
  if (next.owner) params.set('owner', next.owner);
  if (next.due) params.set('due', '1');
  if (next.q) params.set('q', next.q);
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function hasLeadFilters(filters: LeadFilters): boolean {
  return Boolean(filters.source || filters.owner || filters.due || filters.q);
}

/** The statuses a view shows. */
export function viewStatuses(view: LeadView): readonly TeamLeadStatus[] {
  if (view === 'all') return TEAM_LEAD_STATUSES;
  if (view === 'open') return ['new', 'contacted', 'call_booked', 'proposal_sent'];
  return [view];
}

/** Today in India, as YYYY-MM-DD: when a follow-up is due. */
export function indiaToday(now: Date): string {
  const { year, month, day } = istParts(now);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** A follow-up: past its day, today, or later. Null when there is none, or the lead is closed. */
export function followUpState(date: string | null, status: TeamLeadStatus, today: string): 'overdue' | 'today' | 'later' | null {
  if (!date || status === 'won' || status === 'lost') return null;
  if (date < today) return 'overdue';
  return date === today ? 'today' : 'later';
}

export function followUpWords(date: string | null, status: TeamLeadStatus, today: string): string {
  const state = followUpState(date, status, today);
  if (!date || !state) return 'None';
  const day = formatDate(`${date}T06:30:00Z`);
  return state === 'overdue' ? `${day}, overdue` : state === 'today' ? 'Today' : day;
}

/** One line of a lead's History. `name` turns a person's id into their name (or email). */
export interface ActivityRow {
  id: string;
  at: string;
  by: string | null;
  kind: 'created' | 'came_back' | 'note' | 'status' | 'owner' | 'follow_up' | 'edited' | 'linked' | 'made_client';
  body: string | null;
  data: Record<string, unknown>;
}

const FIELD_WORDS: Readonly<Record<string, string>> = { name: 'name', institution: 'institution', city: 'city', phone: 'phone', email: 'email', wants: 'what they want' };

export function activityLine(row: ActivityRow, name: (userId: string | null) => string, institutionName: (id: string | null) => string | null): string {
  const data = row.data;
  const str = (key: string) => (typeof data[key] === 'string' ? (data[key] as string) : null);
  switch (row.kind) {
    case 'created': {
      const source = str('source') as TeamLeadSource | null;
      return data.by_hand ? `Added by hand${source ? `, from ${TEAM_LEAD_SOURCE_LABELS[source]}` : ''}` : `Came in through ${source ? TEAM_LEAD_SOURCE_LABELS[source] : 'the website'}`;
    }
    case 'came_back': {
      const source = str('source') as TeamLeadSource | null;
      return data.by_hand ? `Came back: added by hand${source ? `, from ${TEAM_LEAD_SOURCE_LABELS[source]}` : ''}` : `Came back through ${source ? TEAM_LEAD_SOURCE_LABELS[source] : 'the website'}`;
    }
    case 'note':
      return row.body ?? '';
    case 'status': {
      const to = str('to') as TeamLeadStatus | null;
      const reason = str('reason') as LostReason | null;
      const note = str('note');
      if (!to) return 'Status changed';
      const was = str('was_reason') as LostReason | null;
      if (to === 'lost') return `Lost: ${reason ? LOST_REASON_LABELS[reason] : 'no reason'}${note ? `. ${note}` : ''}`;
      // A Lost lead that came back: New again, and what it had been lost for.
      if (str('from') === 'lost' && was) return `Status: ${TEAM_LEAD_STATUS_LABELS[to]} again. It had been Lost: ${LOST_REASON_LABELS[was]}`;
      return `Status: ${TEAM_LEAD_STATUS_LABELS[to]}`;
    }
    case 'owner': {
      const to = str('to');
      return to ? `Owner: ${name(to)}` : 'Owner taken off: nobody owns it now';
    }
    case 'follow_up': {
      const to = str('to');
      return to ? `Next follow-up: ${formatDate(`${to}T06:30:00Z`)}` : 'Follow-up cleared';
    }
    case 'edited': {
      const fields = Array.isArray(data.fields) ? (data.fields as string[]).map((field) => FIELD_WORDS[field] ?? field) : [];
      return fields.length ? `Changed the ${fields.length > 1 ? `${fields.slice(0, -1).join(', ')} and ${fields[fields.length - 1]}` : fields[0]}` : 'Changed the details';
    }
    case 'linked': {
      const to = institutionName(str('to'));
      return to ? `Linked to ${to} in Drishti` : 'Link to a college in Drishti taken off';
    }
    case 'made_client': {
      const to = institutionName(str('institution_id'));
      return to ? `Made a Client: ${to}. Onboarding started` : 'Made a Client. Onboarding started';
    }
  }
}

// CSV ---------------------------------------------------------------------------------------------------

export interface LeadCsvRow {
  createdAt: string;
  lastInAt: string;
  name: string | null;
  institution: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  wants: string | null;
  source: TeamLeadSource;
  sourceDetail: string | null;
  status: TeamLeadStatus;
  lostReason: LostReason | null;
  owner: string | null;
  nextFollowUp: string | null;
  /** Newest first. */
  notes: readonly string[];
}

const HEADER = ['Came in', 'Name', 'Institution', 'City', 'Phone', 'Email', 'What they want', 'Source', 'Status', 'Lost reason', 'Owner', 'Next follow-up', 'Last came in', 'Notes'];
const pad = (value: number) => String(value).padStart(2, '0');

/** "2026-09-28 14:05", in India time: sorts as text, reads as a date. */
function stamp(value: string): string {
  const at = new Date(value);
  const { year, month, day } = istParts(at);
  const { hour, minute } = istTime(at);
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`;
}

/** The leads as a CSV file, phones as "91 98765 43210" (a spreadsheet keeps that as text). With a BOM so spreadsheets read every name right. */
export function teamLeadsCsv(rows: readonly LeadCsvRow[]): string {
  const lines = [
    HEADER,
    ...rows.map((row) => [
      stamp(row.createdAt),
      row.name,
      row.institution,
      row.city,
      row.phone ? csvPhone(row.phone) : null,
      row.email,
      row.wants,
      sourceLine(row.source, row.sourceDetail),
      TEAM_LEAD_STATUS_LABELS[row.status],
      row.lostReason ? LOST_REASON_LABELS[row.lostReason] : null,
      row.owner,
      row.nextFollowUp,
      stamp(row.lastInAt),
      row.notes.join(' | ') || null,
    ]),
  ];
  return `﻿${lines.map((line) => line.map(csvCell).join(',')).join('\r\n')}\r\n`;
}
