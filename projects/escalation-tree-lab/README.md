# Escalation Tree Lab

Static incident-routing game about who gets paged first when the signal is incomplete and every escalation has a cost.

## Core idea

Most portfolio incident games stop at "pick the best action." This one is narrower and more operational: choose the first responder lane under uncertainty, then watch containment, trust, fatigue, and blast radius move differently depending on whether you paged the right owner, paged too wide, or paged the wrong layer.

## Why it clears the originality bar

- The player verb is routing escalation, not tuning parameters or reading a chart.
- The tension comes from incomplete evidence and responder-cost tradeoffs.
- Different choices can be locally reasonable while still producing very different shift outcomes.
- The payoff is experiential: you feel when broad paging buys safety versus when it just burns people.

## Mechanics

- Five incident scenarios with different evidence signatures.
- Three first-page options per scenario.
- Shift scoreboard for containment, trust, fatigue, and blast radius.
- Timeline debrief that records what each escalation solved or made worse.
- Copyable briefing for portfolio walkthroughs.

## Files

- `index.html`: layout for the incident card, scoreboard, and timeline.
- `styles.css`: static dark operations UI.
- `script.js`: scenario deck, score updates, and debrief logic.

## Run locally

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/escalation-tree-lab/`.
