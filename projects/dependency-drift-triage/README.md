# Dependency Drift Triage

Static maintenance strategy game for deciding which dependency upgrades deserve a limited release window.

## What It Does

- Presents five dependency upgrades with different cost, risk-reduction, and breakage profiles.
- Lets the user select and deselect packages under an 18-hour maintenance budget.
- Calculates hours remaining, risk removed, breakage load, and a release-grade verdict.
- Turns the selected package set into a short triage brief.

## Why It Exists

This clears the portfolio originality bar by making the user inhabit a maintenance tradeoff instead of only viewing a chart. The main verb is committing to a release slice under constraints.

## Technical Notes

- Fully static HTML, CSS, and JavaScript.
- No build step or external runtime.
- Uses relative links for GitHub Pages compatibility.

## Local Run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/dependency-drift-triage/`.
