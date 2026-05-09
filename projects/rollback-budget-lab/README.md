# Rollback Budget Lab

Static decision lab about designing safeguards around risky product actions.

## Core idea

You are not tuning a dashboard. You are deciding how much confirmation, undo depth, rollout control, and operator visibility a risky action deserves before failure teaches the real lesson.

## Mechanics

- Pick one high-risk product scenario.
- Spend a limited safeguard budget across confirmation, undo depth, staged rollout, auditability, previewing, optimistic UI, and human review.
- Launch the policy and inspect the pre-launch read, pressure test, and postmortem.
- Copy a policy brief for portfolio walkthroughs.

## Files

- `index.html`: scenario picker, safeguard controls, and output surface.
- `styles.css`: static visual system for the lab.
- `script.js`: safeguard budget logic, policy scoring, launch simulation, and brief export.

## Local run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/rollback-budget-lab/`.
