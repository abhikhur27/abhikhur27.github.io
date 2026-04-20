# Race Condition Lab

Interactive static lab for practicing concurrency design choices in product-facing systems.

## What it does

- Walks through four common async failure cases:
  - duplicate likes
  - out-of-order search responses
  - overlapping reservations
  - autosave conflicts
- Lets the user pick one guardrail per scenario.
- Scores each run across correctness, latency, implementation complexity, and user trust.
- Produces a clipboard-ready run report for portfolio demos or interview walkthroughs.

## Why this project exists

Concurrency bugs usually show up as UX bugs before they show up as formal correctness incidents.
This lab frames async design as a product tradeoff: the user has to decide when to spend latency or complexity to preserve trust.

## Technical design

- `index.html`: scenario shell, timeline, options grid, scoreboard, and decision log.
- `styles.css`: responsive static presentation with a dark operations-room visual language.
- `script.js`: scenario data, scoring model, decision log rendering, and clipboard report generation.

## Static compatibility

- No framework or server dependency.
- Pure HTML/CSS/JavaScript.
- Works directly on GitHub Pages from the project folder.

## Local run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/race-condition-lab/`.
