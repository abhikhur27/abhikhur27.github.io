const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  analyzeNetworkReliability,
  assignPassengerDemand,
  computeEqualFastestRoutes,
  computeRoute,
  computeRouteBundle,
  computeSegmentRiskIndex,
} = require('../transit-routing.js');

const fixturePath = path.join(__dirname, 'fixtures', 'policy-network.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const passengerFixturePath = path.join(__dirname, 'fixtures', 'passenger-capacity-network.json');
const passengerFixture = JSON.parse(fs.readFileSync(passengerFixturePath, 'utf8'));
const feedbackFixturePath = path.join(__dirname, 'fixtures', 'capacity-feedback-network.json');
const feedbackFixture = JSON.parse(fs.readFileSync(feedbackFixturePath, 'utf8'));
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

test('equal fastest routes split passenger demand without depending on segment order', () => {
  const routeSet = computeEqualFastestRoutes(feedbackFixture.equalSplit, 'A', 'D');
  assert.deepEqual(routeSet.map(segmentIds), [
    ['blue-1', 'blue-2'],
    ['green-1', 'green-2'],
  ]);

  const assignment = assignPassengerDemand(feedbackFixture.equalSplit);
  assert.equal(assignment.equalRouteSplitDemandPairCount, 1);
  assert.equal(assignment.capacityReroutedDemandRiders, 0);
  assert.equal(assignment.overloadedSegmentCount, 0);
  assert.deepEqual(
    [...assignment.segmentLoads].sort(([left], [right]) => left.localeCompare(right)),
    [
      ['blue-1', 60],
      ['blue-2', 60],
      ['green-1', 60],
      ['green-2', 60],
    ]
  );

  const reordered = assignPassengerDemand({
    ...feedbackFixture.equalSplit,
    segments: [...feedbackFixture.equalSplit.segments].reverse(),
  });
  assert.deepEqual(
    [...reordered.segmentLoads].sort(([left], [right]) => left.localeCompare(right)),
    [...assignment.segmentLoads].sort(([left], [right]) => left.localeCompare(right))
  );
});

test('capacity feedback diverts only overflow riders onto the fastest viable relief route', () => {
  const unmanaged = assignPassengerDemand(feedbackFixture.capacityFeedback, { capacityFeedbackPasses: 0 });
  const assignment = assignPassengerDemand(feedbackFixture.capacityFeedback);
  const demandResult = [...assignment.demandResults.values()][0];

  assert.equal(unmanaged.overloadedSegmentCount, 2);
  assert.equal(unmanaged.overflowRiderSegments, 80);
  assert.equal(unmanaged.capacityReroutedDemandRiders, 0);
  assert.equal(assignment.capacityFeedbackPassCount, 1);
  assert.equal(assignment.capacityReroutedDemandPairCount, 1);
  assert.equal(assignment.capacityReroutedDemandRiders, 40);
  assert.equal(assignment.overloadedSegmentCount, 0);
  assert.equal(assignment.passengerMinutes, 560);
  assert.deepEqual(
    [...assignment.segmentLoads].sort(([left], [right]) => left.localeCompare(right)),
    [
      ['rapid-1', 80],
      ['rapid-2', 80],
      ['relief-1', 40],
      ['relief-2', 40],
    ]
  );
  assert.deepEqual(
    demandResult.routeShares.map((allocation) => ({
      route: segmentIds(allocation.route),
      riders: allocation.riders,
    })),
    [
      { route: ['rapid-1', 'rapid-2'], riders: 80 },
      { route: ['relief-1', 'relief-2'], riders: 40 },
    ]
  );
  assert.equal(demandResult.averageMinutes, 560 / 120);

  const reliability = analyzeNetworkReliability(feedbackFixture.capacityFeedback);
  assert.equal(reliability.worstPassengerOutage.segmentId, 'rapid-1');
  assert.equal(reliability.worstPassengerOutage.delayedDemandRiders, 80);
  assert.equal(reliability.worstPassengerOutage.totalAddedPassengerMinutes, 160);
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
  assert.equal(reliability.baselineTotalJourneyMinutes, 79);
  assert.equal(reliability.criticalSegmentCount, 0);
  assert.equal(reliability.nMinusOnePass, true);
  assert.equal(reliability.minimumRetainedPairRatio, 1);
  assert.equal(reliability.segmentOutages.length, fixture.segments.length);
});

test('network reliability quantifies delay even when every outage preserves connectivity', () => {
  const reliability = analyzeNetworkReliability(fixture);
  let routeByRouteBaselineMinutes = 0;
  fixture.stations.forEach((from, index) => {
    fixture.stations.slice(index + 1).forEach((to) => {
      routeByRouteBaselineMinutes += computeRoute(fixture, from, to, {
        objective: 'fastest',
        includeRisk: false,
      }).totalMinutes;
    });
  });

  assert.equal(reliability.nMinusOnePass, true);
  assert.equal(reliability.baselineTotalJourneyMinutes, routeByRouteBaselineMinutes);
  assert.equal(reliability.serviceImpactSegmentCount, 7);
  assert.equal(reliability.worstOutage.segmentId, 'safe-2');
  assert.equal(reliability.worstOutage.lostPairCount, 0);
  assert.equal(reliability.worstOutage.delayedPairCount, 3);
  assert.equal(reliability.worstOutage.totalAddedMinutes, 23);
  assert.equal(reliability.worstOutage.averageDelayMinutes, 23 / 3);
  assert.deepEqual(reliability.worstOutage.worstDelayPair, {
    from: 'C',
    to: 'E',
    baselineMinutes: 3,
    outageMinutes: 16,
    addedMinutes: 13,
  });
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
  assert.equal(reliability.worstOutage.segmentId, 'trunk');
  assert.equal(reliability.worstOutage.from, 'B');
  assert.equal(reliability.worstOutage.to, 'C');
  assert.equal(reliability.worstOutage.retainedPairCount, 4);
  assert.equal(reliability.worstOutage.lostPairCount, 6);
  assert.equal(reliability.worstOutage.retainedPairRatio, 0.4);
  assert.equal(reliability.worstOutage.affectedPairCount, 6);
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
  assert.equal(reliability.serviceImpactSegmentCount, 2);
  assert.equal(reliability.servedPairsNMinusOnePass, true);
  assert.equal(reliability.nMinusOnePass, false);
});

test('passenger demand and relief capacity change which outage is operationally worst', () => {
  const unweighted = analyzeNetworkReliability({ ...passengerFixture, demands: [] });
  const reliability = analyzeNetworkReliability(passengerFixture);

  assert.equal(unweighted.worstOutage.segmentId, 'connector');
  assert.equal(reliability.worstConnectivityOutage.segmentId, 'connector');
  assert.equal(reliability.worstPassengerOutage.segmentId, 'high-direct');
  assert.equal(reliability.worstOutage.segmentId, 'high-direct');

  assert.deepEqual(
    {
      demandPairs: reliability.demandPairCount,
      demandRiders: reliability.totalDemandRiders,
      baselineServedRiders: reliability.baselineServedDemandRiders,
      baselineLostRiders: reliability.baselineLostDemandRiders,
      baselineOverloadedLinks: reliability.baselineOverloadedSegmentCount,
    },
    {
      demandPairs: 3,
      demandRiders: 196,
      baselineServedRiders: 196,
      baselineLostRiders: 0,
      baselineOverloadedLinks: 0,
    }
  );

  assert.deepEqual(
    {
      affectedRiders: reliability.worstPassengerOutage.affectedDemandRiders,
      delayedRiders: reliability.worstPassengerOutage.delayedDemandRiders,
      lostRiders: reliability.worstPassengerOutage.lostDemandRiders,
      addedPassengerMinutes: reliability.worstPassengerOutage.totalAddedPassengerMinutes,
      newOverloads: reliability.worstPassengerOutage.newlyOverloadedSegmentCount,
      capacityImpactLinks: reliability.worstPassengerOutage.capacityImpactSegmentCount,
      additionalOverflowRiderSegments: reliability.worstPassengerOutage.additionalOverflowRiderSegments,
    },
    {
      affectedRiders: 181,
      delayedRiders: 181,
      lostRiders: 0,
      addedPassengerMinutes: 362,
      newOverloads: 2,
      capacityImpactLinks: 2,
      additionalOverflowRiderSegments: 122,
    }
  );
  assert.deepEqual(
    reliability.worstPassengerOutage.overloadedSegments.map((segment) => ({
      id: segment.segmentId,
      load: segment.load,
      capacity: segment.capacity,
      overflow: segment.overflowRiders,
    })),
    [
      { id: 'high-relief-1', load: 181, capacity: 120, overflow: 61 },
      { id: 'high-relief-2', load: 181, capacity: 120, overflow: 61 },
    ]
  );

  const reordered = analyzeNetworkReliability({
    stations: [...passengerFixture.stations].reverse(),
    segments: [...passengerFixture.segments].reverse(),
    demands: [...passengerFixture.demands].reverse(),
  });
  assert.deepEqual(
    {
      passengerOutage: reordered.worstPassengerOutage.segmentId,
      connectivityOutage: reordered.worstConnectivityOutage.segmentId,
      affectedRiders: reordered.worstPassengerOutage.affectedDemandRiders,
      riderMinutes: reordered.worstPassengerOutage.totalAddedPassengerMinutes,
      overflow: reordered.worstPassengerOutage.additionalOverflowRiderSegments,
    },
    {
      passengerOutage: 'high-direct',
      connectivityOutage: 'connector',
      affectedRiders: 181,
      riderMinutes: 362,
      overflow: 122,
    }
  );
});
