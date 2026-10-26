# Systems Decision Labs

A browser game with seven fictional scenarios about campus services and infrastructure.

## Core idea

The scenarios share the same scoring and three-round structure:

- incident response
- transit detours
- energy resilience
- patch nights
- registration launch
- office hours operations
- overnight fictional dispatch

Each pack uses the same core loop:

1. Read the situation.
2. Choose one of three responses.
3. See the changes to public trust, work completed, recovery capacity, and staff workload.
4. Review the final scores.

## How the game works

The seven scenarios were combined because they use the same choice-and-score mechanic. Each response has fixed score changes, and scores stay between 0 and 100. The final summary follows thresholds in the code. These are made-up game rules, not models of real service performance or staffing needs.

## Files

- `index.html`: unified game shell
- `styles.css`: shared visual system for the combined project
- `script.js`: scenario-pack data plus the common decision engine

## GitHub Pages compatibility

- Fully static
- Relative links only
- No build tooling required
