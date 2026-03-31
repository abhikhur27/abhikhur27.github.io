# Midnight Dispatch Desk

Static decision game about triage under cascading operational risk.

## What It Does

- Puts the user in charge of an overnight dispatch desk across transit, power, and medical incidents.
- Forces tradeoffs between immediate severity, hidden cascade risk, crew specialization, and fatigue.
- Produces a distinct playthrough each shift instead of just visualizing a parameter sweep.

## Why This Version Is Better

- The interaction has a real mechanic: you choose what to save and what to defer.
- The insight is not “high utilization is bad”; it is that the wrong local choice can create tomorrow’s outage.
- It feels closer to a toy system or small product than a chart lab.

## Local Run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/queueing-resilience-lab/`.
