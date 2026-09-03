# Transit Network Planner

Interactive transit network editor with policy-aware routing and deterministic single-link failure analysis.

## Features

- Drag-and-drop stop positions with live route recomputation.
- Policy-aware routing for fastest, fewer-transfer, or most resilient trip plans.
- Network-wide N-1 reliability check that measures connectivity loss and added all-pairs journey time for every single-link outage.
- Route reliability brief that measures cumulative closure exposure, strongest fallback path, and weakest route segment for the current trip.
- Add new stops.
- Add custom line segments with configurable color and speed.
- Route metrics (time, stops, transfers) update in real time.
- Dragging keeps route updates live and refreshes the heavier all-pairs outage analysis on pointer-up.
- Deterministic routing and reliability fixtures that prove the three policies diverge, recompute correctly after closures, and distinguish a survivable but disruptive outage from a true network cut.

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
