# Transit Network Planner

Interactive transit network editor with policy-aware routing and deterministic single-link failure analysis.

## Features

- Drag-and-drop stop positions with live route recomputation.
- Policy-aware routing for fastest, fewer-transfer, or most resilient trip plans.
- Network-wide N-1 reliability check that measures how many served station pairs survive every single-link outage and identifies critical links.
- Route reliability brief that measures cumulative closure exposure, strongest fallback path, and weakest route segment for the current trip.
- Add new stops.
- Add custom line segments with configurable color and speed.
- Route metrics (time, stops, transfers) update in real time.
- Deterministic routing and reliability fixtures that prove the three policies diverge, recompute correctly after closures, and identify the outage with the largest service loss.

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
