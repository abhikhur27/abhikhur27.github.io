# Transit Network Planner

Interactive transit network editor with policy-aware routing and deterministic, passenger-weighted single-link failure analysis.

## Features

- Drag-and-drop stop positions with live route recomputation.
- Policy-aware routing for fastest, fewer-transfer, or most resilient trip plans.
- Network-wide N-1 reliability check that measures connectivity loss and added all-pairs journey time for every single-link outage.
- Peak origin-destination demand assignment with per-link capacity, stranded-rider counts, passenger-minute delay, and reroute overload detection.
- Route reliability brief that measures cumulative closure exposure, strongest fallback path, and weakest route segment for the current trip.
- Add new stops.
- Add custom line segments with configurable color and speed.
- Route metrics (time, stops, transfers) update in real time.
- Dragging keeps route updates live and refreshes the heavier all-pairs outage analysis on pointer-up.
- Deterministic routing and reliability fixtures that prove the three policies diverge, recompute correctly after closures, and distinguish connectivity risk from the outage that affects the most modeled riders.

The bundled city includes six peak demand pairs. Demand follows the deterministic fastest path, while the line legend shows the passenger capacity applied to each link. Generated test networks receive a smaller synthetic demand set and bounded default capacities.

The passenger-worst outage ranks affected riders first, then stranded riders, incremental over-capacity rider-segments, and added passenger-minutes. The engine also retains the separate topology-worst outage so connectivity and demand conclusions remain auditable instead of being collapsed into one score.

## Verification

```bash
npm run check
npm test
```

## Local run

```bash
python -m http.server 8000
```

Open `projects/transit-network-lab/index.html`.
