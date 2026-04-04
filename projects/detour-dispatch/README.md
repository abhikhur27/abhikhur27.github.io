# Detour Dispatch

Transit decision lab about rerouting a campus shuttle network through closures, surges, and accessibility pressure.

## Core idea

You are not tuning a transit chart. You are operating a fragile bus network under live disruption and trading off:

- on-time service
- rider trust
- driver strain
- accessibility coverage

Each round forces a real operations choice, and the final brief reflects what kind of detour manager you became.

## What the experience includes

- Four disruption rounds with distinct operational pressures
- Persistent score model across the full run
- Decision log with immediate consequence summaries
- Final command brief based on reliability, rider trust, accessibility, and operator sustainability

## Files

- `index.html`: transit-ops shell and control board
- `styles.css`: static visual system for the dispatch-room presentation
- `script.js`: scenario engine, metric updates, and final evaluation logic

## Local run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/detour-dispatch/`.
