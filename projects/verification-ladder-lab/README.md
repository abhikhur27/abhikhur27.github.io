# Verification Ladder Lab

Static decision game about verification under deadline pressure.

## Core Idea

You are given a risky claim, a deadline, and a limited verification budget. Each check improves evidence differently, slows you down differently, and changes whether the safest final move is to publish, hedge, or hold.

## Why it clears the originality bar

- The user inhabits a specific role: deciding what proof a claim deserves before it goes public.
- The payoff is experiential, not just visual: verification moves trade off trust, exposure, and speed.
- The mechanic is not "tweak a chart"; it is spending scarce verification effort under asymmetric uncertainty.

## Features

- Three scenario types with different verification needs.
- Limited four-check verification budget.
- Claim scoring across evidence, trust, exposure, and speed.
- Three ship postures: publish, publish with hedge, hold for more evidence.
- Copyable briefing note for portfolio walkthroughs.

## Files

- `index.html`: scenario picker, action surface, and result panels.
- `styles.css`: static editorial game styling.
- `script.js`: scenario data, verification scoring, and briefing export.

## Local Run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages Compatibility

- Static HTML/CSS/JS only.
- No backend or build step.
