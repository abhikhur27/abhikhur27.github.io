# Market Regime Monte Carlo Lab

Run simulated investment paths that switch between rising and falling markets. Change the assumed returns, daily variation, and investment size to see how the final outcomes change. Everything runs in the browser.

## What you can try

- Set the chance of staying in each market state from one day to the next. This is a two-state Markov model.
- Choose each state's drift (average daily return) and volatility (variation around that average).
- Choose how to size the investment:
  - Fixed fraction
  - Volatility-targeted sizing
  - Drawdown-aware sizing
- Compare the 10th percentile, median, and 90th percentile at each simulated day.
- See the distribution of final returns and up to 120 example paths.
- Read median annualized growth, the largest peak-to-low loss, the share of paths ending at a loss, and the average number of market-state changes.

## Reading the results

Every path starts at 100. A result of 110 is a 10% return. Annualized growth converts the median final result to a 252-trading-day rate. Drawdown measures a fall from a path's previous high, even if that path later recovers.

The inputs define an invented market. The model uses normally distributed daily returns and does not include trading costs, slippage, taxes, or multiple assets. It is useful for exploring assumptions, but its loss percentages are not forecasts of real investment risk. Runs use fresh random numbers, so repeating the same settings can produce different results.

## Technical Notes

- `index.html`: settings, chart, and results.
- `styles.css`: responsive page layout.
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
- Uses relative paths for GitHub Pages deployment.

## Future Improvements

- Add bootstrap confidence intervals for percentile paths.
- Add transaction-cost and slippage modeling.
- Add downloadable CSV for run summaries.
- Add multi-asset correlation matrix support.

