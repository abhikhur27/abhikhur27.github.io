# Sound Shift Studio

Branch the same seed lexicon across two rule pipelines and compare how competing sound changes split related languages.

## What it does

- Takes a shared list of seed words.
- Applies selectable sound-change rules to Branch A and Branch B.
- Computes descendant forms for both branches.
- Measures branch drift with per-word edit distance.
- Summarizes the closest pair, widest split, and average branch distance.
- Projects a drift atlas so the active rule stacks read like competing regional pressures.

## Why this project exists

The portfolio already has many systems and operations simulations. This one widens the surface area into language history while still keeping the core interaction systemic: a small change in the rule stack can produce very different families.

It clears the portfolio originality bar because the mechanic is not "adjust sliders and watch a chart." The user is authoring two competing historical timelines and reading the consequences word by word.

## Files

- `index.html`: layout, branch controls, and results table
- `styles.css`: editorial dark theme with side-by-side branch cards
- `script.js`: rule pipelines, edit-distance scoring, and summary generation

## Local run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/sound-shift-studio/`.
