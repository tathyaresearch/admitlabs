import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { PROVIDER_KEYS } from '../config/providers.ts';
import { getProvider } from '../providers/registry.ts';
import { sampleInstitution } from './index.ts';
import { historyOf, MOCK_ENV, sampleAuditChain, sampleDemand, sampleMoves, sampleRivalLessons, sampleRivals, storedAudit } from './world.ts';
import { istDate } from '../domain/dates.ts';

// The sample world in memory: the same Audits, rivals, lessons and Demand the seeded database
// holds, worked out through the live path with the mock providers and the real engine.

describe('the sample world, without a database', () => {
  test('always the mock providers, whatever the settings say', () => {
    for (const key of PROVIDER_KEYS) assert.equal(MOCK_ENV[`DRISHTI_PROVIDER_${key.toUpperCase()}`], 'mock', key);
    assert.equal(getProvider('search', { ...MOCK_ENV }).key, 'search');
  });

  test("Eastgate's own Audits, month after month, each compared with the one before", async () => {
    const chain = await sampleAuditChain('eastgate-university', 'own', '2026-09-30');
    assert.deepEqual(
      historyOf(chain).map((row) => row.scores.overall),
      [59, 61, 69, 72, 73, 73],
    );
    assert.ok(chain.every((audit) => audit.record.kind === 'paid' && audit.record.programs.length === 5));
    assert.equal(chain[0]?.record.overall_change, null, 'the first Audit has nothing to compare with');
    assert.equal(chain[4]?.record.overall_change, 1, 'August is up 1 on July');
    assert.equal(chain[4]?.record.previous_audit_id, chain[3]?.id);
    assert.equal(storedAudit(chain[5]!.record, { id: chain[5]!.id }).id, 'eastgate-university-paid-2026-09-15');
  });

  test('Free institutions audit their one program only', async () => {
    const chain = await sampleAuditChain('northbank-college', 'own', '2026-09-30');
    assert.ok(chain.length > 0);
    assert.ok(chain.every((audit) => audit.record.kind === 'free' && audit.record.programs.length === 1));
  });

  test("each rival's latest rival Audit up to a day, in name order", async () => {
    const rivals = await sampleRivals('eastgate-university', '2026-09-30');
    assert.deepEqual(
      rivals.map((rival) => [rival.name, rival.audit?.record.kind, rival.audit?.record.overall]),
      [
        ['Highfield University', 'rival', 51],
        ['Northbank College', 'rival', 46],
        ['Silverline College', 'rival', 74],
      ],
    );
    const before = await sampleRivals('eastgate-university', '2026-07-31');
    assert.ok(before.every((rival) => rival.audit === null), 'no rival Audits before 1 August');
  });

  test('moves in a window, newest first, each linking to the page it was found on', () => {
    const moves = sampleMoves(['highfield-university', 'silverline-college', 'northbank-college'], istDate('2026-08-01'), istDate('2026-09-01'));
    assert.ok(moves.length > 0);
    assert.deepEqual(
      moves.map((move) => move.detectedAt),
      [...moves.map((move) => move.detectedAt)].sort().reverse(),
    );
    assert.ok(moves.every((move) => move.sourceUrl.startsWith('https://') && move.sourceUrl.includes('.example/')));
  });

  test('the Rivals 3 things to do, as the monthly job writes them', async () => {
    const lessons = await sampleRivalLessons('eastgate-university', '2026-08-31');
    assert.equal(lessons.length, 3);
    assert.ok(lessons.every((lesson) => lesson.text && lesson.rivalId));
    assert.equal(lessons[0]?.checkKey, 'placement_proof');
    assert.deepEqual(await sampleRivalLessons('silverline-college', '2026-08-31'), [], 'Free gets none');
    assert.equal((await sampleRivalLessons('brightpath-skills', '2026-08-31')).length, 3, 'Client does');
  });

  test('Demand for the city: grouped items, ranked, with 5 content ideas per program and no mentions', async () => {
    const { region, rows, pulledAt } = await sampleDemand('eastgate-university', '2026-08');
    assert.equal(region.region, 'Guwahati');
    assert.equal(pulledAt, istDate('2026-08-28', 6).toISOString());
    assert.equal(rows.filter((row) => row.kind === 'mention').length, 0);
    const programs = sampleInstitution('eastgate-university').programs;
    for (const program of programs) {
      assert.equal(rows.filter((row) => row.programKey === program.programKey && row.kind === 'idea').length, 5, program.name);
      assert.ok(rows.some((row) => row.programKey === program.programKey && row.kind === 'question'), program.name);
    }
    assert.ok(rows.filter((row) => row.kind === 'rising').every((row) => row.rank !== null));
  });
});
