# Schema Drift Command

Static portfolio project about API contract migrations under partner and operational pressure.

## Core Idea

You act as the platform owner during a five-round schema migration campaign. Each round introduces a new kind of contract drift: enum expansion, semantic nullability, structural payload changes, unreliable version headers, and the final sunset decision.

The point is not to visualize an API schema. The point is to force tradeoffs:

- preserve partner trust
- keep delivery moving
- avoid incident spikes
- spend a limited compatibility-shim budget carefully

## Why It Clears The Portfolio Bar

- The user has a role: platform owner during a risky migration.
- Each decision changes later options because shim budget is finite.
- Different choices produce different endings and doctrine summaries.
- The payoff is experiential: you feel the tension between contract cleanliness and relationship management.

## Mechanics

- Five authored migration crises
- Three response options per crisis
- Live scorecards for trust, delivery, incidents, and remaining shim budget
- Doctrine board that interprets the pattern of your prior choices
- Final verdict based on the migration culture you built

## Technical Design

- `index.html`: narrative shell, scorecards, scenario surface, and ending state
- `styles.css`: static presentation and responsive layout
- `script.js`: scenario data, decision engine, score updates, and ending evaluation

## Local Run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/schema-drift-command/`.

## GitHub Pages Compatibility

- Fully static
- No build step
- No external runtime beyond Google Fonts
