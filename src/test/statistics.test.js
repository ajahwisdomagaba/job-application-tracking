import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCreatedAtFilter,
  parseStatisticsQuery,
} from '../src/utils/statistics.js';

test('statistics query defaults to daily grouping', () => {
  const result = parseStatisticsQuery({});
  assert.equal(result.groupBy, 'day');
  assert.equal(result.from, undefined);
  assert.equal(result.to, undefined);
});

test('date-only to filter includes the full UTC day', () => {
  const { to } = parseStatisticsQuery({ to: '2026-10-13' });
  assert.equal(to.toISOString(), '2026-10-13T23:59:59.999Z');
});

test('statistics query rejects invalid ranges and groupings', () => {
  assert.throws(
    () => parseStatisticsQuery({ groupBy: 'year' }),
    /groupBy must be one of/,
  );
  assert.throws(
    () => parseStatisticsQuery({ from: '2026-10-14', to: '2026-10-13' }),
    /from must be earlier/,
  );
});

test('createdAt filter includes supplied boundaries', () => {
  const range = parseStatisticsQuery({
    from: '2026-10-01',
    to: '2026-10-13',
  });
  const filter = buildCreatedAtFilter(range);
  assert.equal(filter.$gte.toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(filter.$lte.toISOString(), '2026-10-13T23:59:59.999Z');
});
