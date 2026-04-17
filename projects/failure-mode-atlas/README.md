# Failure Mode Atlas

Static incident-response sandbox that turns observed signals into ranked failure-mode hypotheses and next diagnostic actions.

## What it does

- Loads prebuilt incident scenarios such as traffic saturation, post-deploy errors, and data-feed corruption.
- Lets the user toggle observed signals instead of forcing a fixed story.
- Ranks four failure families:
  - Capacity exhaustion
  - Dependency degradation
  - Configuration drift
  - Data integrity fault
- Surfaces the exact clues contributing to each ranking.
- Generates a concrete next-action sequence for the current highest-confidence hypothesis.

## Why it belongs in the portfolio

This project is meant to show systems thinking, not just frontend polish. The main value is the decision model:

- separate symptoms from root-cause families
- assign weighted evidence rather than binary labels
- turn ranking output into operator-facing next steps

## Files

- `index.html`: full static app with embedded styling and ranking logic.

## Local run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/failure-mode-atlas/`.

## GitHub Pages compatibility

- Pure static HTML/CSS/JS
- No build step
- Safe for GitHub Pages hosting under a project directory
