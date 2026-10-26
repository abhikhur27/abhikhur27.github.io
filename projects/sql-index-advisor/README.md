# SQL Index Advisor

Paste a SQL query and the columns in your table to get `CREATE INDEX` statements to test. Each suggestion explains which part of the query led to it.

## How it works

The tool uses simple text-matching rules to find table columns in `WHERE`, `JOIN`, `GROUP BY`, and `ORDER BY`. It combines those columns into possible indexes. It does not connect to a database or run the query.

## Features

- Detects likely filter columns from `WHERE` clauses.
- Detects join key usage from `JOIN ... ON`.
- Detects sort/group columns from `ORDER BY` and `GROUP BY`.
- Generates candidate `CREATE INDEX` statements.
- Ranks suggestions with a rule-based score. The score does not measure a speed improvement.
- Includes a join-heavy sample query preset.

## Usage

1. Enter a table name.
2. Enter available columns for that table.
3. Paste a SQL query.
4. Click `Check query`.
5. Review a suggested statement, then test it with your database's query planner before putting it in a migration.

## Scope and limits

- Suggestions are starting points. Validate them with your database planner (`EXPLAIN`, `ANALYZE`).
- The parser uses text matching rather than a full SQL grammar, so complex queries and aliases can be missed or misread.
- It does not know how many rows a table has, how selective a filter is, which indexes already exist, or how much extra work an index adds to writes.
- If it finds no query columns, it suggests the first table column as a fallback. That alone is not evidence that the index will help.
