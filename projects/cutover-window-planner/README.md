# Cutover Window Planner

Static maintenance-window planning game about sequencing a risky cutover before the window, rollback posture, and public trust all drift apart.

## Core idea

This project is not a slider lab or a generic dashboard. The player takes the role of the operator responsible for a maintenance cutover:

- choose a limited number of prep moves
- reorder the cutover tasks
- simulate whether the plan still lands within window

The payoff comes from sequencing and reversibility. A plan can look busy while still moving live traffic before the proving steps are actually done.

## Included scenarios

- Campus identity provider cutover
- Payments gateway vendor swap
- Telemetry pipeline migration

## Mechanics

- `Select prep`: spend a limited prep budget on guardrails that buy readiness, trust, or rollback credibility.
- `Move Earlier / Move Later`: reorder the cutover sequence before launch.
- `Simulate Plan`: run the whole window and inspect the operator log plus plan verdict.
- `Copy Plan Brief`: export the current plan as a walkthrough artifact.

## Why it clears the portfolio bar

- The player inhabits a real operator role with sequencing pressure.
- The main verb is planning a cutover, not only observing output.
- Different prep choices and task orders produce meaningfully different outcomes.
- The interface teaches why rollback posture and task order matter through consequence.

## Local run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/cutover-window-planner/`.

## GitHub Pages compatibility

- Static HTML/CSS/JS only
- No build step
- No server runtime
