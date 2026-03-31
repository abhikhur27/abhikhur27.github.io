# Campus Grid Blackout

Decision-based static simulation about running a campus microgrid through a six-shift blackout.

## What it does

- Presents six escalating outage incidents.
- Lets the player allocate repair crews, battery reserves, and public communication each shift.
- Tracks three portfolio-facing outcomes:
  - campus trust
  - research uptime
  - cascading outage risk
- Produces a short decision log and ending state based on the sequence of allocations.

## Why this project exists

This is a more portfolio-distinct systems project than a basic chart or dashboard. It combines resource allocation, cascading risk, and public communication into a constrained static simulation that still works on GitHub Pages.

## Stack

- HTML
- CSS
- JavaScript

## Local run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/campus-grid-blackout/`.
