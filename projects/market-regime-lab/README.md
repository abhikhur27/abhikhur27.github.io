# Market Regime Monte Carlo Lab

Market Regime Monte Carlo Lab is a static, browser-based simulator for testing portfolio behavior under bull/bear regime switching.

## What It Demonstrates

- Regime-transition modeling with two-state Markov dynamics.
- Return path simulation with configurable drift and volatility per regime.
- Position sizing policy comparison:
  - Fixed fraction
  - Volatility-targeted sizing
  - Drawdown-aware sizing
- Animated percentile path envelope (10th/50th/90th).
- Distribution snapshot for final outcomes.
- Risk summary metrics (CAGR, drawdown, loss probability, regime-switch frequency).

## Technical Notes

- `index.html`: control surface + analytics panels.
- `styles.css`: ink-themed responsive layout aligned with the portfolio design language.
- `script.js`:
  - Monte Carlo simulation engine.
  - Markov regime switching logic.
  - Policy-based leverage scaling.
  - Canvas rendering and animation.
  - LocalStorage persistence for experiment settings.

## Run Locally

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/market-regime-lab/`.

## GitHub Pages Compatibility

- Fully static files (`HTML/CSS/JS`).
- No bundler, no runtime server dependency.
- Uses relative paths for seamless GitHub Pages deployment.

## Future Improvements

- Add bootstrap confidence intervals for percentile paths.
- Add transaction-cost and slippage modeling.
- Add downloadable CSV for run summaries.
- Add multi-asset correlation matrix support.

