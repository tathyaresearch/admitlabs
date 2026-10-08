// The lead ads importer (provider key `lead_import`, spec sections 17 and 27): later, Meta lead ads
// (the lead forms on Facebook and Instagram ads) come into Enquiries as leads, tagged Facebook or
// Instagram, joining a lead that has the same email or phone. In this build it is not connected:
// the mock says so, and pulls nothing. No network, no keys.

import type { ProviderMode } from '../config/providers.ts';

export interface ImportedLead {
  name: string | null;
  email: string | null;
  phone: string | null;
  institution: string | null;
  city: string | null;
  source: 'facebook' | 'instagram';
  /** The ad or form it came from. */
  detail: string | null;
  at: string;
}

export interface LeadImportProvider {
  key: 'lead_import';
  mode: ProviderMode;
  /** What it imports from, for the Enquiries page. */
  name: string;
  status(): Promise<{ connected: false } | { connected: true; lastRunAt: string | null }>;
  pull(since: Date): Promise<ImportedLead[]>;
}
