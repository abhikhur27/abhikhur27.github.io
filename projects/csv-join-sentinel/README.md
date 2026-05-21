# CSV Join Sentinel

Static browser tool for diagnosing CSV join failures before they contaminate analysis, reporting, or ad hoc data cleanup work.

## What it does

- Parses pasted CSV, TSV, or pipe-delimited text with quoted fields.
- Lets you choose a left key, right key, and join mode.
- Surfaces duplicate-key pressure on each side.
- Counts matched keys plus left-only and right-only orphan keys.
- Previews the joined output so row multiplication is visible before export.
- Copies a concise join-risk summary for Slack, notes, or review handoff.
- Exports a JSON report with unmatched keys, duplicate groups, and a joined-row sample.

## Why it exists

Most broken joins are not syntax errors. They are quiet data-shape problems:

- duplicate IDs that explode row counts
- mismatched keys that silently drop records
- schema overlap that looks safe until fields collide

This tool makes those failure modes visible in one static page with no backend.

## Local run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/csv-join-sentinel/`.
