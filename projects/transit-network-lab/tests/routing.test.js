const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { computeRouteBundle, computeSegmentRiskIndex } = require('../transit-routing.js');

const fixturePath = path.join(__dirname, 'fixtures', 'policy-network.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const riskIndex = new Map(fixture.segments.map((segment) => [segment.id, { closurePenalty: segment.closurePenalty }]));

function segmentIds(route) {
  return route.segments.map((segment) => segment.id);
}

test('each routing objective selects its intended operational tradeoff', () => {
  const bundle = computeRouteBundle(fixture, 'A', 'D', { riskIndex });

  assert.deepEqual(segmentIds(bundle.fastest), ['fast-1', 'fast-2']);
  assert.deepEqual(
    { minutes: bundle.fastest.totalMinutes, transfers: bundle.fastest.transferCount, exposure: bundle.fastest.totalRiskExposure },
    { minutes: 6, transfers: 1, exposure: 20 }
  );

  assert.deepEqual(segmentIds(bundle.transfers), ['steady-1', 'steady-2']);
  assert.deepEqual(
    { minutes: bundle.transfers.totalMinutes, transfers: bundle.transfers.transferCount, exposure: bundle.transfers.totalRiskExposure },
    { minutes: 8, transfers: 0, exposure: 10 }
  );

  assert.deepEqual(segmentIds(bundle.resilient), ['safe-1', 'safe-2', 'safe-3']);
  assert.deepEqual(
    { minutes: bundle.resilient.totalMinutes, transfers: bundle.resilient.transferCount, exposure: bundle.resilient.totalRiskExposure },
    { minutes: 9, transfers: 0, exposure: 0 }
  );
});

test('closures recompute each policy onto the correct surviving corridor', () => {
  const fastestAfterClosure = computeRouteBundle(fixture, 'A', 'D', {
    objective: 'fastest',
    excludedSegmentIds: new Set(['fast-2']),
    riskIndex,
  });
  assert.deepEqual(segmentIds(fastestAfterClosure.activeRoute), ['steady-1', 'steady-2']);

  const transfersAfterClosure = computeRouteBundle(fixture, 'A', 'D', {
    objective: 'transfers',
    excludedSegmentIds: new Set(['steady-2']),
    riskIndex,
  });
  assert.deepEqual(segmentIds(transfersAfterClosure.activeRoute), ['safe-1', 'safe-2', 'safe-3']);

  const resilientAfterClosure = computeRouteBundle(fixture, 'A', 'D', {
    objective: 'resilient',
    excludedSegmentIds: new Set(['safe-2']),
    riskIndex,
  });
  assert.deepEqual(segmentIds(resilientAfterClosure.activeRoute), ['steady-1', 'steady-2']);
});

test('routing remains deterministic when input segment order changes', () => {
  const reversed = { ...fixture, segments: [...fixture.segments].reverse() };
  const original = computeRouteBundle(fixture, 'A', 'D', { riskIndex });
  const reordered = computeRouteBundle(reversed, 'A', 'D', { riskIndex });

  ['fastest', 'transfers', 'resilient'].forEach((objective) => {
    assert.deepEqual(segmentIds(reordered[objective]), segmentIds(original[objective]));
  });
});

test('closure exposure distinguishes a bridge from a segment with a fallback', () => {
  const bridgeNetwork = {
    stations: ['A', 'B', 'C'],
    segments: [
      { id: 'bridge', from: 'A', to: 'B', line: 'one', minutes: 3, distance: 3 },
      { id: 'direct', from: 'B', to: 'C', line: 'one', minutes: 3, distance: 3 },
      { id: 'fallback-1', from: 'B', to: 'A', line: 'two', minutes: 4, distance: 4 },
      { id: 'fallback-2', from: 'A', to: 'C', line: 'two', minutes: 4, distance: 4 }
    ]
  };
  const exposure = computeSegmentRiskIndex(bridgeNetwork);

  assert.deepEqual(exposure.get('direct'), { closurePenalty: 5, disconnected: false });

  const isolated = computeSegmentRiskIndex({
    stations: ['A', 'B'],
    segments: [{ id: 'only-link', from: 'A', to: 'B', line: 'one', minutes: 3, distance: 3 }],
  });
  assert.deepEqual(isolated.get('only-link'), { closurePenalty: 21, disconnected: true });
});
