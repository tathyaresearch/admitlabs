import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { APP_URL } from '../lib/urls.ts';
import { CTA } from './content.ts';
import { headerButtons, signIn, wayIn } from './way-in.ts';

describe('the ways into Drishti from the website and the product page', () => {
  test('while the dashboard is open: each button as it is, into the dashboard', () => {
    assert.deepEqual(wayIn(CTA.primary, '/signup', true), { href: `${APP_URL}/signup`, label: 'Get your free Audit' });
    assert.deepEqual(wayIn(CTA.signIn, '/login', true), { href: `${APP_URL}/login`, label: 'Sign in' });
  });

  test('while it is closed: every one says Talk to us and opens /signup on the website', () => {
    assert.deepEqual(wayIn(CTA.primary, '/signup', false), { href: '/signup', label: 'Talk to us' });
    assert.deepEqual(wayIn('Start with a free Audit', '/signup', false), { href: '/signup', label: 'Talk to us' });
    assert.deepEqual(wayIn(CTA.signIn, '/login', false), { href: '/signup', label: 'Talk to us' });
  });

  test('Sign in: the dashboard’s log in while it is open, /login on the website while it is closed', () => {
    assert.deepEqual(signIn(true), { href: `${APP_URL}/login`, label: 'Sign in' });
    assert.deepEqual(signIn(false), { href: '/login', label: 'Sign in' });
  });

  test('the header’s buttons: Sign in and Talk to us while closed, Sign in and Get your free Audit while open', () => {
    assert.deepEqual(headerButtons(false), { signIn: { href: '/signup', label: 'Sign in' }, talk: { href: 'mailto:hello@admitlabs.in', label: 'Talk to us' } });
    assert.deepEqual(headerButtons(true), { signIn: { href: `${APP_URL}/login`, label: 'Sign in' }, talk: { href: `${APP_URL}/signup`, label: 'Get your free Audit' } });
  });
});
