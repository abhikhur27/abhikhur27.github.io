# Graceful Degradation Lab

Static policy simulator for choosing how a product should degrade when key surfaces come under incident pressure.

## What It Does

- Lets you choose fallback modes for `Search`, `Media Feed`, `Checkout`, and `Analytics`.
- Simulates three incident days:
  - `Registration Rush`
  - `Ticket Drop`
  - `Mobile Release Day`
- Scores each policy on:
  - throughput preserved
  - deferred users
  - trust budget
  - operator load
- Produces a timeline that shows what each fallback choice actually did.
- Copies a degradation brief for portfolio walkthroughs or writing notes.

## Why This Project Exists

Graceful degradation is usually described as a backend tactic. The real portfolio angle here is that degraded mode is a
user-facing product contract: choosing cached reads, queue gates, or honest shutdowns changes trust, revenue, and
operator burden at the same time.

## Files

- `index.html`: scenario selection, fallback controls, dashboard, and timeline shell.
- `styles.css`: glassy static interface tuned for GitHub Pages.
- `script.js`: share-link state, policy simulation, scoring, and export logic.

## Local Run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/graceful-degradation-lab/`.

## GitHub Pages Compatibility

- Static HTML/CSS/JS only.
- No build tooling.
- Query-string state only for sharing scenarios and fallback choices.
