# Transit Network Planner

Interactive transit network editor with policy-aware routing and deterministic, passenger-weighted single-link failure analysis.

## Features

- Drag-and-drop stop positions with live route recomputation.
- Policy-aware routing for fastest, fewer-transfer, or most resilient trip plans.
- Network-wide N-1 reliability check that measures connectivity loss and added all-pairs journey time for every single-link outage.
- Peak origin-destination demand assignment with equal-time path splitting, per-link capacity, deterministic overflow diversion, stranded-rider counts, passenger-minute delay, and remaining overload detection.
- Route reliability brief that measures cumulative closure exposure, strongest fallback path, and weakest route segment for the current trip.
- Add new stops.
- Add custom line segments with configurable color and speed.
- Route metrics (time, stops, transfers) update in real time.
- Dragging keeps route updates live and refreshes the heavier all-pairs outage analysis on pointer-up.
- Deterministic routing and reliability fixtures that prove the three policies diverge, equal paths share demand, saturated shortest paths use viable relief capacity, and connectivity risk stays distinct from the outage that affects the most modeled riders.

The bundled city includes six peak demand pairs. Demand splits evenly across up to 16 equal fastest itineraries, then a bounded four-pass feedback step moves only overflow riders to the fastest alternate paths with residual capacity. The line legend shows the passenger capacity applied to each link. Generated test networks receive a smaller synthetic demand set and bounded default capacities.

The passenger-worst outage ranks affected riders first, then stranded riders, incremental over-capacity rider-segments, and added passenger-minutes after the same assignment feedback. The engine also retains the separate topology-worst outage so connectivity and demand conclusions remain auditable instead of being collapsed into one score. This is a deterministic stress model, not a calibrated ridership forecast or full equilibrium assignment.

## Verification

```bash
npm run check
npm test
```

GitHub Actions runs the same contracts on Node 20 and Node 22 whenever the project or its workflow changes.

## Local run

```bash
python -m http.server 8000
```

Open `projects/transit-network-lab/index.html`.
