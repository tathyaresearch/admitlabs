// Enquiries: AdmitLabs' own leads (spec section 27). People at colleges who may work with
// AdmitLabs, never students. The words for sources, statuses and lost reasons, kept in step with
// the database (the team_leads migration; a test reads it). Pure.

export const TEAM_LEAD_SOURCES = [
  'website',
  'free_signup',
  'fix_request',
  'services',
  'ask_paid',
  'continue_paid',
  'instagram',
  'facebook',
  'linkedin',
  'youtube',
  'whatsapp',
  'referral',
  'event',
  'other',
] as const;
export type TeamLeadSource = (typeof TEAM_LEAD_SOURCES)[number];

export const TEAM_LEAD_SOURCE_LABELS: Readonly<Record<TeamLeadSource, string>> = {
  website: 'Talk to us form',
  free_signup: 'Free sign up',
  fix_request: 'Let AdmitLabs fix this',
  services: 'Services card',
  ask_paid: 'Asked for Paid',
  continue_paid: 'Asked to renew',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
  referral: 'Referral',
  event: 'Event',
  other: 'Other',
};

/** The sources a person picks (adding a lead by hand, making a tracking link). The rest come in on their own. */
export const SOCIAL_SOURCES = ['instagram', 'facebook', 'linkedin', 'youtube', 'whatsapp', 'referral', 'event', 'other'] as const satisfies readonly TeamLeadSource[];
export type SocialSource = (typeof SOCIAL_SOURCES)[number];

/** Sources that come in on their own, from the website and the dashboard. */
export const AUTOMATIC_SOURCES: readonly TeamLeadSource[] = TEAM_LEAD_SOURCES.filter((source) => !(SOCIAL_SOURCES as readonly string[]).includes(source));

export const TEAM_LEAD_STATUSES = ['new', 'contacted', 'call_booked', 'proposal_sent', 'won', 'lost'] as const;
export type TeamLeadStatus = (typeof TEAM_LEAD_STATUSES)[number];

export const TEAM_LEAD_STATUS_LABELS: Readonly<Record<TeamLeadStatus, string>> = {
  new: 'New',
  contacted: 'Contacted',
  call_booked: 'Call booked',
  proposal_sent: 'Proposal sent',
  won: 'Won',
  lost: 'Lost',
};

export const LOST_REASONS = ['price', 'timing', 'chose_someone_else', 'no_reply', 'not_a_fit', 'other'] as const;
export type LostReason = (typeof LOST_REASONS)[number];

export const LOST_REASON_LABELS: Readonly<Record<LostReason, string>> = {
  price: 'Price',
  timing: 'Timing',
  chose_someone_else: 'Chose someone else',
  no_reply: 'No reply',
  not_a_fit: 'Not a fit',
  other: 'Other',
};

/** Still being worked: not Won, not Lost. */
export function isOpen(status: TeamLeadStatus): boolean {
  return status !== 'won' && status !== 'lost';
}

/** What to call a lead: the person, or their institution when there is no name. */
export function leadTitle(lead: { name: string | null; institution: string | null; email: string | null }): string {
  return lead.name ?? lead.institution ?? lead.email ?? 'An enquiry';
}

/** Where a lead came from in words: "Instagram, Bio link", "Let AdmitLabs fix this: Show your fees". */
export function sourceLine(source: TeamLeadSource, detail: string | null): string {
  if (!detail) return TEAM_LEAD_SOURCE_LABELS[source];
  return source === 'fix_request' ? `${TEAM_LEAD_SOURCE_LABELS[source]}: ${detail}` : `${TEAM_LEAD_SOURCE_LABELS[source]}, ${detail}`;
}
