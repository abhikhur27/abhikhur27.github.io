# CSV Column Profiler

Static browser utility for profiling pasted CSV data before import, modeling, or dashboard work.

## Features

- Paste raw CSV directly into the page.
- Auto-detect or override delimiters.
- Infer column types across numbers, booleans, dates, text, and mixed fields.
- Surface null-heavy columns, duplicate rows, and low-cardinality fields.
- Copy a compact profiling brief for QA handoffs.
- Export a markdown report with column-level findings.

## Why This Exists

CSV files usually fail quietly. The first problem is often not a parse crash, but a mixed-type column, sparse field, or duplicate row that only becomes obvious later in ETL, modeling, or manual cleanup.

This project keeps the workflow static and immediate: paste data, inspect the risks, and leave with a brief you can reuse.

## Local Run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/csv-column-profiler/`.

## GitHub Pages Compatibility

- Static HTML, CSS, and JavaScript only.
- No backend or build step.
- Safe to host directly from the repository.

## Portfolio Positioning

- Honest label: browser-based CSV QA utility.
- Strongest demo move: paste one messy export, call out two flagged columns, then copy the profiling brief.
- Quality bar: keep the analysis actionable instead of turning the page into a giant analytics dashboard.
