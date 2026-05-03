# Expectation Debt Studio

Decision lab about product promises, operational honesty, and trust repayment.

## Core idea

Instead of tweaking one latency slider, the player acts like a product/operator hybrid:

- choose what to promise
- choose what the interface shows while reality is shaky
- choose how the team repays trust when the promise slips

Every round changes:

- user trust
- support load
- delivery slack
- operator strain
- expectation debt

## Why this belongs in the portfolio

- It gives the user a real role with conflicting incentives.
- The main lesson comes from consequences, not charts.
- Different policy combinations create meaningfully different failure stories.
- It is static, self-contained, and easy to demo in GitHub Pages.

## Features

- Six product incident scenarios.
- Three decision lanes per round:
  - promise posture
  - feedback posture
  - recovery posture
- Persistent round ledger with per-round deltas.
- Final archetype summary for the whole run.
- Copyable session brief for walkthroughs or blog notes.

## Files

- `index.html`: layout for the hero, scenario lanes, metrics, and ledger.
- `styles.css`: dark operations-themed interface with card-based decision controls.
- `script.js`: round state machine, scoring model, logging, and clipboard brief export.

## Local run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/expectation-debt-studio/`.

## GitHub Pages compatibility

- Static HTML, CSS, and JavaScript only.
- No build step.
- No backend dependency.
