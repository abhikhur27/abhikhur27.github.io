# Probe Budget Lab

Static telemetry strategy game about placing a limited probe budget before an incident unfolds.

## Core Mechanic

- You get three probes across a six-service graph.
- After placing them, the incident runs and only instrumented services emit useful signals.
- You then choose the likely culprit and the best next mitigation.

## Why It Exists

Most observability discussions stop at "add more telemetry." This project argues that the real question is which signals change the operator's next move when attention is scarce.

## Included Scenarios

- Token refresh storm
- Poison-job backlog
- Replica drift after a cache flush

## Technical Notes

- Static HTML/CSS/JS only
- No backend or build pipeline
- Safe for GitHub Pages

## Local Run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/probe-budget-lab/`.
