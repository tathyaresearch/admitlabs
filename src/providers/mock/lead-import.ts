// The lead ads importer's mock: not connected, nothing to pull (spec section 27).

import type { LeadImportProvider } from '../lead-import.ts';

export const mockLeadImport: LeadImportProvider = {
  key: 'lead_import',
  mode: 'mock',
  name: 'Meta lead ads',
  async status() {
    return { connected: false };
  },
  async pull() {
    return [];
  },
};
