# JSON Shape Diff Studio

Static browser utility for comparing two JSON payloads and catching shape drift before an API or config change becomes a debugging problem.

## What it does

- Compares two JSON documents entirely in the browser.
- Tracks both container nodes and leaf values.
- Flags:
  - added paths
  - removed paths
  - type changes
  - same-type value changes
- Filters the diff table by change type.
- Copies a compact summary for PR notes or handoff messages.

## Why it belongs in the portfolio

This is a practical developer workflow tool, not another visualizer variant. It helps with:

- API contract review
- config migration checks
- payload regression triage
- quick schema sanity checks before deployment

## Local run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/json-shape-diff-studio/`.

## GitHub Pages compatibility

- Static HTML/CSS/JS only
- No build pipeline
- No server dependency
