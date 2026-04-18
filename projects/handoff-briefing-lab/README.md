# Handoff Briefing Lab

Static incident-handoff decision lab about choosing the five updates that the next shift actually needs.

## Core Mechanic

- Pick one scenario with a different handoff failure mode.
- Choose up to five candidate bullets for the next shift packet.
- Balance coverage against overload: missing ownership, risk, or next-step context tanks the score, but stuffing the brief with noise also hurts it.

## What It Teaches

- Good handoffs are not just timelines. They need status, owner, risk, and next action coverage.
- Low-signal speculation can be actively harmful in a constrained briefing window.
- Ordering and selection pressure matter more than raw note quantity.

## Why It Fits The Portfolio

This is not another slider lab. The player is inhabiting a real operator role under a communication constraint, and different briefing choices produce meaningfully different shift-quality outcomes.

## Local Run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/handoff-briefing-lab/`.

## GitHub Pages Compatibility

- Pure static HTML/CSS/JS.
- Relative asset paths only.
- Shareable state encoded in the URL.
