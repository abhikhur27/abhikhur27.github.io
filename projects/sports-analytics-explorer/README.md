# NBA Offensive Identity Model (2024-25)

Interactive offense profiling dashboard built on real multi-season NBA team data.

## Features

- Season switcher for **2021-22 through 2024-25**.
- Weight-adjusted offensive model using:
  - Effective FG%
  - Turnover%
  - Offensive Rebound%
  - Free Throw Attempt Rate (FTA/FGA)
- Additional advanced fields for insight:
  - True Shooting % (TS%)
  - 3PA/FGA (shot profile)
- Preset scoring modes (`Balanced`, `Shot Making`, `Physicality`).
- Optional z-score normalization mode for scale-robust comparisons.
- Team-vs-team differential breakdown panel.
- Scatter plot (pace vs offensive rating) with hover inspection.
- Factor contribution bars for the currently top-ranked team.
- CSV export for model rankings.

## Data Source and Validation

- Seasons: **2021-22, 2022-23, 2023-24, 2024-25** regular seasons.
- Source: **StatMuse NBA team query endpoints**.
- Data retrieval script generated `data-2024-25.js` from paired `best`/`worst` queries per metric and season to capture all 30 teams.

## Technical Design

- `index.html`: controls, compare module, contribution view, and rankings.
- `data-2024-25.js`: sourced dataset payload + metadata.
- `styles.css`: responsive ink-themed interface aligned with portfolio style.
- `script.js`: scoring engine, normalization modes, canvas visualization, export tooling.

```mermaid
flowchart TD
  A[Data Payload] --> B[Normalize Metrics]
  C[Weight Controls] --> D[Score Engine]
  B --> D
  D --> E[Ranking Table]
  D --> F[Pace vs OffRtg Scatter]
  D --> G[Contribution Bars]
  D --> H[Team Compare Differential]
```

## Local Run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/sports-analytics-explorer/`.

## GitHub Pages Compatibility

- Static-only (`HTML/CSS/JS`) implementation.
- No API call is required at runtime.
- Uses relative paths suitable for GitHub Pages.

## Future Improvements

- Add lineup-level decomposition (starter vs bench offensive identity).
- Add confidence intervals via bootstrap resampling.
- Add monthly splits and opponent-adjusted normalization.
