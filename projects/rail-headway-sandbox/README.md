# Rail Headway Sandbox

Interactive corridor simulation for rail service design tradeoffs.

## Features

- Tune line length, fleet size, average speed, and dwell time.
- Real-time estimates for:
  - Round trip time
  - Headway
  - Expected wait
  - Trains per hour
  - Passenger capacity per hour per direction
- Challenge mode with target wait/capacity constraints.

## Local run

```bash
python -m http.server 8000
```

Open `projects/rail-headway-sandbox/index.html`.