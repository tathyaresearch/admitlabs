import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { routeFor } from './hosts.ts';

// One app, two addresses: the website and the dashboard each answer only their own pages.

const LIVE = { site: 'https://admitlabs.in', app: 'https://app.admitlabs.in' };
const LOCAL = { site: 'http://admitlabs.localhost:3000', app: 'http://localhost:3000' };

const at = (host: string, path: string, origins = LIVE) => {
  const [pathname = '/', query] = path.split('?');
  return routeFor({ host, pathname, search: query ? `?${query}` : '' }, origins);
};

describe('routing by address', () => {
  test('the website address serves the website from inside the app', () => {
    assert.deepEqual(at('admitlabs.in', '/'), { kind: 'site', path: '/site' });
    assert.deepEqual(at('admitlabs.in', '/work-with-us'), { kind: 'site', path: '/site/work-with-us' });
    assert.deepEqual(at('admitlabs.localhost:3000', '/', LOCAL), { kind: 'site', path: '/site' });
  });

  test('the product page and files are served as they are on the website address', () => {
    assert.deepEqual(at('admitlabs.in', '/drishti'), { kind: 'pass' });
    assert.deepEqual(at('admitlabs.in', '/drishti/sample-report.pdf'), { kind: 'pass' });
    assert.deepEqual(at('admitlabs.in', '/_next/static/chunks/app.js'), { kind: 'pass' });
    assert.deepEqual(at('admitlabs.in', '/__nextjs_original-stack-frames'), { kind: 'pass' });
    assert.deepEqual(at('admitlabs.in', '/robots.txt'), { kind: 'pass' });
    assert.deepEqual(at('admitlabs.in', '/site/opengraph-image-1a2b3c'), { kind: 'pass' });
    // Not mistaken for the product page.
    assert.deepEqual(at('admitlabs.in', '/drishtiish'), { kind: 'site', path: '/site/drishtiish' });
  });

  test('dashboard pages on the website address move to the dashboard, with their query', () => {
    assert.deepEqual(at('admitlabs.in', '/login'), { kind: 'redirect', url: 'https://app.admitlabs.in/login', permanent: false });
    assert.deepEqual(at('admitlabs.in', '/audit/abc?check=fees_shown'), { kind: 'redirect', url: 'https://app.admitlabs.in/audit/abc?check=fees_shown', permanent: false });
    assert.deepEqual(at('admitlabs.in', '/team/enquiries'), { kind: 'redirect', url: 'https://app.admitlabs.in/team/enquiries', permanent: false });
    assert.deepEqual(at('admitlabs.in', '/share/token123'), { kind: 'redirect', url: 'https://app.admitlabs.in/share/token123', permanent: false });
    assert.deepEqual(at('admitlabs.localhost:3000', '/login', LOCAL), { kind: 'redirect', url: 'http://localhost:3000/login', permanent: false });
  });

  test('the product page and the website on the dashboard address move to the website', () => {
    assert.deepEqual(at('app.admitlabs.in', '/drishti'), { kind: 'redirect', url: 'https://admitlabs.in/drishti', permanent: false });
    assert.deepEqual(at('localhost:3000', '/drishti', LOCAL), { kind: 'redirect', url: 'http://admitlabs.localhost:3000/drishti', permanent: false });
    assert.deepEqual(at('app.admitlabs.in', '/site'), { kind: 'redirect', url: 'https://admitlabs.in/', permanent: false });
    assert.deepEqual(at('app.admitlabs.in', '/site/work-with-us?a=1'), { kind: 'redirect', url: 'https://admitlabs.in/work-with-us?a=1', permanent: false });
  });

  test('the dashboard address keeps the dashboard', () => {
    for (const path of ['/', '/login', '/audit', '/team', '/share/abc', '/drishtiish']) assert.deepEqual(at('app.admitlabs.in', path), { kind: 'app' });
    assert.deepEqual(at('localhost:3000', '/', LOCAL), { kind: 'app' });
  });

  test('www moves to the website address for good', () => {
    assert.deepEqual(at('www.admitlabs.in', '/drishti?x=1'), { kind: 'redirect', url: 'https://admitlabs.in/drishti?x=1', permanent: true });
  });

  test('any other address (a preview) and a single shared address route nothing', () => {
    assert.deepEqual(at('drishti-preview.vercel.app', '/drishti'), { kind: 'app' });
    assert.deepEqual(at('drishti-preview.vercel.app', '/site'), { kind: 'app' });
    const shared = { site: 'http://localhost:3000', app: 'http://localhost:3000' };
    assert.deepEqual(at('localhost:3000', '/drishti', shared), { kind: 'app' });
    assert.deepEqual(at('localhost:3000', '/', shared), { kind: 'app' });
  });

  test('addresses match whatever their case', () => {
    assert.deepEqual(at('AdmitLabs.in', '/'), { kind: 'site', path: '/site' });
  });
});
