# Latency Budget Planner

Static UX systems tool for turning a product interaction into a concrete latency budget.

## What it does

- Models P50 and P95 latency from network, backend, cache, and frontend slices.
- Lets you toggle warm-cache behavior and optimistic UI.
- Recommends a loader policy based on the current budget.
- Generates a rollout-style brief that can be copied to the clipboard.

## Why it belongs in the portfolio

This project sits between pure systems work and product thinking. It makes latency tradeoffs legible in the same way the scheduler, cache, and UX labs do, but from a product-operations angle.

## Stack

- HTML
- CSS
- JavaScript

## Local run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/latency-budget-planner/`.
