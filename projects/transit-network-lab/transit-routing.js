(function exposeTransitRouting(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.TransitRouting = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createTransitRouting() {
  const TRANSFER_PENALTY_MINUTES = 2;
  const DISCONNECTED_PENALTY_MINUTES = 18;
  const ROUTE_OBJECTIVES = Object.freeze({
    fastest: { label: 'Fastest', sortKey: ['minutes', 'transfers', 'riskExposure', 'distance'] },
    transfers: { label: 'Fewer transfers', sortKey: ['transfers', 'minutes', 'riskExposure', 'distance'] },
    resilient: { label: 'Most resilient', sortKey: ['riskExposure', 'minutes', 'transfers', 'distance'] },
  });

  function normalizedObjective(objective) {
    return ROUTE_OBJECTIVES[objective] ? objective : 'fastest';
  }

  function normalizedIdSet(values) {
    if (values instanceof Set) return values;
    return new Set(values || []);
  }

  function compareValues(left, right) {
    if (typeof left === 'string' || typeof right === 'string') {
      return String(left).localeCompare(String(right));
    }
    return (left || 0) - (right || 0);
  }

  function compareScores(left, right) {
    for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
      const delta = compareValues(left[index], right[index]);
      if (delta !== 0) return delta;
    }
    return 0;
  }

  function metricsToScore(metrics, objective) {
    return ROUTE_OBJECTIVES[normalizedObjective(objective)].sortKey.map((field) => metrics[field]);
  }

  function stateKey(stationId, line) {
    return `${stationId}|${line || 'none'}`;
  }

  function riskEntry(riskIndex, segment) {
    if (riskIndex instanceof Map && riskIndex.has(segment.id)) return riskIndex.get(segment.id);
    if (riskIndex && Object.prototype.hasOwnProperty.call(riskIndex, segment.id)) return riskIndex[segment.id];
    return null;
  }

  function buildAdjacency(network, options = {}) {
    const excludedSegmentIds = normalizedIdSet(options.excludedSegmentIds);
    const riskIndex = options.riskIndex || new Map();
    const adjacency = new Map((network.stations || []).map((station) => [typeof station === 'string' ? station : station.id, []]));

    (network.segments || []).forEach((segment) => {
      if (segment.blocked || excludedSegmentIds.has(segment.id)) return;
      if (!adjacency.has(segment.from) || !adjacency.has(segment.to)) return;

      const risk = riskEntry(riskIndex, segment);
      const shared = {
        id: segment.id,
        line: segment.line,
        minutes: Number(segment.minutes) || 0,
        distance: Number(segment.distance) || 0,
        terrainPenalty: Number(segment.terrainPenalty) || 0,
        riskPenalty: options.includeRisk === false ? 0 : Number(risk?.closurePenalty ?? segment.closurePenalty) || 0,
      };

      adjacency.get(segment.from).push({ ...shared, from: segment.from, to: segment.to });
      adjacency.get(segment.to).push({ ...shared, from: segment.to, to: segment.from });
    });

    adjacency.forEach((neighbors) => {
      neighbors.sort((left, right) =>
        compareScores(
          [left.id, left.to, left.line],
          [right.id, right.to, right.line]
        )
      );
    });
    return adjacency;
  }

  function computeRouteCore(network, startId, endId, options = {}) {
    if (!startId || !endId || startId === endId) return null;

    const objective = normalizedObjective(options.objective);
    const transferPenaltyMinutes = Number(options.transferPenaltyMinutes ?? TRANSFER_PENALTY_MINUTES);
    const adjacency = buildAdjacency(network, options);
    if (!adjacency.has(startId) || !adjacency.has(endId)) return null;

    const startKey = stateKey(startId, null);
    const startMetrics = { minutes: 0, transfers: 0, distance: 0, riskExposure: 0 };
    const startScore = metricsToScore(startMetrics, objective);
    const best = new Map([[startKey, { score: startScore, pathKey: '' }]]);
    const previous = new Map();
    const queue = [{ key: startKey, stationId: startId, line: null, score: startScore, metrics: startMetrics, pathKey: '' }];
    let bestEndState = null;

    while (queue.length) {
      queue.sort((left, right) => compareScores([...left.score, left.pathKey, left.key], [...right.score, right.pathKey, right.key]));
      const current = queue.shift();
      const currentBest = best.get(current.key);
      if (!currentBest || compareScores([...current.score, current.pathKey], [...currentBest.score, currentBest.pathKey]) > 0) continue;

      if (current.stationId === endId) {
        bestEndState = current;
        break;
      }

      (adjacency.get(current.stationId) || []).forEach((edge) => {
        const transferCost = current.line && current.line !== edge.line ? transferPenaltyMinutes : 0;
        const nextMetrics = {
          minutes: current.metrics.minutes + edge.minutes + transferCost,
          transfers: current.metrics.transfers + (transferCost > 0 ? 1 : 0),
          distance: current.metrics.distance + edge.distance,
          riskExposure: current.metrics.riskExposure + edge.riskPenalty,
        };
        const nextScore = metricsToScore(nextMetrics, objective);
        const nextKey = stateKey(edge.to, edge.line);
        const nextPathKey = current.pathKey ? `${current.pathKey}>${edge.id}:${edge.to}` : `${edge.id}:${edge.to}`;
        const candidate = { score: nextScore, pathKey: nextPathKey };
        const incumbent = best.get(nextKey);

        if (!incumbent || compareScores([...candidate.score, candidate.pathKey], [...incumbent.score, incumbent.pathKey]) < 0) {
          best.set(nextKey, candidate);
          previous.set(nextKey, {
            prevKey: current.key,
            id: edge.id,
            from: edge.from,
            to: edge.to,
            line: edge.line,
            minutes: edge.minutes,
            distance: edge.distance,
            transferCost,
            terrainPenalty: edge.terrainPenalty,
            riskPenalty: edge.riskPenalty,
          });
          queue.push({ key: nextKey, stationId: edge.to, line: edge.line, score: nextScore, metrics: nextMetrics, pathKey: nextPathKey });
        }
      });
    }

    if (!bestEndState) return null;

    const routeSegments = [];
    let cursor = bestEndState.key;
    while (cursor !== startKey) {
      const step = previous.get(cursor);
      if (!step) return null;
      routeSegments.push(step);
      cursor = step.prevKey;
    }
    routeSegments.reverse();

    return {
      startId,
      endId,
      objective,
      objectiveLabel: ROUTE_OBJECTIVES[objective].label,
      totalMinutes: bestEndState.metrics.minutes,
      transferCount: bestEndState.metrics.transfers,
      stationPath: [startId, ...routeSegments.map((segment) => segment.to)],
      segments: routeSegments,
      totalDistance: bestEndState.metrics.distance,
      totalRiskExposure: bestEndState.metrics.riskExposure,
    };
  }

  function computeSegmentRiskIndex(network, options = {}) {
    const riskIndex = new Map();
    const baseExcluded = normalizedIdSet(options.excludedSegmentIds);
    const disconnectedPenaltyMinutes = Number(options.disconnectedPenaltyMinutes ?? DISCONNECTED_PENALTY_MINUTES);

    (network.segments || []).forEach((segment) => {
      if (segment.blocked || baseExcluded.has(segment.id)) return;
      const excludedSegmentIds = new Set(baseExcluded);
      excludedSegmentIds.add(segment.id);
      const alternate = computeRouteCore(network, segment.from, segment.to, {
        objective: 'fastest',
        excludedSegmentIds,
        includeRisk: false,
        transferPenaltyMinutes: options.transferPenaltyMinutes,
      });
      const directMinutes = Number(segment.minutes) || 0;

      if (!alternate) {
        riskIndex.set(segment.id, {
          closurePenalty: directMinutes + disconnectedPenaltyMinutes,
          disconnected: true,
        });
        return;
      }

      riskIndex.set(segment.id, {
        closurePenalty: Math.max(0, alternate.totalMinutes - directMinutes) + alternate.transferCount * 2,
        disconnected: false,
      });
    });
    return riskIndex;
  }

  function computeRoute(network, startId, endId, options = {}) {
    const includeRisk = options.includeRisk !== false;
    const riskIndex = includeRisk
      ? options.riskIndex || computeSegmentRiskIndex(network, options)
      : new Map();
    return computeRouteCore(network, startId, endId, { ...options, includeRisk, riskIndex });
  }

  function computeRouteBundle(network, startId, endId, options = {}) {
    const riskIndex = options.riskIndex || computeSegmentRiskIndex(network, options);
    const shared = { ...options, riskIndex };
    const fastest = computeRouteCore(network, startId, endId, { ...shared, objective: 'fastest' });
    const transfers = computeRouteCore(network, startId, endId, { ...shared, objective: 'transfers' });
    const resilient = computeRouteCore(network, startId, endId, { ...shared, objective: 'resilient' });
    const objective = normalizedObjective(options.objective);
    return { fastest, transfers, resilient, activeRoute: { fastest, transfers, resilient }[objective] };
  }

  function computeFastestTimes(adjacency, startId, transferPenaltyMinutes) {
    const startKey = stateKey(startId, null);
    const startMetrics = { minutes: 0, transfers: 0, distance: 0, riskExposure: 0 };
    const startScore = metricsToScore(startMetrics, 'fastest');
    const best = new Map([[startKey, { score: startScore, pathKey: '' }]]);
    const fastestByStation = new Map();
    const queue = [{ key: startKey, stationId: startId, line: null, metrics: startMetrics, score: startScore, pathKey: '' }];

    while (queue.length) {
      queue.sort((left, right) => compareScores([...left.score, left.pathKey, left.key], [...right.score, right.pathKey, right.key]));
      const current = queue.shift();
      const currentBest = best.get(current.key);
      if (!currentBest || compareScores([...current.score, current.pathKey], [...currentBest.score, currentBest.pathKey]) > 0) continue;

      const stationBest = fastestByStation.get(current.stationId);
      if (!stationBest || compareScores([...current.score, current.pathKey], [...stationBest.score, stationBest.pathKey]) < 0) {
        fastestByStation.set(current.stationId, {
          minutes: current.metrics.minutes,
          score: current.score,
          pathKey: current.pathKey,
        });
      }

      (adjacency.get(current.stationId) || []).forEach((edge) => {
        const transferCost = current.line && current.line !== edge.line ? transferPenaltyMinutes : 0;
        const nextMetrics = {
          minutes: current.metrics.minutes + edge.minutes + transferCost,
          transfers: current.metrics.transfers + (transferCost > 0 ? 1 : 0),
          distance: current.metrics.distance + edge.distance,
          riskExposure: 0,
        };
        const nextScore = metricsToScore(nextMetrics, 'fastest');
        const nextKey = stateKey(edge.to, edge.line);
        const nextPathKey = current.pathKey ? `${current.pathKey}>${edge.id}:${edge.to}` : `${edge.id}:${edge.to}`;
        const candidate = { score: nextScore, pathKey: nextPathKey };
        const incumbent = best.get(nextKey);

        if (!incumbent || compareScores([...candidate.score, candidate.pathKey], [...incumbent.score, incumbent.pathKey]) < 0) {
          best.set(nextKey, candidate);
          queue.push({
            key: nextKey,
            stationId: edge.to,
            line: edge.line,
            metrics: nextMetrics,
            score: nextScore,
            pathKey: nextPathKey,
          });
        }
      });
    }

    return new Map([...fastestByStation].map(([stationId, result]) => [stationId, result.minutes]));
  }

  function stationPairKey(left, right) {
    return JSON.stringify([String(left), String(right)]);
  }

  function computeJourneyTimeMatrix(adjacency, stationIds, transferPenaltyMinutes) {
    const journeys = new Map();
    stationIds.forEach((stationId, index) => {
      const fastestTimes = computeFastestTimes(adjacency, stationId, transferPenaltyMinutes);
      for (let otherIndex = index + 1; otherIndex < stationIds.length; otherIndex += 1) {
        const otherId = stationIds[otherIndex];
        const minutes = fastestTimes.get(otherId);
        if (minutes === undefined) continue;
        journeys.set(stationPairKey(stationId, otherId), {
          from: stationId,
          to: otherId,
          minutes,
        });
      }
    });
    return journeys;
  }

  function analyzeNetworkReliability(network, options = {}) {
    const baseExcluded = normalizedIdSet(options.excludedSegmentIds);
    const transferPenaltyMinutes = Number(options.transferPenaltyMinutes ?? TRANSFER_PENALTY_MINUTES);
    const stationIds = [...new Set((network.stations || []).map((station) => (typeof station === 'string' ? station : station.id)))]
      .filter(Boolean)
      .sort((left, right) => String(left).localeCompare(String(right)));
    const totalPossiblePairCount = (stationIds.length * (stationIds.length - 1)) / 2;
    const baselineAdjacency = buildAdjacency(network, { ...options, excludedSegmentIds: baseExcluded, includeRisk: false });
    const baselineJourneys = computeJourneyTimeMatrix(baselineAdjacency, stationIds, transferPenaltyMinutes);
    const baselineConnectedPairCount = baselineJourneys.size;
    const baselineTotalJourneyMinutes = [...baselineJourneys.values()].reduce((sum, journey) => sum + journey.minutes, 0);
    const activeSegments = (network.segments || [])
      .filter((segment) => !segment.blocked && !baseExcluded.has(segment.id))
      .filter((segment) => baselineAdjacency.has(segment.from) && baselineAdjacency.has(segment.to))
      .slice()
      .sort((left, right) => String(left.id).localeCompare(String(right.id)));

    const segmentOutages = activeSegments.map((segment) => {
      const excludedSegmentIds = new Set(baseExcluded);
      excludedSegmentIds.add(segment.id);
      const outageAdjacency = buildAdjacency(network, { ...options, excludedSegmentIds, includeRisk: false });
      const outageJourneys = computeJourneyTimeMatrix(outageAdjacency, stationIds, transferPenaltyMinutes);
      let retainedPairCount = 0;
      let delayedPairCount = 0;
      let totalAddedMinutes = 0;
      let maxAddedMinutes = 0;
      let worstDelayPair = null;
      let worstDelayPairKey = '';

      baselineJourneys.forEach((baseline, key) => {
        const outage = outageJourneys.get(key);
        if (!outage) return;
        retainedPairCount += 1;
        const addedMinutes = Math.max(0, outage.minutes - baseline.minutes);
        if (addedMinutes <= 0) return;
        delayedPairCount += 1;
        totalAddedMinutes += addedMinutes;
        if (
          !worstDelayPair ||
          addedMinutes > worstDelayPair.addedMinutes ||
          (addedMinutes === worstDelayPair.addedMinutes && key.localeCompare(worstDelayPairKey) < 0)
        ) {
          maxAddedMinutes = addedMinutes;
          worstDelayPairKey = key;
          worstDelayPair = {
            from: baseline.from,
            to: baseline.to,
            baselineMinutes: baseline.minutes,
            outageMinutes: outage.minutes,
            addedMinutes,
          };
        }
      });

      const lostPairCount = Math.max(0, baselineConnectedPairCount - retainedPairCount);
      return {
        segmentId: segment.id,
        from: segment.from,
        to: segment.to,
        retainedPairCount,
        lostPairCount,
        retainedPairRatio: baselineConnectedPairCount > 0 ? retainedPairCount / baselineConnectedPairCount : 1,
        delayedPairCount,
        affectedPairCount: lostPairCount + delayedPairCount,
        totalAddedMinutes,
        averageAddedMinutes: retainedPairCount > 0 ? totalAddedMinutes / retainedPairCount : 0,
        averageDelayMinutes: delayedPairCount > 0 ? totalAddedMinutes / delayedPairCount : 0,
        maxAddedMinutes,
        worstDelayPair,
      };
    });

    const criticalOutages = segmentOutages.filter((outage) => outage.lostPairCount > 0);
    const worstOutage = segmentOutages
      .slice()
      .sort(
        (left, right) =>
          right.lostPairCount - left.lostPairCount ||
          right.totalAddedMinutes - left.totalAddedMinutes ||
          right.maxAddedMinutes - left.maxAddedMinutes ||
          left.segmentId.localeCompare(right.segmentId)
      )[0] || null;
    const averageRetainedPairRatio = segmentOutages.length
      ? segmentOutages.reduce((sum, outage) => sum + outage.retainedPairRatio, 0) / segmentOutages.length
      : 1;

    return {
      stationCount: stationIds.length,
      activeSegmentCount: activeSegments.length,
      totalPossiblePairCount,
      baselineConnectedPairCount,
      baselineTotalJourneyMinutes,
      baselineCoverageRatio: totalPossiblePairCount > 0 ? baselineConnectedPairCount / totalPossiblePairCount : 1,
      baselineConnected: baselineConnectedPairCount === totalPossiblePairCount,
      criticalSegmentCount: criticalOutages.length,
      serviceImpactSegmentCount: segmentOutages.filter((outage) => outage.affectedPairCount > 0).length,
      servedPairsNMinusOnePass: criticalOutages.length === 0,
      nMinusOnePass: baselineConnectedPairCount === totalPossiblePairCount && criticalOutages.length === 0,
      minimumRetainedPairRatio: worstOutage ? worstOutage.retainedPairRatio : 1,
      maximumAverageDelayMinutes: segmentOutages.reduce(
        (maximum, outage) => Math.max(maximum, outage.averageDelayMinutes),
        0
      ),
      averageRetainedPairRatio,
      worstOutage,
      segmentOutages,
    };
  }

  return {
    DISCONNECTED_PENALTY_MINUTES,
    ROUTE_OBJECTIVES,
    TRANSFER_PENALTY_MINUTES,
    compareScores,
    analyzeNetworkReliability,
    computeRoute,
    computeRouteBundle,
    computeSegmentRiskIndex,
  };
});
