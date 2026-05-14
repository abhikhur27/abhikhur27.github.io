# Alert Charter Studio

Alert-policy simulator about authoring who gets paged, who gets a quiet triage signal, and which incidents slip through when the charter is too relaxed.

## Core Idea

Most alerting tools treat thresholds like backend plumbing. In practice, they are interface policy for operators:

- a tight threshold can protect users but burn pager trust
- a loose threshold can preserve sleep while letting incidents drift
- route choice changes whether the team gets a fast interruption or a polite summary after the damage is already visible

This project makes the player author an alert charter and then run one shift full of noisy blips and real incidents.

## Features

- Three shift profiles with different operator pressure:
  - registration rush
  - overnight ETL window
  - mobile release day
- Four signals with independent rules:
  - latency
  - error rate
  - queue backlog
  - saturation
- Per-signal threshold tuning (`tight`, `balanced`, `loose`).
- Per-signal routing (`pager`, `slack`, `digest`).
- Shift verdict board that grades response, trust, and fatigue together.
- Pager economics board for true pages vs noisy pages.
- Miss ledger that names the incidents the charter hid or delayed.
- Timeline cards showing exactly how each event was handled.
- Shareable URL state and copyable shift brief.

## Technical Design

- `index.html`: scenario picker, alert charter controls, dashboard boards, and timeline output.
- `styles.css`: reused editorial card system adapted for a green-toned operations interface.
- `script.js`: static shift definitions, alert-rule state, event evaluation, and brief generation.

## Local Run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/alert-charter-studio/`.

## Why It Belongs In The Portfolio

This is not a generic monitoring dashboard. The player takes on an operator-policy role, commits to a routing strategy, and then sees whether noise, misses, and delay make the charter defensible. The lesson comes from consequence across a shift, not from staring at a chart.
