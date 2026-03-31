# Queueing Resilience Lab

Static queueing-systems explainer and simulator for portfolio use.

## What It Does

- Models a simple single-server system using arrival rate, service rate, burst multiplier, and staffing slack.
- Shows utilization, expected wait, queue length, and a qualitative risk band.
- Includes a 12-step demand curve so visitors can see when a system crosses from healthy to unstable.

## Why It Fits The Portfolio

- Turns operations-research concepts into an interactive browser lab.
- Stays fully static and GitHub Pages compatible.
- Pairs well with the scheduling, transit, and systems-simulation projects already in this portfolio.

## Local Run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/queueing-resilience-lab/`.
