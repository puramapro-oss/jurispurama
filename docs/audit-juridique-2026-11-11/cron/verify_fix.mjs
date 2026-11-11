import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBackend, instantiateHandler, requestRow } from './harness.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(directory, '../../..');
const relativePath = 'src/app/api/cron/account-deletion/route.ts';
const before = fs.readFileSync(path.join(directory, 'route.original.ts'), 'utf8');
const after = fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');

const configurations = [
  { id: 'claim_write_error', rows: [requestRow('claim')], options: { failClaim: ['fake-user-claim'] }, expected: { http: 500, ok: false, processed: 1, succeeded: 0, failed: 1, deleteCalls: 0, state: 'scheduled', users: 1 } },
  { id: 'completion_write_error', rows: [requestRow('completion')], options: { failCompletion: ['fake-user-completion'] }, expected: { http: 500, ok: false, processed: 1, succeeded: 0, failed: 1, deleteCalls: 1, state: 'executing', users: 0, resultError: 'SIMULATED_COMPLETION_WRITE_FAILURE' } },
  { id: 'auth_deletion_error', rows: [requestRow('authfail')], options: { failDelete: ['fake-user-authfail'] }, expected: { http: 500, ok: false, processed: 1, succeeded: 0, failed: 1, deleteCalls: 1, state: 'executing', users: 1 } },
  { id: 'mixed_batch', rows: [requestRow('mixed-ok'), requestRow('mixed-fail')], options: { failDelete: ['fake-user-mixed-fail'] }, expected: { http: 500, ok: false, processed: 2, succeeded: 1, failed: 1, deleteCalls: 2, users: 1 } },
  { id: 'healthy_batch', rows: [requestRow('healthy-1'), requestRow('healthy-2')], options: {}, expected: { http: 200, ok: true, processed: 2, succeeded: 2, failed: 0, deleteCalls: 2, users: 0 } },
  { id: 'empty_batch', rows: [], options: {}, expected: { http: 200, ok: true, processed: 0, deleteCalls: 0, users: 0 } },
  { id: 'authorization_refused', rows: [requestRow('unauthorized')], options: {}, authorized: false, expected: { http: 401, deleteCalls: 0, users: 1, events: 0 } },
];

async function executeVersion(source, label) {
  const results = [];
  for (const config of configurations) {
    const backend = createBackend(config.rows, config.options);
    const handler = await instantiateHandler(backend, source, config.authorized !== false);
    const response = await handler[config.id === 'completion_write_error' ? 'POST' : 'GET']({});
    const snapshot = backend.snapshot();
    const actual = {
      http: response.status,
      ok: response.body.ok,
      processed: response.body.processed,
      succeeded: response.body.succeeded,
      failed: response.body.failed,
      deleteCalls: snapshot.deleteCalls.length,
      users: snapshot.fakeAuthUsers.length,
      state: snapshot.requests[0]?.status,
      events: backend.events.length,
      resultError: response.body.results?.[0]?.error,
    };
    const mismatches = Object.entries(config.expected)
      .filter(([key, value]) => actual[key] !== value)
      .map(([key, expected]) => ({ field: key, expected, actual: actual[key] }));
    results.push({ id: config.id, meetsExpectedBehavior: mismatches.length === 0, expected: config.expected, actual, mismatches, response, snapshot, events: backend.events });
  }

  // The requested fix must not silently introduce automatic retries of executing rows.
  const row = requestRow('manual-preserved');
  const backend = createBackend([row], { failDelete: [row.user_id] });
  const handler = await instantiateHandler(backend, source);
  const first = await handler.GET({});
  backend.failDelete.clear();
  const second = await handler.GET({});
  const snapshot = backend.snapshot();
  const manualPreserved = second.body.processed === 0 && snapshot.requests[0].status === 'executing' && snapshot.deleteCalls.length === 1 && snapshot.fakeAuthUsers.includes(row.user_id);
  results.push({
    id: 'manual_recovery_preserved', meetsExpectedBehavior: manualPreserved,
    expected: 'No automatic retry of an executing row, even when the injected deletion fault is removed.',
    first, second, snapshot, events: backend.events,
  });
  return { label, checks: results.length, passed: results.filter(item => item.meetsExpectedBehavior).length, results };
}

const baseline = await executeVersion(before, 'before');
const corrected = await executeVersion(after, 'after');
assert.equal(corrected.passed, corrected.checks, 'The corrected handler must satisfy every expected behavior.');
assert.equal(baseline.passed, 4, 'Baseline should expose the four known failing cases and preserve four unaffected cases.');

// Additional checks: no extra deletion calls in already handled scenarios, and
// clean/empty/refused responses remain identical except for measured runtime.
for (const id of ['healthy_batch', 'empty_batch', 'authorization_refused']) {
  const oldCase = baseline.results.find(item => item.id === id);
  const newCase = corrected.results.find(item => item.id === id);
  assert.deepEqual(newCase.response, oldCase.response, `${id} response must remain unchanged.`);
}

const report = {
  status: 'PASS_CORRECTED_8_OF_8', recordedAt: new Date().toISOString(), runtime: process.version,
  command: 'node --experimental-vm-modules docs/audit-juridique-2026-11-11/cron/verify_fix.mjs',
  sourceCommit: '70d123d40ebffc507271c8acf0c9b56c20c428a8', sourcePath: relativePath,
  beforeSha256: crypto.createHash('sha256').update(before).digest('hex'),
  afterSha256: crypto.createHash('sha256').update(after).digest('hex'),
  baseline, corrected,
  limitations: [
    'Actual handlers executed with fake in-memory dependencies only; no network or real deletion.',
    'SQL constraints, cascades, storage, external services, actual auth verification, Next.js server and production are not tested.',
    'Manual recovery of executing requests remains unchanged and is explicitly tested as still required.',
    'The authorization-refused case verifies handler early return, not the implementation of assertCronAuth.',
    'HTTP 500 on partial failure is a deliberate response-contract change to be reviewed with real monitoring/invocation configuration.',
  ],
};
fs.writeFileSync(path.join(directory, 'fix-results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  status: report.status, beforeSha256: report.beforeSha256, afterSha256: report.afterSha256,
  baselinePassed: `${baseline.passed}/${baseline.checks}`, correctedPassed: `${corrected.passed}/${corrected.checks}`,
  cases: corrected.results.map(item => ({ id: item.id, pass: item.meetsExpectedBehavior })),
}, null, 2));
