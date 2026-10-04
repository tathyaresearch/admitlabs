import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { describe, test } from 'node:test';
import { APP_SECTIONS, isWebsiteAddress, redirectBecomesRelative, routeFor } from './hosts.ts';

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
    assert.deepEqual(at('admitlabs.in', '/signup'), { kind: 'redirect', url: 'https://app.admitlabs.in/signup', permanent: false });
    assert.deepEqual(at('admitlabs.in', '/audit/abc?check=fees_shown'), { kind: 'redirect', url: 'https://app.admitlabs.in/audit/abc?check=fees_shown', permanent: false });
    assert.deepEqual(at('admitlabs.in', '/team/enquiries'), { kind: 'redirect', url: 'https://app.admitlabs.in/team/enquiries', permanent: false });
    assert.deepEqual(at('admitlabs.in', '/share/token123'), { kind: 'redirect', url: 'https://app.admitlabs.in/share/token123', permanent: false });
    assert.deepEqual(at('admitlabs.localhost:3000', '/login', LOCAL), { kind: 'redirect', url: 'http://localhost:3000/login', permanent: false });
    assert.deepEqual(at('admitlabs.localhost:3000', '/signup', LOCAL), { kind: 'redirect', url: 'http://localhost:3000/signup', permanent: false });
  });

  test('the product page and the website on the dashboard address move to the website', () => {
    assert.deepEqual(at('app.admitlabs.in', '/drishti'), { kind: 'redirect', url: 'https://admitlabs.in/drishti', permanent: false });
    assert.deepEqual(at('localhost:3000', '/drishti', LOCAL), { kind: 'redirect', url: 'http://admitlabs.localhost:3000/drishti', permanent: false });
    // A Client's enquiry form lives on the website's address.
    assert.deepEqual(at('app.admitlabs.in', '/enquire/bp9d3r8w'), { kind: 'redirect', url: 'https://admitlabs.in/enquire/bp9d3r8w', permanent: false });
    assert.deepEqual(at('admitlabs.in', '/enquire/bp9d3r8w'), { kind: 'site', path: '/site/enquire/bp9d3r8w' });
    assert.deepEqual(at('admitlabs.in', '/leads'), { kind: 'redirect', url: 'https://app.admitlabs.in/leads', permanent: false });
    assert.deepEqual(at('app.admitlabs.in', '/site'), { kind: 'redirect', url: 'https://admitlabs.in/', permanent: false });
    assert.deepEqual(at('app.admitlabs.in', '/site/work-with-us?a=1'), { kind: 'redirect', url: 'https://admitlabs.in/work-with-us?a=1', permanent: false });
  });

  test('the dashboard address keeps the dashboard', () => {
    for (const path of ['/', '/login', '/signup', '/audit', '/team', '/share/abc', '/drishtiish']) assert.deepEqual(at('app.admitlabs.in', path), { kind: 'app' });
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

  test('a redirect Next would make relative is spotted: locally, to the dashboard from the website', () => {
    const server = 'http://localhost:3000';
    assert.equal(redirectBecomesRelative('http://localhost:3000/login', server, 'admitlabs.localhost:3000'), true);
    // Same address: relative is right. Another address: kept as it is.
    assert.equal(redirectBecomesRelative('http://localhost:3000/login', server, 'localhost:3000'), false);
    assert.equal(redirectBecomesRelative('http://admitlabs.localhost:3000/drishti', server, 'localhost:3000'), false);
    // Live, the dashboard never has the server's own address.
    assert.equal(redirectBecomesRelative('https://app.admitlabs.in/login', 'https://admitlabs.in', 'admitlabs.in'), false);
    assert.equal(redirectBecomesRelative('https://app.admitlabs.in/login', server, 'admitlabs.in'), false);
  });

  test('only the website address (and its www) may be crawled', () => {
    assert.equal(isWebsiteAddress('admitlabs.in', LIVE), true);
    assert.equal(isWebsiteAddress('www.admitlabs.in', LIVE), true);
    assert.equal(isWebsiteAddress('AdmitLabs.in', LIVE), true);
    assert.equal(isWebsiteAddress('admitlabs.localhost:3000', LOCAL), true);
    assert.equal(isWebsiteAddress('app.admitlabs.in', LIVE), false);
    assert.equal(isWebsiteAddress('localhost:3000', LOCAL), false);
    assert.equal(isWebsiteAddress('drishti-preview.vercel.app', LIVE), false);
    const shared = { site: 'http://localhost:3000', app: 'http://localhost:3000' };
    assert.equal(isWebsiteAddress('localhost:3000', shared), false);
  });
});

// While the dashboard is closed (production, until Drishti opens): the website on every address.
describe('routing while the dashboard is closed', () => {
  const closed = (host: string, path: string, origins = LIVE) => {
    const [pathname = '/', query] = path.split('?');
    return routeFor({ host, pathname, search: query ? `?${query}` : '' }, origins, false);
  };

  test('the website on its address and on previews', () => {
    assert.deepEqual(closed('admitlabs.in', '/'), { kind: 'site', path: '/site' });
    assert.deepEqual(closed('admitlabs.in', '/work-with-us'), { kind: 'site', path: '/site/work-with-us' });
    assert.deepEqual(closed('admitlabs-git-main-tathyaresearch.vercel.app', '/'), { kind: 'site', path: '/site' });
    assert.deepEqual(closed('admitlabs-abc123.vercel.app', '/work-with-us'), { kind: 'site', path: '/site/work-with-us' });
    assert.deepEqual(closed('localhost:3100', '/'), { kind: 'site', path: '/site' });
  });

  test('the dashboard address and www move to the website', () => {
    assert.deepEqual(closed('app.admitlabs.in', '/'), { kind: 'redirect', url: 'https://admitlabs.in/', permanent: false });
    assert.deepEqual(closed('app.admitlabs.in', '/audit?check=fees_shown'), { kind: 'redirect', url: 'https://admitlabs.in/audit?check=fees_shown', permanent: false });
    assert.deepEqual(closed('www.admitlabs.in', '/drishti'), { kind: 'redirect', url: 'https://admitlabs.in/drishti', permanent: true });
    assert.deepEqual(closed('localhost:3000', '/', LOCAL), { kind: 'redirect', url: 'http://admitlabs.localhost:3000/', permanent: false });
  });

  test('sign up, log in, the product page and files are served as they are, on any address', () => {
    for (const host of ['admitlabs.in', 'admitlabs-abc123.vercel.app']) {
      for (const path of ['/signup', '/login', '/drishti', '/drishti/sample-report.pdf', '/_next/static/chunks/app.js', '/robots.txt', '/site/opengraph-image-1a2b3c']) {
        assert.deepEqual(closed(host, path), { kind: 'pass' }, `${host}${path}`);
      }
    }
  });

  test('every other dashboard page asks for a website page that is not there: not found', () => {
    for (const path of ['/audit', '/audit/abc', '/rivals', '/demand', '/leads', '/leads/csv', '/reports/2026-08', '/reports/2026-08.pdf', '/plan', '/settings', '/notifications', '/work', '/onboarding', '/team', '/team/institutions/abc/pdf', '/share/token123', '/share/token123/pdf', '/design-system']) {
      assert.deepEqual(closed('admitlabs.in', path), { kind: 'site', path: `/site${path}` }, path);
    }
    assert.deepEqual(closed('admitlabs.in', '/site/to-dashboard/login'), { kind: 'site', path: '/site/site/to-dashboard/login' });
    // The enquiry forms too: the page says not found while Drishti is closed.
    assert.deepEqual(closed('admitlabs.in', '/enquire/bp9d3r8w'), { kind: 'site', path: '/site/enquire/bp9d3r8w' });
    assert.deepEqual(closed('admitlabs-abc123.vercel.app', '/team'), { kind: 'site', path: '/site/team' });
  });

  test('every dashboard page is listed, so none is ever missed', () => {
    const pages = (dir: string) =>
      readdirSync(new URL(dir, import.meta.url), { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !/^[([_]/.test(entry.name))
        .map((entry) => entry.name);
    for (const page of [...pages('../app/'), ...pages('../app/(dashboard)/')]) assert.ok(APP_SECTIONS.includes(page), page);
  });
});
