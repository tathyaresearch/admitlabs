import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { hasDashes } from '../../domain/copy.ts';
import { isNoAccount } from '../../lib/auth/no-account.ts';
import { AUTH_COPY, CODE_COPY, SOON_COPY } from './content.ts';

// The two doors into Drishti: their words are the user's, every free Audit button leads to sign
// up, every sign-in link to log in, and log in tells an email with no account apart, for itself
// only: what it shows is the same for every email.

function texts(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(texts);
  return [];
}

const SRC = join(import.meta.dirname, '..', '..');
const read = (...parts: string[]) => readFileSync(join(SRC, ...parts), 'utf8');

describe('sign up and log in', () => {
  test('the words are as the user wrote them, with no dashes and curly apostrophes only', () => {
    assert.equal(AUTH_COPY.signup.title, 'Create your Drishti account');
    assert.equal(AUTH_COPY.signup.text, 'Free to start. Enter your email and we’ll send you a code.');
    assert.equal(`${AUTH_COPY.signup.footText} ${AUTH_COPY.signup.footLink}`, 'Already have an account? Log in');
    assert.equal(AUTH_COPY.login.title, 'Welcome back');
    assert.equal(AUTH_COPY.login.text, 'Enter your email. We’ll send you a code.');
    assert.equal(`${AUTH_COPY.login.footText} ${AUTH_COPY.login.footLink}`, 'New to Drishti? Sign up');
    assert.equal(`${CODE_COPY.loginSent} ${CODE_COPY.newHere} ${CODE_COPY.signUp}.`, 'If this email has a Drishti account, we’ve sent a code. New here? Sign up.');
    assert.equal(AUTH_COPY.signup.verify, 'Continue');
    // While Drishti is not open yet, instead of the form.
    assert.equal(SOON_COPY.title, 'Drishti opens soon.');
    for (const text of texts({ AUTH_COPY, CODE_COPY, SOON_COPY })) {
      assert.equal(hasDashes(text), false, text);
      assert.doesNotMatch(text, /["']/, text);
    }
  });

  test('each page links to the other', () => {
    assert.equal(AUTH_COPY.signup.footHref, '/login');
    assert.equal(AUTH_COPY.login.footHref, '/signup');
  });

  test('every free Audit button on the website, /drishti and a shared Audit leads to sign up', () => {
    // The website and /drishti go through wayIn: sign up while the dashboard is open, "Talk to us"
    // to /signup while it is closed (src/site/way-in.test.ts).
    const ways = [
      ['components', 'site', 'Header.tsx'],
      ['components', 'site', 'Hero.tsx'],
      ['components', 'site', 'Drishti.tsx'],
      ['components', 'site', 'Sections.tsx'],
      ['components', 'product', 'Sections.tsx'],
      ['components', 'product', 'Offer.tsx'],
    ];
    for (const file of ways) {
      const source = read(...file);
      assert.match(source, /wayIn\((CTA\.primary|card\.cta)\)/, file.join('/'));
      assert.doesNotMatch(source, /\/login/, file.join('/'));
    }
    assert.match(read('components', 'share', 'SharedAudit.tsx'), /\/signup/);
    for (const route of [['app', 'share', '[token]', 'pdf', 'route.ts'], ['app', 'team', 'institutions', '[id]', 'pdf', 'route.ts']]) {
      assert.match(read(...route), /freeAuditUrl: `\$\{APP_URL\}\/signup`/, route.join('/'));
    }
  });

  test('the website’s sign-in link leads to log in', () => {
    assert.match(read('components', 'site', 'Footer.tsx'), /wayIn\(CTA\.signIn, '\/login'\)/);
  });

  test('log in tells an email with no account apart from other failures', () => {
    assert.equal(isNoAccount({ code: 'otp_disabled', message: 'Signups not allowed for otp' }), true);
    assert.equal(isNoAccount({ message: 'Signups not allowed for otp' }), true);
    assert.equal(isNoAccount({ code: 'over_email_send_rate_limit', message: 'Email rate limit exceeded' }), false);
    assert.equal(isNoAccount({ code: 'unexpected_failure', message: 'Error sending magic link email' }), false);
    assert.equal(isNoAccount(null), false);
    assert.equal(isNoAccount(undefined), false);
  });
});
