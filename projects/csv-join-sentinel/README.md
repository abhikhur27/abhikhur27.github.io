# CSV Join Sentinel

A browser tool for checking how two CSVs join together. It finds repeated IDs and missing matches, then shows a sample of the combined rows.

## What it does

- Parses pasted CSV, TSV, or pipe-delimited text with quoted fields.
- Lets you choose a left key, right key, and join mode.
- Finds repeated keys on each side.
- Counts matched keys and keys that appear in only one file.
- Previews the joined output so row multiplication is visible before export.
- Copies a short summary of the matches and warnings.
- Exports a JSON report with unmatched keys, duplicate groups, and a joined-row sample.

## What to check

Combining tables can change your results even when the code runs successfully:

- duplicate IDs that explode row counts
- mismatched keys that silently drop records
- matching column names that need to be kept separate

The page checks those cases in your browser. The preview is limited to 12 rows, so use the counts and exported report as well as the preview.

## Local run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/csv-join-sentinel/`.
