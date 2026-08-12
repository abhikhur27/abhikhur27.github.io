# Transit Network Lab

Interactive transit network editor with policy-aware routing and outage tradeoff analysis.

## Features

- Drag-and-drop stop positions with live route recomputation.
- Policy-aware routing for fastest, fewer-transfer, or most resilient trip plans.
- Resilience brief that measures cumulative closure exposure, strongest fallback path, and weakest route segment for the current trip.
- Add new stops.
- Add custom line segments with configurable color and speed.
- Route metrics (time, stops, transfers) update in real time.
- Optimization mode with challenge goals and persistent score.

## Local run

```bash
python -m http.server 8000
```

Open `projects/transit-network-lab/index.html`.
