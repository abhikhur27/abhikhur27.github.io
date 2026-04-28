# Postmortem Redaction Lab

Interactive incident-communication game about splitting facts between a public postmortem and an internal follow-up.

## Core idea

- You are not tuning parameters. You are choosing what an incident report says to two different audiences.
- The public note must preserve trust without hiding the customer impact.
- The internal note must preserve enough causal detail to help the team actually learn.
- Over-disclose the wrong details and legal exposure climbs. Under-disclose and the writeup becomes evasive or useless.

## Features

- Three incident scenarios:
  - Campus auth cache failure
  - Duplicate charge retry storm
  - Analytics schema drift outage
- Fact-bank drafting workflow with separate public and internal note slots.
- Score model for:
  - public trust
  - internal learning
  - legal exposure
  - disclosure coverage
- Outcome posture read that classifies the finished note.
- Copyable disclosure brief for walkthroughs or portfolio demos.

## Why this clears the originality bar

- The user inhabits a specific role: incident communicator under conflicting incentives.
- The mechanic is not "adjust a slider and see a chart." It is constrained disclosure selection.
- Different choices produce meaningfully different public and internal outcomes.
- The payoff is experiential: you feel the tension between trust, learning, and legal risk.

## Technical design

- `index.html`: scenario controls, fact bank, dual-note workspace, and scoreboards.
- `styles.css`: static responsive layout with disclosure cards and outcome boards.
- `script.js`: scenario data, selection constraints, scoring logic, and clipboard brief generation.

## Local run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/postmortem-redaction-lab/`.

## GitHub Pages compatibility

- Pure static HTML/CSS/JS.
- No build step.
- Relative asset paths only.
