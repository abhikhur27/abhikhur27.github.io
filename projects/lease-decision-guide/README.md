# Lease Decision Guide

Practical browser tool for comparing apartment lease offers beyond sticker rent.

## What it does

- Ranks lease offers by true monthly cost rather than advertised rent alone
- Spreads concession credits across the full lease term
- Prices commute drag into the comparison with an explicit dollar-per-hour assumption
- Makes flexibility and maintenance risk visible as monthly penalties instead of vague gut feel
- Surfaces both the winning offer and the biggest hidden-cost trap

## Why this is useful

Apartment decisions often get distorted by one flashy number: monthly rent. In practice, commute time, parking, utility bundles, concessions, and move-in cash change the decision just as much. This tool keeps those tradeoffs in one place and turns them into a clean ranking plus a reusable brief.

## Local run

Open `index.html` directly in a browser, or serve the folder with:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/lease-decision-guide/`.
