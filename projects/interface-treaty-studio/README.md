# Interface Treaty Studio

Interaction-policy lab about drafting what an interface promises before pressure exposes the missing clauses.

## Core Idea

Users do not just interact with buttons. They inherit a contract:

- how fast the system acknowledges intent
- whether risky moves stay reversible
- whether automation explains itself
- whether operators get a durable trail after something goes wrong

This project turns that contract into a small drafting game. The player spends a tight policy budget on clauses, chooses a scenario, and sees which user groups trust the result.

## Features

- Four scenarios with distinct pressure:
  - bulk delete
  - autosave field notes
  - shared schedule builder
  - moderation queue triage
- Eight treaty clauses with point costs and tradeoff effects.
- Budget-constrained policy drafting instead of unconstrained best-practice stacking.
- Treaty posture board that collapses the current policy into one overall read.
- Pressure ledger that surfaces the strongest and weakest promises in the current draft.
- Persona reactions for first-timers, power users, and operators.
- Failure board that calls out what still breaks when required clauses are missing.
- Copyable brief and shareable URL state.

## Technical Design

- `index.html`: scenario shell, clause grid, and outcome boards.
- `styles.css`: editorial warm-dark visual system with card-heavy treaty drafting UI.
- `script.js`: static state model, clause budgeting, scenario scoring, and share-link persistence.

## Local Run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/interface-treaty-studio/`.

## Why It Belongs In The Portfolio

This is not a generic settings dashboard. It asks the player to commit to an interaction contract under constraint and then shows who pays for the missing promise. The learning payoff comes from consequence, not from sliders or charts alone.
