# Abhi Khurana Portfolio

Main personal site for curated project demos.

## Live Site

- URL: `https://abhikhur27.github.io/`

## Current Direction

- Simpler homepage-first browsing.
- Honest labels for browser-based work.
- Blog and physical-build sections are disabled on the public site for now.
- No public placeholders or templates on `main`.
- Fully static architecture for GitHub Pages.
- Future direction: more useful utility software, especially Windows or workflow-focused apps.

## Included Subprojects In This Repo

- `projects/transit-network-lab`
- `projects/market-regime-lab`
- `projects/systems-decision-labs`
- `projects/merge-conflict-studio`
- `projects/failure-mode-atlas`
- `projects/return-window-tribunal`
- `projects/release-brief-studio`
- `projects/json-shape-diff-studio`
- `projects/csv-column-profiler`
- `projects/sql-index-advisor`

## Standalone Project Repositories

- `https://github.com/abhikhur27/course-grade-allocator`
- `https://github.com/abhikhur27/change-risk-sentry`
- `https://github.com/abhikhur27/dataset-split-auditor`
- `https://github.com/abhikhur27/deadline-calendar-builder`
- `https://github.com/abhikhur27/path-shadow-auditor`
- `https://github.com/abhikhur27/windows-autostart-auditor`
- `https://github.com/abhikhur27/trade-journal-normalizer`
- `https://github.com/abhikhur27/portfolio-risk-rebalancer`
- `https://github.com/abhikhur27/cache-policy-simulator`
- `https://github.com/abhikhur27/context-constellation-rag`
- `https://github.com/abhikhur27/lower-48-warlines`

## Technical Design

- `index.html`: semantic structure for hero, curated project index, and a small writing lane.
- `styles.css`: shared visual system for the portfolio homepage.
- `script.js`: pinned-project ordering and mobile nav behavior.
- homepage browser-only section now stays collapsed by default so the first scan stays utility-first.
- `projects/json-shape-diff-studio`: static JSON comparison utility for schema and payload drift.
- `projects/csv-column-profiler`: static CSV QA tool for column-shape checks, null pressure, and duplicate-row detection.
- `PROJECT_TRUTHS.md`: portfolio constraints that future changes and automations should follow.
- `docs/portfolio-originality-rubric.md`: the bar future projects must clear before they get built.
- `docs/portfolio-automation-message-update.md`: recommended update for the recurring automation prompt.

## Accessibility And UX

- Keyboard-accessible nav and filter controls.
- `Skip to content` support.
- Responsive layout for mobile and desktop.

## Local Usage

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Future Improvements

- Add CI for link checks and HTML validation.
- Move project metadata into a single manifest.
- Add real native utilities and workflow software alongside the browser portfolio pieces.
