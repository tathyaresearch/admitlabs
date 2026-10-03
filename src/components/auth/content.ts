// The words of the two doors into Drishti (spec section 13): /signup to create an account, /login
// to come back. One email-code system underneath (src/lib/auth/email-code.ts); only the look and
// these words differ.

export type AuthMode = 'signup' | 'login';

export const AUTH_COPY = {
  signup: {
    /** The page's name in the browser tab. */
    page: 'Create your account',
    title: 'Create your Drishti account',
    text: 'Free to start. Enter your email and we’ll send you a code.',
    /** On the code step. The email may already have an account: then it simply signs in. */
    verify: 'Continue',
    footText: 'Already have an account?',
    footLink: 'Log in',
    footHref: '/login',
  },
  login: {
    page: 'Log in',
    title: 'Welcome back',
    text: 'Enter your email. We’ll send you a code.',
    verify: 'Sign in',
    footText: 'New to Drishti?',
    footLink: 'Sign up',
    footHref: '/signup',
  },
} as const;

/** While Drishti is not open yet (production, until it opens): instead of the form. No email, no code. */
export const SOON_COPY = {
  page: 'Drishti opens soon',
  title: 'Drishti opens soon.',
} as const;

/** The same for both: the field, the code step and the checks. */
export const CODE_COPY = {
  email: 'Work email',
  placeholder: 'name@college.edu',
  send: 'Send code',
  checkTitle: 'Check your email',
  code: '6-digit code',
  resend: 'Send a new code',
  change: 'Use a different email',
  /**
   * Log in's code step, the same for every email, so it never says whether one has an account:
   * "If this email has a Drishti account, we’ve sent a code. New here? Sign up." with Sign up a link.
   */
  loginSent: 'If this email has a Drishti account, we’ve sent a code.',
  loginResent: 'If this email has a Drishti account, we’ve sent a new code.',
  newHere: 'New here?',
  signUp: 'Sign up',
  /** The one line on the left side, on a wide screen. */
  line: 'See where you stand. Every month.',
  trust: 'Public data only. Every result shows its source and the date it was checked.',
} as const;
