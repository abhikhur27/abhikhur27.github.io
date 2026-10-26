# Release Brief Studio

A browser worksheet that formats your release notes, testing checks, and rollout instructions into text you can copy.

## What it does

- Captures release name, audience, release type, core changes, risk areas, checks run, and rollout notes.
- Formats four sections:
  - release summary
  - QA checklist
  - rollout and rollback notes
  - team or customer update
- Includes two built-in presets so the tool is easy to demo quickly.
- Persists the current worksheet in the URL so a specific release brief can be shared without a backend.

## What to know before sharing

The page uses fixed templates. It does not inspect code, run tests, assess risk, or work out how to undo a release. The output only reflects the notes you enter. Everything entered is included in the share URL, so use notes you are comfortable sharing with anyone who has the link.

## Local run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/release-brief-studio/`.

## GitHub Pages compatibility

- Fully static HTML, CSS, and JavaScript
- No server runtime
- Share state encoded through query parameters only
