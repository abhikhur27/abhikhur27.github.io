# Transit Network Lab

Interactive transit systems editor and optimization playground.

## Features

- Drag-and-drop stop positions with live route recomputation.
- Dynamic transfer-aware shortest-path routing.
- Add new stops.
- Add custom line segments with configurable color and speed.
- Route metrics (time, stops, transfers) update in real time.
- Optimization mode with challenge goals and persistent score.

## Local run

```bash
python -m http.server 8000
```

Open `projects/transit-network-lab/index.html`.