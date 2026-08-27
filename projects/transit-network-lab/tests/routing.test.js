const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { analyzeNetworkReliability, computeRouteBundle, computeSegmentRiskIndex } = require('../transit-routing.js');

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

test('network reliability passes a fully redundant network', () => {
  const reliability = analyzeNetworkReliability(fixture);

  assert.equal(reliability.baselineConnectedPairCount, 15);
  assert.equal(reliability.criticalSegmentCount, 0);
  assert.equal(reliability.nMinusOnePass, true);
  assert.equal(reliability.minimumRetainedPairRatio, 1);
  assert.equal(reliability.segmentOutages.length, fixture.segments.length);
});

test('network reliability identifies the link with the largest service loss', () => {
  const reliability = analyzeNetworkReliability({
    stations: ['A', 'B', 'C', 'D', 'E'],
    segments: [
      { id: 'west-1', from: 'A', to: 'B', line: 'west', minutes: 2 },
      { id: 'west-2', from: 'A', to: 'B', line: 'relief', minutes: 3 },
      { id: 'trunk', from: 'B', to: 'C', line: 'trunk', minutes: 2 },
      { id: 'east-1', from: 'C', to: 'D', line: 'east', minutes: 2 },
      { id: 'east-2', from: 'D', to: 'E', line: 'east', minutes: 2 },
      { id: 'east-relief', from: 'C', to: 'E', line: 'relief', minutes: 4 }
    ]
  });

  assert.equal(reliability.baselineConnectedPairCount, 10);
  assert.equal(reliability.criticalSegmentCount, 1);
  assert.equal(reliability.nMinusOnePass, false);
  assert.deepEqual(reliability.worstOutage, {
    segmentId: 'trunk',
    from: 'B',
    to: 'C',
    retainedPairCount: 4,
    lostPairCount: 6,
    retainedPairRatio: 0.4,
  });
});

test('network reliability measures outages against existing service, not impossible pairs', () => {
  const reliability = analyzeNetworkReliability({
    stations: ['A', 'B', 'C', 'D'],
    segments: [
      { id: 'ab-1', from: 'A', to: 'B', line: 'one', minutes: 2 },
      { id: 'ab-2', from: 'A', to: 'B', line: 'two', minutes: 3 },
      { id: 'cd', from: 'C', to: 'D', line: 'three', minutes: 2 }
    ]
  });

  assert.equal(reliability.totalPossiblePairCount, 6);
  assert.equal(reliability.baselineConnectedPairCount, 2);
  assert.equal(reliability.baselineCoverageRatio, 1 / 3);
  assert.equal(reliability.baselineConnected, false);
  assert.equal(reliability.nMinusOnePass, false);
  assert.equal(reliability.criticalSegmentCount, 1);
  assert.equal(reliability.worstOutage.segmentId, 'cd');
  assert.equal(reliability.worstOutage.retainedPairRatio, 0.5);
});

test('a disconnected network cannot pass N-1 even when each component has redundant links', () => {
  const reliability = analyzeNetworkReliability({
    stations: ['A', 'B', 'C', 'D'],
    segments: [
      { id: 'ab-1', from: 'A', to: 'B', line: 'one', minutes: 2 },
      { id: 'ab-2', from: 'A', to: 'B', line: 'two', minutes: 3 },
      { id: 'cd-1', from: 'C', to: 'D', line: 'one', minutes: 2 },
      { id: 'cd-2', from: 'C', to: 'D', line: 'two', minutes: 3 }
    ]
  });

  assert.equal(reliability.baselineConnected, false);
  assert.equal(reliability.criticalSegmentCount, 0);
  assert.equal(reliability.servedPairsNMinusOnePass, true);
  assert.equal(reliability.nMinusOnePass, false);
});
