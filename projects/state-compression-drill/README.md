# State Compression Drill

Static incident handoff game for practicing state compression under a five-fact budget.

## What It Does

- Presents a noisy operations scenario.
- Asks the user to choose exactly the facts worth handing to the next operator.
- Scores coverage across state, scope, risk, impact, and next action.
- Penalizes low-signal noise in the packet.
- Copies the resulting handoff brief for a portfolio demo artifact.

## Why It Exists

Good incident notes are not full timelines. They are compressed state packets that preserve what the next person needs to know. This project turns that writing judgement into an interactive constraint.

## Local Run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/state-compression-drill/`.

## GitHub Pages Compatibility

- Static HTML/CSS/JS only.
- No build step.
- Uses relative links.
