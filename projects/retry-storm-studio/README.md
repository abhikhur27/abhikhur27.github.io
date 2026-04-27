# Retry Storm Studio

Static resilience sandbox for modeling how retry policy turns one unstable dependency into either a contained incident or a self-inflicted load storm.

## Features

- Presets for login spike, mobile reconnect, and payment timeout scenarios.
- Retry controls for request volume, base failure rate, retry count, fanout, overlap, jitter, idempotency, and circuit-breaking.
- Amplification board for expected attempts, peak load multiplier, and estimated duplicate writes.
- Control stack board that calls out which mitigation is doing the most work.
- Action plan with rollout guidance based on the current posture.
- Copyable report and shareable URL state.

## Local Run

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## GitHub Pages Compatibility

- Static HTML, CSS, and JavaScript only.
- No build step.
- Relative assets only.
