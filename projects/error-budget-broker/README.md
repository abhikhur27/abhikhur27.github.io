# Error Budget Broker

Decision game about allocating a finite reliability budget across growth asks, platform fixes, and trust-preserving work during a five-day release week.

## Core Idea

You play the release broker for a product org with one hard constraint: reliability headroom is finite.

Every day presents three requests. Funding one request spends error budget immediately and shifts trust, growth, and operator strain. Deferring the rest creates follow-on pressure. If you run the week too close to zero headroom, incidents start converting operational strain into direct customer-trust loss.

This is not a slider lab. The mechanic is a constrained scheduling game about what kind of risk you are willing to buy.

## Features

- Five-day release-week structure with one funded request per day.
- Distinct request lanes across growth, reliability, ops, trust, and capacity.
- Consequence tape that records what each choice bought and what it cost.
- Incident pressure that emerges when strain outruns remaining headroom.
- Copyable week brief for portfolio walkthroughs or blog notes.
- Fully static GitHub Pages-compatible implementation.

## Files

- `index.html`: layout for dashboard, request queue, broker brief, and consequence tape.
- `styles.css`: reliability-themed visual system with responsive card layout.
- `script.js`: day loop, request consequences, deferred-pressure logic, and final verdict generation.

## Demo Path

1. Play one aggressive week that chases growth-heavy asks.
2. Restart and play one defensive week that protects trust and cuts strain.
3. Compare the final verdicts and explain which resource failed first: budget, trust, or operator calm.

## Local Run

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.
