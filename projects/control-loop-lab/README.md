# Control Loop Lab

Static control-systems sandbox for thinking about delayed feedback in services, autoscaling, staffing, and queue-heavy product flows.

## What It Models

- Control gain: how aggressively the system reacts to measured backlog.
- Feedback delay: how stale the signal is before the controller acts.
- Damping: how much the system resists overcorrection.
- Burst multiplier: how hard demand spikes above baseline.
- Baseline demand and capacity: the steady-state operating point.

## Outputs

- Demand / capacity / queue trace over 20 steps.
- Peak queue and total queue spill.
- Capacity overshoot percentage.
- Settle step and oscillation count.
- Recovery score and utilization band.
- Decision brief explaining whether the loop is balanced, oscillating, or collapsing into queue buildup.

## Why It Fits The Portfolio

This project turns an abstract systems idea into a concrete interactive lab. It bridges reliability engineering, queueing intuition, and product operations without requiring a backend.

## Local Run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/control-loop-lab/`.

## GitHub Pages Compatibility

- Pure static HTML/CSS/JS.
- Relative asset paths only.
- Shareable state via URL params.
