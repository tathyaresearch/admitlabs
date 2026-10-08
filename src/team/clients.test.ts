import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { isFullTeam, TEAM_ROLE_LABELS, TEAM_ROLES } from '../domain/types.ts';
import { clientBrainLine, managersLine, matchesManager, parseManagerFilter } from './clients.ts';

describe('the team’s Clients (spec section 27)', () => {
  test('a Client’s Brain in a few words', () => {
    assert.equal(clientBrainLine(null), 'Onboarding not started');
    assert.equal(clientBrainLine({ status: 'onboarding', percent: 80, stale: 0, season: null }), 'Onboarding, 80%');
    assert.equal(clientBrainLine({ status: 'ready', percent: 100, stale: 0, season: null }), 'Ready');
    assert.equal(clientBrainLine({ status: 'ready', percent: 100, stale: 2, season: '2026-12-01' }), 'Ready, 2 facts to check');
  });

  test('who looks after them', () => {
    assert.equal(managersLine([]), 'No Client manager');
    assert.equal(managersLine(['Farhan Ali']), 'Farhan Ali');
    assert.equal(managersLine(['Farhan Ali', 'Isha Roy', 'You']), 'Farhan Ali, Isha Roy and You');
  });

  test('the filter by Client manager', () => {
    const id = '6f1c2b8e-3a4d-4e5f-8a9b-0c1d2e3f4a5b';
    assert.deepEqual(parseManagerFilter(undefined), { kind: 'any' });
    assert.deepEqual(parseManagerFilter('none'), { kind: 'none' });
    assert.deepEqual(parseManagerFilter(id.toUpperCase()), { kind: 'person', userId: id });
    assert.deepEqual(parseManagerFilter('not-a-person'), { kind: 'any' });
    assert.ok(matchesManager({ kind: 'none' }, []));
    assert.ok(!matchesManager({ kind: 'none' }, [id]));
    assert.ok(matchesManager({ kind: 'person', userId: id }, [id]));
    assert.ok(!matchesManager({ kind: 'person', userId: id }, []));
  });

  test('three access levels: Admin and Team member are the full team, a Client manager is not', () => {
    assert.deepEqual([...TEAM_ROLES], ['admin', 'team', 'client_manager']);
    assert.deepEqual(TEAM_ROLES.map((role) => TEAM_ROLE_LABELS[role]), ['Admin', 'Team member', 'Client manager']);
    assert.ok(isFullTeam('admin') && isFullTeam('team'));
    assert.ok(!isFullTeam('client_manager') && !isFullTeam(null) && !isFullTeam(undefined));
  });

  test('the database knows the same three levels', () => {
    const sql = readFileSync(new URL('../../supabase/migrations/20261022120000_team_role_kinds.sql', import.meta.url), 'utf8');
    assert.match(sql, /add value if not exists 'client_manager'/);
  });
});
