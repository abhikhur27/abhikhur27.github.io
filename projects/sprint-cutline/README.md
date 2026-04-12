# Sprint Cutline

Release-week decision game about where a tech lead draws the line when scope pressure, fragile systems, and stakeholder narrative all collide.

## Core idea

You are not tuning parameters. You are protecting a release under social and technical pressure.

Each round introduces a new shock:

- late QA defect
- sales promise drift
- schema churn
- migration cleanup risk
- release-note narrative pressure

You choose one response per round, then watch four pressures move:

- team trust
- release stability
- scope confidence
- stakeholder clarity

The project is trying to show that release leadership is mostly about choosing a believable cutline, not pretending everything still fits.

## Why it clears the portfolio bar

- The player has a specific role with consequences.
- Different decisions create meaningfully different failure modes.
- The payoff is experiential: you feel whether you protected the team, the launch, or the story.
- It is not just a chart or simulator skin; it is a pressure-management game about product scope and credibility.

## Files

- `index.html`: app structure and narrative panels
- `styles.css`: release-room visual system
- `script.js`: scenario deck, metric updates, and final verdict logic

## Local run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/sprint-cutline/`.
