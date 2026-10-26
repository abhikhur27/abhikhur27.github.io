# Merge Conflict Studio

Browser exercises for combining changes from two Git branches.

## Idea

Each example shows a common original file and two edited versions. Write a merged version that keeps the required changes:

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

## What the checks tell you

The score checks whether specific text appears and how many lines match the reference merge. It does not parse, compile, or execute your code. A high score is useful feedback for the exercise, not proof that the result works.

## Tech

- HTML
- CSS
- JavaScript

## Local run

```bash
python -m http.server 8000
```
