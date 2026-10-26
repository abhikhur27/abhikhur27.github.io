# Failure Mode Atlas

A browser troubleshooting exercise. Choose symptoms in an example outage to compare four possible causes and read suggested checks.

## What it does

- Loads prebuilt incident scenarios such as traffic saturation, post-deploy errors, and data-feed corruption.
- Lets the user toggle observed signals instead of forcing a fixed story.
- Ranks four failure families:
  - Capacity exhaustion
  - Dependency degradation
  - Configuration drift
  - Data integrity fault
- Shows the symptoms contributing points to each cause.
- Lists checks for the cause with the highest point total.

## How the ranking works

Each symptom has hand-set weights for one or more causes. The page adds those weights and sorts by the total. The scores are not measured probabilities, and the app does not connect to real monitoring data. This is an exercise in comparing symptoms, not a procedure for managing real outages.

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
