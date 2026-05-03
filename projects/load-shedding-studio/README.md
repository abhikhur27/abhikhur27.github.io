# Load Shedding Studio

Static reliability strategy game about graceful degradation during demand spikes.

## Core idea

- Each wave presents three service lanes with different criticality, visibility, and elasticity.
- You allocate `protect`, `degrade`, and `comms` tokens.
- The outcome model turns those choices into trust, uptime, and burn-rate movement.

## Why it fits the portfolio

- Shows systems thinking without requiring a backend.
- Frames graceful degradation as a product and communication problem, not just a capacity problem.
- Produces a short decision log that makes the tradeoffs demo-friendly.

## Run locally

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/load-shedding-studio/`.
