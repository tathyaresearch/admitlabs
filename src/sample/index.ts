// The fictional sample world for Drishti (spec section 20).

import type { InstitutionRef, ProgramRef } from '../providers/types.ts';
import { institutionId, programId } from './ids.ts';
import type { SampleInstitution } from './institutions.ts';

export * from './bulk.ts';
export * from './demand.ts';
export * from './details.ts';
export * from './ids.ts';
export * from './institutions.ts';
export * from './leads.ts';
export * from './marks.ts';
export * from './profiles.ts';
export * from './requests.ts';
export * from './reviews.ts';
export * from './rivals.ts';
export * from './shares.ts';
export * from './users.ts';

/** The provider input for a sample institution. */
export function toInstitutionRef(sample: SampleInstitution): InstitutionRef {
  return {
    id: institutionId(sample.slug),
    slug: sample.slug,
    name: sample.name,
    type: sample.type,
    city: sample.city,
    state: sample.state,
    website: sample.website,
    instagram: sample.instagram,
    youtube: sample.youtube,
    otherLinks: sample.otherLinks,
    programKeys: sample.programs.map((program) => program.programKey),
  };
}

export function toProgramRefs(sample: SampleInstitution): ProgramRef[] {
  return sample.programs.map((program) => ({
    id: programId(sample.slug, program.programKey),
    name: program.name,
    programKey: program.programKey,
  }));
}
