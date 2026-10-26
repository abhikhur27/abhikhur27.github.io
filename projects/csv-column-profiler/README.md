# CSV Column Profiler

Portfolio status (October 26, 2026): the CSV Quality Checker listing is retired. This source is retained for reference, not endorsed as a portfolio-ready project. Do not relist or reskin it through automation.

A browser tool that checks pasted CSV data for missing values, mixed column types, and duplicate rows.

## Features

- Paste raw CSV directly into the page.
- Auto-detect or override delimiters.
- Infer column types across numbers, booleans, dates, text, and mixed fields.
- Flag columns with many missing values, duplicate rows, and columns with few distinct values.
- Copy a short summary of the findings.
- Export a markdown report with column-level findings.

## How the checks work

The page guesses each column's type from its values and counts empty cells and repeated rows. It puts mixed-type columns and columns with more missing data first. These are basic checks, so an unflagged file can still have problems this tool does not detect.

## Local Run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/csv-column-profiler/`.

## GitHub Pages Compatibility

- Static HTML, CSS, and JavaScript only.
- No backend or build step.
- Safe to host directly from the repository.

## Try the sample

Load the sample order export. It includes a repeated order and a word in a numeric column. Check the flagged rows, then copy the summary or download the report.
