// Words for Leads (spec section 23). Plain language, no dashes. The consent line is kept with
// each enquiry exactly as the student saw it.

/** The line above the form's button: "Your details go to Brightpath Skills Academy so they can contact you about admission." */
export function consentLine(college: string): string {
  return `Your details go to ${college} so they can contact you about admission.`;
}

/** A general link names no program: the student picks the course on its form. */
export const ANY_COURSE = 'Any course';
/** The choice for a general link where a link is made, and the value it sends. */
export const ANY_COURSE_OPTION = 'Any course: the student picks';
export const ANY_COURSE_VALUE = 'any';

/** What the student sees after sending: "Thanks. Brightpath Skills Academy will contact you soon." */
export function thanksLine(college: string): string {
  return `Thanks. ${college} will contact you soon.`;
}
