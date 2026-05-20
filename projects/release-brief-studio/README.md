# Release Brief Studio

Static release-communication workspace for turning raw deployment notes into cleaner handoff artifacts.

## What it does

- Captures release name, audience, release type, core changes, risk areas, checks run, and rollout notes.
- Generates four copyable artifacts:
  - release summary
  - QA checklist
  - rollback plan
  - stakeholder update
- Includes two built-in presets so the tool is easy to demo quickly.
- Persists the current worksheet in the URL so a specific release brief can be shared without a backend.

## Why it belongs in the portfolio

This is a practical browser tool rather than another visualizer. It is aimed at a real workflow problem: release communication is often scattered across commit messages, ad hoc notes, and half-structured Slack updates.

## Local run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/release-brief-studio/`.

## GitHub Pages compatibility

- Fully static HTML, CSS, and JavaScript
- No server runtime
- Share state encoded through query parameters only
