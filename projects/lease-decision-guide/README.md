# Lease Decision Guide

Portfolio status (October 26, 2026): retired from public selection. This source is retained for reference, not endorsed as a portfolio-ready project. Do not relist or reskin it through automation.

A browser tool for comparing apartment rent, fees, discounts, and commute time.

## What it does

- Ranks offers using a monthly estimate that includes your assumptions
- Spreads concession credits across the full lease term
- Converts commute time into dollars using the hourly value you choose
- Adds your estimate for renewal, subletting, or maintenance concerns
- Shows the lowest estimate and the largest added cost for time and concerns

## Why this is useful

Advertised rent leaves out fees and discounts, and a longer commute has a cost of its own. This page adds those factors using values you can change. The monthly estimate includes the value of time and subjective concerns, so it is not the amount you will pay your landlord. Move-in cash is shown separately.

## Local run

Open `index.html` directly in a browser, or serve the folder with:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/lease-decision-guide/`.
