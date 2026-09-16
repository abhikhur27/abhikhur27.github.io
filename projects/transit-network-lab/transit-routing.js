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
  const DEFAULT_EQUAL_ROUTE_LIMIT = 16;
  const DEFAULT_CAPACITY_FEEDBACK_PASSES = 4;
  const FLOW_EPSILON = 1e-7;
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

  function computeEqualFastestRoutes(network, startId, endId, options = {}) {
    if (!startId || !endId || startId === endId) return [];

    const transferPenaltyMinutes = Number(options.transferPenaltyMinutes ?? TRANSFER_PENALTY_MINUTES);
    const routeLimit = Math.max(1, Math.floor(Number(options.equalRouteLimit) || DEFAULT_EQUAL_ROUTE_LIMIT));
    const adjacency = buildAdjacency(network, { ...options, includeRisk: false });
    if (!adjacency.has(startId) || !adjacency.has(endId)) return [];

    const startKey = stateKey(startId, null);
    const startMetrics = { minutes: 0, transfers: 0, distance: 0, riskExposure: 0 };
    const startScore = metricsToScore(startMetrics, 'fastest');
    const best = new Map([[startKey, startScore]]);
    const predecessors = new Map();
    const queue = [{ key: startKey, stationId: startId, line: null, metrics: startMetrics, score: startScore }];

    while (queue.length) {
      queue.sort((left, right) => compareScores([...left.score, left.key], [...right.score, right.key]));
      const current = queue.shift();
      const currentBest = best.get(current.key);
      if (!currentBest || compareScores(current.score, currentBest) > 0) continue;

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
        const incumbent = best.get(nextKey);
        const comparison = incumbent ? compareScores(nextScore, incumbent) : -1;
        const step = {
          prevKey: current.key,
          id: edge.id,
          from: edge.from,
          to: edge.to,
          line: edge.line,
          minutes: edge.minutes,
          distance: edge.distance,
          transferCost,
          terrainPenalty: edge.terrainPenalty,
          riskPenalty: 0,
        };

        if (!incumbent || comparison < 0) {
          best.set(nextKey, nextScore);
          predecessors.set(nextKey, [step]);
          queue.push({ key: nextKey, stationId: edge.to, line: edge.line, metrics: nextMetrics, score: nextScore });
        } else if (comparison === 0) {
          const entries = predecessors.get(nextKey) || [];
          const duplicate = entries.some(
            (entry) => entry.prevKey === step.prevKey && entry.id === step.id && entry.from === step.from && entry.to === step.to
          );
          if (!duplicate) predecessors.set(nextKey, [...entries, step]);
        }
      });
    }

    const endStates = [...best.entries()]
      .filter(([key]) => key.startsWith(`${endId}|`))
      .sort((left, right) => compareScores([...left[1], left[0]], [...right[1], right[0]]));
    if (!endStates.length) return [];
    const winningScore = endStates[0][1];
    const winningEndKeys = endStates.filter(([, score]) => compareScores(score, winningScore) === 0).map(([key]) => key);
    const routes = [];

    function collectRoutes(cursor, reversedSegments, visited) {
      if (routes.length >= routeLimit) return;
      if (cursor === startKey) {
        const routeSegments = [...reversedSegments].reverse();
        routes.push({
          startId,
          endId,
          objective: 'fastest',
          objectiveLabel: ROUTE_OBJECTIVES.fastest.label,
          totalMinutes: routeSegments.reduce((sum, segment) => sum + segment.minutes + segment.transferCost, 0),
          transferCount: routeSegments.reduce((sum, segment) => sum + (segment.transferCost > 0 ? 1 : 0), 0),
          stationPath: [startId, ...routeSegments.map((segment) => segment.to)],
          segments: routeSegments,
          totalDistance: routeSegments.reduce((sum, segment) => sum + segment.distance, 0),
          totalRiskExposure: 0,
        });
        return;
      }

      const entries = (predecessors.get(cursor) || [])
        .slice()
        .sort((left, right) =>
          compareScores(
            [left.id, left.from, left.to, left.line, left.prevKey],
            [right.id, right.from, right.to, right.line, right.prevKey]
          )
        );
      entries.forEach((step) => {
        if (routes.length >= routeLimit || visited.has(step.prevKey)) return;
        collectRoutes(step.prevKey, [...reversedSegments, step], new Set([...visited, step.prevKey]));
      });
    }

    winningEndKeys.forEach((key) => collectRoutes(key, [], new Set([key])));
    return routes.sort((left, right) => routeSignature(left).localeCompare(routeSignature(right))).slice(0, routeLimit);
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

  function normalizedDemandPairs(network, stationIds, options = {}) {
    const stationSet = new Set(stationIds);
    const source = Object.prototype.hasOwnProperty.call(options, 'demands') ? options.demands : network.demands;
    const demands = (Array.isArray(source) ? source : [])
      .map((demand, sourceIndex) => ({
        id: String(demand?.id || `demand-${sourceIndex + 1}`),
        from: String(demand?.from || ''),
        to: String(demand?.to || ''),
        riders: Number(demand?.riders),
      }))
      .filter(
        (demand) =>
          demand.from &&
          demand.to &&
          demand.from !== demand.to &&
          stationSet.has(demand.from) &&
          stationSet.has(demand.to) &&
          Number.isFinite(demand.riders) &&
          demand.riders > 0
      )
      .sort((left, right) =>
        compareScores(
          [left.id, left.from, left.to, left.riders],
          [right.id, right.from, right.to, right.riders]
        )
      );

    return demands.map((demand, index) => ({ ...demand, key: `${demand.id}|${index}` }));
  }

  function finiteSegmentCapacity(segment) {
    const capacity = Number(segment.capacity);
    return Number.isFinite(capacity) && capacity > 0 ? capacity : null;
  }

  function routeSignature(route) {
    return route.segments.map((segment) => segment.id).join('>');
  }

  function cloneAllocations(allocations) {
    return new Map(
      [...allocations].map(([demandKey, routes]) => [
        demandKey,
        new Map([...routes].map(([signature, allocation]) => [signature, { ...allocation }])),
      ])
    );
  }

  function segmentLoadsForAllocations(allocations) {
    const segmentLoads = new Map();
    allocations.forEach((routes) => {
      routes.forEach((allocation) => {
        if (allocation.riders <= FLOW_EPSILON) return;
        allocation.route.segments.forEach((segment) => {
          segmentLoads.set(segment.id, (segmentLoads.get(segment.id) || 0) + allocation.riders);
        });
      });
    });
    return segmentLoads;
  }

  function flowDifferenceRiders(initialRoutes, finalRoutes) {
    const signatures = new Set([...(initialRoutes?.keys() || []), ...(finalRoutes?.keys() || [])]);
    const totalDifference = [...signatures].reduce((sum, signature) => {
      const initialRiders = initialRoutes?.get(signature)?.riders || 0;
      const finalRiders = finalRoutes?.get(signature)?.riders || 0;
      return sum + Math.abs(initialRiders - finalRiders);
    }, 0);
    return totalDifference / 2;
  }

  function allocationResidualCapacity(route, sourceRoute, segmentLoads, capacityBySegment) {
    const sourceSegmentIds = new Set(sourceRoute.segments.map((segment) => segment.id));
    let residual = Number.POSITIVE_INFINITY;
    route.segments.forEach((segment) => {
      if (sourceSegmentIds.has(segment.id)) return;
      const capacity = capacityBySegment.get(segment.id);
      if (capacity === undefined) return;
      residual = Math.min(residual, Math.max(0, capacity - (segmentLoads.get(segment.id) || 0)));
    });
    return residual;
  }

  function applyDiversion(source, target, riders, segmentLoads) {
    if (riders <= FLOW_EPSILON) return;
    source.riders -= riders;
    target.riders += riders;
    source.route.segments.forEach((segment) => {
      segmentLoads.set(segment.id, Math.max(0, (segmentLoads.get(segment.id) || 0) - riders));
    });
    target.route.segments.forEach((segment) => {
      segmentLoads.set(segment.id, (segmentLoads.get(segment.id) || 0) + riders);
    });
  }

  function applyCapacityFeedback(network, demands, allocations, options = {}) {
    const excludedSegmentIds = normalizedIdSet(options.excludedSegmentIds);
    const transferPenaltyMinutes = Number(options.transferPenaltyMinutes ?? TRANSFER_PENALTY_MINUTES);
    const capacityFeedbackPassLimit = Math.max(
      0,
      Math.floor(Number(options.capacityFeedbackPasses ?? DEFAULT_CAPACITY_FEEDBACK_PASSES))
    );
    const capacityBySegment = new Map(
      (network.segments || [])
        .filter((segment) => !segment.blocked && !excludedSegmentIds.has(segment.id))
        .map((segment) => [segment.id, finiteSegmentCapacity(segment)])
        .filter(([, capacity]) => capacity !== null)
    );
    const demandByKey = new Map(demands.map((demand) => [demand.key, demand]));
    const segmentLoads = segmentLoadsForAllocations(allocations);
    let feedbackPassCount = 0;

    for (let pass = 0; pass < capacityFeedbackPassLimit; pass += 1) {
      const overloaded = [...capacityBySegment]
        .map(([segmentId, capacity]) => ({
          segmentId,
          capacity,
          overflow: Math.max(0, (segmentLoads.get(segmentId) || 0) - capacity),
        }))
        .filter((entry) => entry.overflow > FLOW_EPSILON)
        .sort((left, right) => right.overflow - left.overflow || left.segmentId.localeCompare(right.segmentId));
      if (!overloaded.length) break;

      let passMovedRiders = 0;
      overloaded.forEach((overload) => {
        let overflowRemaining = Math.max(0, (segmentLoads.get(overload.segmentId) || 0) - overload.capacity);
        if (overflowRemaining <= FLOW_EPSILON) return;

        const sourceAllocations = [];
        allocations.forEach((routes, demandKey) => {
          routes.forEach((allocation, signature) => {
            if (
              allocation.riders > FLOW_EPSILON &&
              allocation.route.segments.some((segment) => segment.id === overload.segmentId)
            ) {
              sourceAllocations.push({ demandKey, signature, allocation });
            }
          });
        });
        sourceAllocations.sort(
          (left, right) =>
            left.demandKey.localeCompare(right.demandKey) ||
            left.signature.localeCompare(right.signature)
        );

        sourceAllocations.forEach(({ demandKey, allocation }) => {
          if (overflowRemaining <= FLOW_EPSILON || allocation.riders <= FLOW_EPSILON) return;
          const demand = demandByKey.get(demandKey);
          if (!demand) return;
          const alternateExcluded = new Set(excludedSegmentIds);
          alternateExcluded.add(overload.segmentId);
          const alternateRoutes = computeEqualFastestRoutes(network, demand.from, demand.to, {
            excludedSegmentIds: alternateExcluded,
            transferPenaltyMinutes,
            equalRouteLimit: options.equalRouteLimit,
          }).filter((route) => routeSignature(route) !== routeSignature(allocation.route));
          if (!alternateRoutes.length) return;

          let sourceRemaining = Math.min(allocation.riders, overflowRemaining);
          let activeRoutes = alternateRoutes
            .map((route) => ({
              route,
              residual: allocationResidualCapacity(route, allocation.route, segmentLoads, capacityBySegment),
            }))
            .filter((entry) => entry.residual > FLOW_EPSILON)
            .sort((left, right) => routeSignature(left.route).localeCompare(routeSignature(right.route)));

          while (sourceRemaining > FLOW_EPSILON && activeRoutes.length) {
            const equalShare = sourceRemaining / activeRoutes.length;
            let roundMoved = 0;
            activeRoutes.forEach((entry) => {
              if (sourceRemaining <= FLOW_EPSILON) return;
              const move = Math.min(equalShare, entry.residual, sourceRemaining);
              if (move <= FLOW_EPSILON) return;
              const signature = routeSignature(entry.route);
              const demandAllocations = allocations.get(demandKey);
              if (!demandAllocations.has(signature)) {
                demandAllocations.set(signature, { route: entry.route, riders: 0 });
              }
              applyDiversion(allocation, demandAllocations.get(signature), move, segmentLoads);
              entry.residual -= move;
              sourceRemaining -= move;
              overflowRemaining -= move;
              roundMoved += move;
              passMovedRiders += move;
            });
            if (roundMoved <= FLOW_EPSILON) break;
            activeRoutes = activeRoutes.filter((entry) => entry.residual > FLOW_EPSILON);
          }
        });
      });

      if (passMovedRiders <= FLOW_EPSILON) break;
      feedbackPassCount += 1;
    }

    allocations.forEach((routes) => {
      routes.forEach((allocation, signature) => {
        if (allocation.riders <= FLOW_EPSILON) routes.delete(signature);
      });
    });
    return { segmentLoads, feedbackPassCount };
  }

  function analyzeDemandAssignment(network, demands, options = {}) {
    const excludedSegmentIds = normalizedIdSet(options.excludedSegmentIds);
    const transferPenaltyMinutes = Number(options.transferPenaltyMinutes ?? TRANSFER_PENALTY_MINUTES);
    const stationSet = new Set(
      (network.stations || []).map((station) => (typeof station === 'string' ? station : station.id)).filter(Boolean)
    );
    const allocations = new Map();
    let equalRouteSplitDemandPairCount = 0;

    demands.forEach((demand) => {
      const routes = computeEqualFastestRoutes(network, demand.from, demand.to, {
        excludedSegmentIds,
        transferPenaltyMinutes,
        equalRouteLimit: options.equalRouteLimit,
      });
      if (routes.length > 1) equalRouteSplitDemandPairCount += 1;
      const share = routes.length ? demand.riders / routes.length : 0;
      allocations.set(
        demand.key,
        new Map(routes.map((route) => [routeSignature(route), { route, riders: share }]))
      );
    });

    const initialAllocations = cloneAllocations(allocations);
    const { segmentLoads, feedbackPassCount } = applyCapacityFeedback(network, demands, allocations, {
      ...options,
      excludedSegmentIds,
      transferPenaltyMinutes,
    });
    const demandResults = new Map();
    let servedDemandRiders = 0;
    let passengerMinutes = 0;
    let capacityReroutedDemandRiders = 0;
    let capacityReroutedDemandPairCount = 0;

    demands.forEach((demand) => {
      const routes = [...(allocations.get(demand.key)?.values() || [])]
        .filter((allocation) => allocation.riders > FLOW_EPSILON)
        .sort(
          (left, right) =>
            right.riders - left.riders || routeSignature(left.route).localeCompare(routeSignature(right.route))
        );
      const assignedRiders = routes.reduce((sum, allocation) => sum + allocation.riders, 0);
      const weightedMinutes = routes.reduce(
        (sum, allocation) => sum + allocation.riders * allocation.route.totalMinutes,
        0
      );
      const reroutedRiders = flowDifferenceRiders(initialAllocations.get(demand.key), allocations.get(demand.key));
      if (reroutedRiders > FLOW_EPSILON) {
        capacityReroutedDemandPairCount += 1;
        capacityReroutedDemandRiders += reroutedRiders;
      }
      servedDemandRiders += assignedRiders;
      passengerMinutes += weightedMinutes;
      demandResults.set(demand.key, {
        demand,
        route: routes[0]?.route || null,
        routeShares: routes.map((allocation) => ({
          route: allocation.route,
          riders: allocation.riders,
          share: assignedRiders > 0 ? allocation.riders / assignedRiders : 0,
        })),
        assignedRiders,
        averageMinutes: assignedRiders > 0 ? weightedMinutes / assignedRiders : null,
        capacityReroutedRiders: reroutedRiders,
      });
    });

    const capacitySegments = (network.segments || [])
      .filter((segment) => !segment.blocked && !excludedSegmentIds.has(segment.id))
      .filter((segment) => stationSet.has(segment.from) && stationSet.has(segment.to))
      .map((segment) => ({ segment, capacity: finiteSegmentCapacity(segment) }))
      .filter((entry) => entry.capacity !== null);
    const overloadedSegments = capacitySegments
      .map(({ segment, capacity }) => {
        const load = segmentLoads.get(segment.id) || 0;
        return {
          segmentId: segment.id,
          from: segment.from,
          to: segment.to,
          load,
          capacity,
          overflowRiders: Math.max(0, load - capacity),
          utilizationRatio: load / capacity,
        };
      })
      .filter((entry) => entry.overflowRiders > 0)
      .sort(
        (left, right) =>
          right.overflowRiders - left.overflowRiders ||
          right.utilizationRatio - left.utilizationRatio ||
          left.segmentId.localeCompare(right.segmentId)
      );

    return {
      demandResults,
      segmentLoads,
      servedDemandRiders,
      lostDemandRiders: demands.reduce((sum, demand) => sum + demand.riders, 0) - servedDemandRiders,
      passengerMinutes,
      capacitySegmentCount: capacitySegments.length,
      overloadedSegments,
      overloadedSegmentCount: overloadedSegments.length,
      overflowRiderSegments: overloadedSegments.reduce((sum, entry) => sum + entry.overflowRiders, 0),
      maximumUtilizationRatio: capacitySegments.reduce((maximum, { segment, capacity }) => {
        const load = segmentLoads.get(segment.id) || 0;
        return Math.max(maximum, load / capacity);
      }, 0),
      equalRouteSplitDemandPairCount,
      capacityFeedbackPassCount: feedbackPassCount,
      capacityReroutedDemandPairCount,
      capacityReroutedDemandRiders,
    };
  }

  function assignPassengerDemand(network, options = {}) {
    const stationIds = [...new Set((network.stations || []).map((station) => (typeof station === 'string' ? station : station.id)))]
      .filter(Boolean)
      .sort((left, right) => String(left).localeCompare(String(right)));
    return analyzeDemandAssignment(network, normalizedDemandPairs(network, stationIds, options), options);
  }

  function compareDemandTravelTimes(baselineResult, outageResult) {
    if (!baselineResult?.route || baselineResult.assignedRiders <= FLOW_EPSILON) {
      return { lostRiders: 0, delayedRiders: 0, addedPassengerMinutes: 0 };
    }
    if (!outageResult?.route || outageResult.assignedRiders <= FLOW_EPSILON) {
      return {
        lostRiders: baselineResult.assignedRiders,
        delayedRiders: 0,
        addedPassengerMinutes: 0,
      };
    }

    const baselineBuckets = baselineResult.routeShares
      .map((allocation) => ({ minutes: allocation.route.totalMinutes, riders: allocation.riders }))
      .sort((left, right) => left.minutes - right.minutes);
    const outageBuckets = outageResult.routeShares
      .map((allocation) => ({ minutes: allocation.route.totalMinutes, riders: allocation.riders }))
      .sort((left, right) => left.minutes - right.minutes);
    let baselineIndex = 0;
    let outageIndex = 0;
    let baselineRemaining = baselineBuckets[0]?.riders || 0;
    let outageRemaining = outageBuckets[0]?.riders || 0;
    let delayedRiders = 0;
    let addedPassengerMinutes = 0;

    while (baselineIndex < baselineBuckets.length && outageIndex < outageBuckets.length) {
      const matchedRiders = Math.min(baselineRemaining, outageRemaining);
      const addedMinutes = Math.max(0, outageBuckets[outageIndex].minutes - baselineBuckets[baselineIndex].minutes);
      if (addedMinutes > 0 && matchedRiders > FLOW_EPSILON) {
        delayedRiders += matchedRiders;
        addedPassengerMinutes += matchedRiders * addedMinutes;
      }
      baselineRemaining -= matchedRiders;
      outageRemaining -= matchedRiders;
      if (baselineRemaining <= FLOW_EPSILON) {
        baselineIndex += 1;
        baselineRemaining = baselineBuckets[baselineIndex]?.riders || 0;
      }
      if (outageRemaining <= FLOW_EPSILON) {
        outageIndex += 1;
        outageRemaining = outageBuckets[outageIndex]?.riders || 0;
      }
    }

    return {
      lostRiders: Math.max(0, baselineResult.assignedRiders - outageResult.assignedRiders),
      delayedRiders,
      addedPassengerMinutes,
    };
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
    const demands = normalizedDemandPairs(network, stationIds, options);
    const totalDemandRiders = demands.reduce((sum, demand) => sum + demand.riders, 0);
    const baselineDemand = analyzeDemandAssignment(network, demands, {
      excludedSegmentIds: baseExcluded,
      transferPenaltyMinutes,
      equalRouteLimit: options.equalRouteLimit,
      capacityFeedbackPasses: options.capacityFeedbackPasses,
    });
    const baselineOverflowBySegment = new Map(
      baselineDemand.overloadedSegments.map((entry) => [entry.segmentId, entry.overflowRiders])
    );
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
      const outageDemand = analyzeDemandAssignment(network, demands, {
        excludedSegmentIds,
        transferPenaltyMinutes,
        equalRouteLimit: options.equalRouteLimit,
        capacityFeedbackPasses: options.capacityFeedbackPasses,
      });
      let retainedPairCount = 0;
      let delayedPairCount = 0;
      let totalAddedMinutes = 0;
      let maxAddedMinutes = 0;
      let worstDelayPair = null;
      let worstDelayPairKey = '';
      let lostDemandRiders = 0;
      let delayedDemandRiders = 0;
      let totalAddedPassengerMinutes = 0;

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

      baselineDemand.demandResults.forEach((baselineResult, key) => {
        if (!baselineResult.route) return;
        const outageResult = outageDemand.demandResults.get(key);
        const impact = compareDemandTravelTimes(baselineResult, outageResult);
        lostDemandRiders += impact.lostRiders;
        delayedDemandRiders += impact.delayedRiders;
        totalAddedPassengerMinutes += impact.addedPassengerMinutes;
      });

      const additionalOverflowRiderSegments = outageDemand.overloadedSegments.reduce((sum, entry) => {
        return sum + Math.max(0, entry.overflowRiders - (baselineOverflowBySegment.get(entry.segmentId) || 0));
      }, 0);
      const newlyOverloadedSegmentCount = outageDemand.overloadedSegments.filter(
        (entry) => !baselineOverflowBySegment.has(entry.segmentId)
      ).length;
      const capacityImpactSegmentCount = outageDemand.overloadedSegments.filter(
        (entry) => entry.overflowRiders > (baselineOverflowBySegment.get(entry.segmentId) || 0)
      ).length;

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
        affectedDemandRiders: lostDemandRiders + delayedDemandRiders,
        lostDemandRiders,
        delayedDemandRiders,
        totalAddedPassengerMinutes,
        overloadedSegmentCount: outageDemand.overloadedSegmentCount,
        newlyOverloadedSegmentCount,
        capacityImpactSegmentCount,
        overflowRiderSegments: outageDemand.overflowRiderSegments,
        additionalOverflowRiderSegments,
        maximumUtilizationRatio: outageDemand.maximumUtilizationRatio,
        overloadedSegments: outageDemand.overloadedSegments,
        equalRouteSplitDemandPairCount: outageDemand.equalRouteSplitDemandPairCount,
        capacityFeedbackPassCount: outageDemand.capacityFeedbackPassCount,
        capacityReroutedDemandPairCount: outageDemand.capacityReroutedDemandPairCount,
        capacityReroutedDemandRiders: outageDemand.capacityReroutedDemandRiders,
      };
    });

    const criticalOutages = segmentOutages.filter((outage) => outage.lostPairCount > 0);
    const worstConnectivityOutage = segmentOutages
      .slice()
      .sort(
        (left, right) =>
          right.lostPairCount - left.lostPairCount ||
          right.totalAddedMinutes - left.totalAddedMinutes ||
          right.maxAddedMinutes - left.maxAddedMinutes ||
          left.segmentId.localeCompare(right.segmentId)
      )[0] || null;
    const worstPassengerOutage = demands.length
      ? segmentOutages
          .slice()
          .sort(
            (left, right) =>
              right.affectedDemandRiders - left.affectedDemandRiders ||
              right.lostDemandRiders - left.lostDemandRiders ||
              right.additionalOverflowRiderSegments - left.additionalOverflowRiderSegments ||
              right.totalAddedPassengerMinutes - left.totalAddedPassengerMinutes ||
              right.maximumUtilizationRatio - left.maximumUtilizationRatio ||
              right.lostPairCount - left.lostPairCount ||
              right.totalAddedMinutes - left.totalAddedMinutes ||
              left.segmentId.localeCompare(right.segmentId)
          )[0] || null
      : null;
    const worstOutage = worstPassengerOutage || worstConnectivityOutage;
    const averageRetainedPairRatio = segmentOutages.length
      ? segmentOutages.reduce((sum, outage) => sum + outage.retainedPairRatio, 0) / segmentOutages.length
      : 1;
    const minimumRetainedPairRatio = segmentOutages.reduce(
      (minimum, outage) => Math.min(minimum, outage.retainedPairRatio),
      1
    );

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
      minimumRetainedPairRatio,
      maximumAverageDelayMinutes: segmentOutages.reduce(
        (maximum, outage) => Math.max(maximum, outage.averageDelayMinutes),
        0
      ),
      averageRetainedPairRatio,
      hasDemandModel: demands.length > 0,
      demandPairCount: demands.length,
      totalDemandRiders,
      baselineServedDemandRiders: baselineDemand.servedDemandRiders,
      baselineLostDemandRiders: baselineDemand.lostDemandRiders,
      baselinePassengerMinutes: baselineDemand.passengerMinutes,
      capacitySegmentCount: baselineDemand.capacitySegmentCount,
      baselineOverloadedSegmentCount: baselineDemand.overloadedSegmentCount,
      baselineOverflowRiderSegments: baselineDemand.overflowRiderSegments,
      baselineMaximumUtilizationRatio: baselineDemand.maximumUtilizationRatio,
      baselineOverloadedSegments: baselineDemand.overloadedSegments,
      baselineEqualRouteSplitDemandPairCount: baselineDemand.equalRouteSplitDemandPairCount,
      baselineCapacityFeedbackPassCount: baselineDemand.capacityFeedbackPassCount,
      baselineCapacityReroutedDemandPairCount: baselineDemand.capacityReroutedDemandPairCount,
      baselineCapacityReroutedDemandRiders: baselineDemand.capacityReroutedDemandRiders,
      worstConnectivityOutage,
      worstPassengerOutage,
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
    assignPassengerDemand,
    computeEqualFastestRoutes,
    computeRoute,
    computeRouteBundle,
    computeSegmentRiskIndex,
  };
});
