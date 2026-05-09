# Scope Negotiation Lab

Interactive product-scope decision game about clarifying vague feature requests before they turn into rework, fairness disputes, or false promises.

## Core idea

You are not tuning sliders. You are spending a short meeting budget on clarifying questions, uncovering hidden constraints, and then committing to a delivery posture with incomplete information.

## Features

- Three built scenarios:
  - campus registration autopromote
  - AI study-note generation
  - residence hall maintenance feed
- Limited question budget that forces prioritization instead of exhaustive discovery.
- Revealed-constraint log that shows what each question actually changed.
- Blind Spot, Promise Posture, and Question Coach boards that turn the session into a product-scoping read.
- Three commit options per scenario with different trust and rework outcomes.
- Fully static HTML/CSS/JS architecture for GitHub Pages.

## Why this belongs in the portfolio

- Different player verb from the existing incident and rollback labs: here the core action is interrogating ambiguity, not reacting to a running system.
- Different failure mode: the danger is overcommitting before the contract is clear.
- Different information structure: the user decides which hidden constraints become visible before making the call.

## Technical design

- `index.html`: scenario layout, question budget surface, operator boards, and commit area.
- `styles.css`: editorial dashboard treatment with responsive cards and contrast emphasis.
- `script.js`: scenario state machine, question reveal flow, board summaries, and decision outcomes.

## Demo path

1. Open the campus waitlist scenario.
2. Spend the first two questions on fairness and rollback-adjacent constraints.
3. Commit to the pilot posture instead of the full-scope promise.
4. Reset and compare how a different question order changes the negotiation read.

## Local run

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## GitHub Pages compatibility

- Static assets only.
- No build step.
- Works directly from the project directory.
