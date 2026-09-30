// Turns the short codes the database functions raise into plain sentences.

const MESSAGES: Readonly<Record<string, string>> = {
  already_claimed: 'This institution is already on Drishti. Ask its owner to invite you.',
  already_onboarded: 'You have already set up your institution.',
  team_user: 'AdmitLabs team accounts do not set up institutions.',
  website_taken: 'Another institution on Drishti already uses this website.',
  last_program: 'Keep at least one program. Add another before removing this one.',
  free_program: 'This is the program your free Audit covers. Choose another one first, then remove it.',
  already_member: 'This person is already part of your institution.',
  no_programs: 'Add at least one program.',
  not_allowed: 'Only the owner of this account can do that.',
  refresh_used: "This month's extra refresh has been used.",
  rival_count: 'Pick 3 to 5 rivals.',
  rivals_locked: 'On Free, your rivals stay as you picked them. Paid can change them once a month.',
  change_used: 'You have changed your rivals this month. You can change them again from the 1st.',
  own_website: 'That website is your own.',
  rival_details: 'One of the rivals you added needs another look. Check its name, city and website.',
  rival_programs: 'Tick at least one program each added rival also offers.',
};

export function friendlyError(message: string | null | undefined, fallback = 'That did not work just now. Please try again.'): string {
  if (!message) return fallback;
  const code = Object.keys(MESSAGES).find((key) => message.includes(key));
  return code ? (MESSAGES[code] as string) : fallback;
}
