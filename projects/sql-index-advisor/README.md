# SQL Index Advisor

Practical browser tool that inspects a SQL query and proposes candidate index definitions with rationale.

## Why it exists

Index tuning is often done by intuition first and `EXPLAIN` later. This tool gives a quick, transparent first-pass recommendation based on `WHERE`, `JOIN`, `GROUP BY`, and `ORDER BY` patterns.

## Features

- Detects likely filter columns from `WHERE` clauses.
- Detects join key usage from `JOIN ... ON`.
- Detects sort/group columns from `ORDER BY` and `GROUP BY`.
- Generates candidate `CREATE INDEX` statements.
- Scores recommendations with clear tradeoff notes.
- Includes a join-heavy sample query preset.

## Usage

1. Enter a table name.
2. Enter available columns for that table.
3. Paste a SQL query.
4. Click `Analyze Query`.
5. Copy candidate index DDL into your migration workflow.

## Scope and limits

- Heuristic-driven suggestions only; always validate with your DB planner (`EXPLAIN`, `ANALYZE`).
- Does not model cardinality, selectivity, or write amplification costs.
- Best suited for quick triage and interview/portfolio walkthroughs.
