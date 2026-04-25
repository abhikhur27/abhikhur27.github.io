# Assumption Ledger Lab

Static release-strategy game about managing stale assumptions before they turn into incident debt.

## Core idea

Instead of tuning a chart, the player inhabits release week itself:

- each assumption starts with a confidence level
- unchecked assumptions drift every day
- validation costs delivery hours
- guardrails reduce blast radius but also slow momentum

The point is to balance release trust, delivery pace, and incident debt over five days.

## Included scenarios

- Payments cutover
- Campus login surge
- Field robotics rollout

## Mechanics

- `Validate`: spend assumption-specific hours to refresh confidence.
- `Add Guardrail`: spend 2 hours to reduce the damage if that assumption breaks later.
- `Close Day`: age every unchecked assumption and roll the release forward.

## Why it clears the portfolio bar

- The player inhabits a role with constrained time, not just a dashboard viewer.
- Different choices create meaningfully different release outcomes.
- The payoff is about hidden operational debt becoming visible over time.

## Local run

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## GitHub Pages compatibility

- Static HTML/CSS/JS only
- No build step
- No server runtime
