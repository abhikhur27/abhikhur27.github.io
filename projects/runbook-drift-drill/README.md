# Runbook Drift Drill

Static incident-operations project about auditing stale runbooks before they make an outage worse.

## Core Idea

The player is not fixing the incident directly. They are auditing operational guidance against live evidence and deciding which steps are still safe, which need verification, and which are already stale enough to cost time and trust.

## Why This Clears The Portfolio Rubric

- The user inhabits a specific role: operator reviewing knowledge under pressure.
- The payoff is experiential: wrong trust in a stale step burns credibility and time.
- Different choices create meaningfully different review outcomes.
- The mechanic is not "tweak inputs and view a chart"; it is evidence-weighted judgment.

## Mechanics

- Three incident scenarios with distinct drift patterns.
- Each runbook step must be classified as `Safe`, `Verify`, or `Stale`.
- Review mode reveals the hidden drift notes and scores the audit.
- Metrics track:
  - correct calls
  - trust budget
  - time burned

## Technical Notes

- Pure static HTML, CSS, and JavaScript.
- Scenario data lives in `script.js`.
- No backend or build step.

## Local Run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/runbook-drift-drill/`.
