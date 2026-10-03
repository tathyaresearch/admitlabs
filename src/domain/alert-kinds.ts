// Alerts by what they are about (B10): the filters on Notifications, and what each alert's link
// says, so it is clear where it goes. Pure.

export const ALERT_FILTERS = ['audit', 'rivals', 'students', 'reports', 'plan'] as const;
export type AlertFilter = (typeof ALERT_FILTERS)[number];

export const ALERT_FILTER_LABELS: Readonly<Record<AlertFilter, string>> = {
  audit: 'Audit',
  rivals: 'Rivals',
  students: 'Students',
  reports: 'Reports',
  plan: 'Plan',
};

const FILTER_OF: Readonly<Record<string, AlertFilter>> = {
  audit_ready: 'audit',
  rival_move: 'rivals',
  demand_spike: 'students',
  report_ready: 'reports',
  plan_reminder: 'plan',
  plan_ended: 'plan',
};

/** The filter an alert belongs to; null for a kind this build does not know. */
export function alertFilter(kind: string): AlertFilter | null {
  return FILTER_OF[kind] ?? null;
}

/** What the alert's link says: where it goes. */
export function alertLinkText(kind: string, link: string): string {
  switch (kind) {
    case 'audit_ready':
      return link.includes('#changed') ? 'See what changed' : 'See your Audit';
    case 'rival_move':
      return 'See the move';
    case 'demand_spike':
      return 'See what students search for';
    case 'report_ready':
      return 'See the report';
    case 'plan_reminder':
    case 'plan_ended':
      return 'See your plan';
    default:
      return 'Open';
  }
}
