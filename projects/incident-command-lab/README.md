# Incident Command Lab

Interactive outage-command simulation built for the main portfolio site.

## Core Idea

This is not a parameter sweep. The user plays incident commander during a campus network failure and has to trade off service restoration, public trust, and team fatigue across four linked phases.

## Why It Fits The Portfolio Rubric

- The user inhabits a role with real constraints.
- Each choice changes the next state instead of only changing a chart.
- The payoff is experiential: you feel the tradeoff between speed, credibility, and burnout.
- A screenshot does not explain the full project because the point is the decision sequence.

## Technical Notes

- Single static `index.html` file with embedded CSS and JavaScript.
- No build step or backend.
- Fully GitHub Pages compatible.

## Local Run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/incident-command-lab/`.
