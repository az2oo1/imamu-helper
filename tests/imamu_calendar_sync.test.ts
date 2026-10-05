import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { toRiyadhDateStr } from '../src/server/services/imamuCalendar';
import { closeDatabaseConnections } from '../src/db/index';

describe('IMAMU Calendar Sync Tests', () => {
  after(async () => {
    await closeDatabaseConnections();
  });

  it('correctly converts UTC ISO timestamps to Riyadh local date YYYY-MM-DD', () => {
    // 21:00 UTC on Aug 22 is 00:00 local time on Aug 23 in Riyadh (+3 hours)
    assert.strictEqual(toRiyadhDateStr('2026-08-22T21:00:00Z'), '2026-08-23');
    // 21:00 UTC on Jul 25 is 00:00 local time on Jul 26 in Riyadh
    assert.strictEqual(toRiyadhDateStr('2026-07-25T21:00:00Z'), '2026-07-26');
    // Midday UTC should stay on the same date
    assert.strictEqual(toRiyadhDateStr('2026-08-23T10:00:00Z'), '2026-08-23');
  });

  it('handles null, undefined, and empty string safely', () => {
    assert.strictEqual(toRiyadhDateStr(null), null);
    assert.strictEqual(toRiyadhDateStr(undefined), null);
    assert.strictEqual(toRiyadhDateStr(''), null);
    assert.strictEqual(toRiyadhDateStr('invalid-date'), null);
  });
});

