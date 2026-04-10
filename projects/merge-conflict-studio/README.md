# Merge Conflict Studio

Static project for practicing three-way merge resolution with realistic frontend workflow conflicts.

## Idea

Instead of visualizing git data, this project puts the user in the role of an engineer resolving a conflicted file under concrete behavioral constraints:

- keep accessibility improvements
- preserve analytics or timeout behavior
- avoid shipping a merge that silently drops one branch's intent

## What it includes

- Three merge scenarios with distinct branch intents
- Base / yours / theirs code panes
- Editable merge workspace
- One-click branch loading and naive blend generation
- Constraint-based scoring with pass/fail review notes
- Reference merge reveal for studying the correct resolution

## Why it clears the originality bar

- The user inhabits a specific role: shipping reviewer, not passive observer.
- Different decisions lead to materially different review outcomes.
- The value comes from consequence and synthesis, not from a chart or dashboard.

## Tech

- HTML
- CSS
- JavaScript

## Local run

```bash
python -m http.server 8000
```
