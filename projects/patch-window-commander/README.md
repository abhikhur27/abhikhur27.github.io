# Patch Window Commander

Decision-based static project about running a fragile campus patch night under competing pressures.

## Core idea

You are not just clicking through infrastructure cards. You are trading off:

- security exposure
- user trust
- crew fatigue
- patch backlog

Each maintenance window forces a stance on risk. The project is designed to feel more like a command decision than a dashboard.

## What the experience includes

- Four scenario windows with three choices each
- Persistent score model across the full run
- Decision log that records the consequence of each choice
- Final command brief based on how the run balanced security, uptime, and operator sustainability

## Files

- `index.html`: scenario shell and command board layout
- `styles.css`: static visual system for the operations-lab presentation
- `script.js`: scenario engine, score updates, and final evaluation logic

## Local run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/patch-window-commander/`.
