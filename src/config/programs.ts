// The fixed program list for onboarding and Settings, plus an "Other" option (approved
// 30 Sep 2026). The key groups programs for shared Demand pulls, so two names can share one
// key (Data Analytics and B.Sc Data Analytics are both data-analytics). "Other" programs have
// no key.

export interface ProgramOption {
  name: string;
  key: string;
}

export interface ProgramGroup {
  group: string;
  programs: readonly ProgramOption[];
}

export const PROGRAM_GROUPS: readonly ProgramGroup[] = [
  {
    group: 'Management and commerce',
    programs: [
      { name: 'BBA', key: 'bba' },
      { name: 'MBA', key: 'mba' },
      { name: 'PGDM', key: 'pgdm' },
      { name: 'B.Com', key: 'bcom' },
      { name: 'M.Com', key: 'mcom' },
    ],
  },
  {
    group: 'Computing',
    programs: [
      { name: 'BCA', key: 'bca' },
      { name: 'MCA', key: 'mca' },
      { name: 'B.Sc Computer Science', key: 'bsc-computer-science' },
      { name: 'B.Tech Computer Science', key: 'btech-computer-science' },
      { name: 'Data Analytics', key: 'data-analytics' },
      { name: 'B.Sc Data Analytics', key: 'data-analytics' },
      { name: 'Full Stack Development', key: 'full-stack-development' },
      { name: 'Cyber Security', key: 'cyber-security' },
    ],
  },
  {
    group: 'Engineering',
    programs: [
      { name: 'B.Tech Civil', key: 'btech-civil' },
      { name: 'B.Tech Mechanical', key: 'btech-mechanical' },
      { name: 'B.Tech Electrical', key: 'btech-electrical' },
      { name: 'B.Tech Electronics', key: 'btech-electronics' },
      { name: 'M.Tech', key: 'mtech' },
      { name: 'Diploma in Engineering', key: 'diploma-engineering' },
    ],
  },
  {
    group: 'Health',
    programs: [
      { name: 'B.Sc Nursing', key: 'nursing' },
      { name: 'GNM', key: 'gnm' },
      { name: 'ANM', key: 'anm' },
      { name: 'B.Pharm', key: 'bpharm' },
      { name: 'D.Pharm', key: 'dpharm' },
      { name: 'BPT', key: 'bpt' },
      { name: 'Medical Lab Technology', key: 'medical-lab-technology' },
      { name: 'General Duty Assistant', key: 'general-duty-assistant' },
    ],
  },
  {
    group: 'Hospitality',
    programs: [
      { name: 'Hotel Management', key: 'hotel-management' },
      { name: 'Travel and Tourism', key: 'travel-tourism' },
      { name: 'Culinary Arts', key: 'culinary-arts' },
      { name: 'Aviation and Cabin Crew', key: 'aviation' },
    ],
  },
  {
    group: 'Arts and science',
    programs: [
      { name: 'BA', key: 'ba' },
      { name: 'MA', key: 'ma' },
      { name: 'B.Sc', key: 'bsc' },
      { name: 'M.Sc', key: 'msc' },
      { name: 'BSW', key: 'bsw' },
      { name: 'MSW', key: 'msw' },
    ],
  },
  {
    group: 'Law',
    programs: [
      { name: 'LLB', key: 'llb' },
      { name: 'BA LLB', key: 'ba-llb' },
      { name: 'BBA LLB', key: 'bba-llb' },
      { name: 'LLM', key: 'llm' },
    ],
  },
  {
    group: 'Education',
    programs: [
      { name: 'B.Ed', key: 'bed' },
      { name: 'D.El.Ed', key: 'deled' },
    ],
  },
  {
    group: 'Design and media',
    programs: [
      { name: 'B.Des', key: 'bdes' },
      { name: 'Fashion Design', key: 'fashion-design' },
      { name: 'Interior Design', key: 'interior-design' },
      { name: 'Graphic Design', key: 'graphic-design' },
      { name: 'Animation and VFX', key: 'animation-vfx' },
      { name: 'Journalism and Mass Communication', key: 'journalism' },
    ],
  },
  {
    group: 'Skills',
    programs: [
      { name: 'Digital Marketing', key: 'digital-marketing' },
      { name: 'Tally and Accounting', key: 'accounting' },
      { name: 'Banking and Finance', key: 'banking-finance' },
      { name: 'Retail and Sales', key: 'retail-sales' },
      { name: 'Logistics', key: 'logistics' },
      { name: 'Beauty and Wellness', key: 'beauty-wellness' },
      { name: 'Electrician', key: 'electrician' },
      { name: 'Spoken English', key: 'spoken-english' },
    ],
  },
  {
    group: 'Agriculture',
    programs: [{ name: 'B.Sc Agriculture', key: 'bsc-agriculture' }],
  },
];

export const LISTED_PROGRAMS: readonly ProgramOption[] = PROGRAM_GROUPS.flatMap((group) => group.programs);

/** The listed program with this name, ignoring case and spacing. */
export function listedProgram(name: string): ProgramOption | undefined {
  const wanted = name.toLowerCase().replace(/\s+/g, ' ').trim();
  return LISTED_PROGRAMS.find((program) => program.name.toLowerCase() === wanted);
}
