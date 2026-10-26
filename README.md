# Abhi Khurana Portfolio

Main personal site for curated project demos.

## Live Site

- URL: `https://abhikhur.com/`

## Current Direction

- Simpler homepage-first browsing.
- Honest labels for browser-based work.
- Blog and physical-build sections are disabled on the public site for now.
- No public placeholders or templates on `main`.
- Static GitHub Pages frontend, with an isolated opt-in anonymous counter backend.
- Future direction: substantial developer tools and AI workflows with real utility, reproducible installation, meaningful tests/evals, and clean-checkout end-to-end verification.

## Included Subprojects In This Repo

- `projects/transit-network-lab`
- `projects/market-regime-lab`
- `projects/systems-decision-labs`
- `projects/merge-conflict-studio`
- `projects/failure-mode-atlas`
- `projects/return-window-tribunal`
- `projects/release-brief-studio`
- `projects/json-shape-diff-studio`
- `projects/sql-index-advisor`

These directories retain existing source; inclusion here is not a portfolio-readiness endorsement. Homepage selection must pass `PROJECT_TRUTHS.md` and the quality rubric.

## Retired Portfolio Listings

As of October 26, 2026, Rollback Call (`rollback-call`), Incident Handoff Builder (`incident-handoff-builder`), Lease Decision Guide (`projects/lease-decision-guide`), and CSV Quality Checker (`projects/csv-column-profiler`) are no longer selected portfolio projects. Source and repository history are preserved. Automation must not relist, rename, reskin, or recreate them as new portfolio pieces.

## Standalone Project Repositories

- `https://gridiron-dex.com`
- `https://github.com/abhikhur27/gridirondex`
- `https://socksthegecko.com`
- `https://github.com/abhikhur27/bogglebot`
- `https://github.com/abhikhur27/warframe-auction-market`
- `https://github.com/abhikhur27/portfolio-utility-suite`
- `https://github.com/abhikhur27/applied-ml-signal-lab`
- `https://github.com/abhikhur27/context-constellation-rag`
- `https://github.com/abhikhur27/cache-policy-simulator`
- `https://github.com/abhikhur27/lower-48-warlines`
- `https://brick-brick.org`

## Technical Design

- `index.html`: semantic structure for hero, curated project index, and a small writing lane.
- homepage utility software is consolidated behind one maintained utility-suite card instead of many tiny CLI cards.
- `styles.css`: shared visual system for the portfolio homepage.
- `script.js`: mobile navigation, active-section state, and direct-card hash handling.
- `visitor-mark.mjs` and `visitor-config.mjs`: opt-in "I was here" button with a shared count, persistent per-browser mark, receipt-gated saves, and idempotent retries. The configuration contains only a public publishable key.
- `supabase/`: the dedicated free-tier counter backend, migration, privacy/abuse boundaries, and backend tests. No private Life Organizer services are exposed; see [counter documentation](supabase/README.md).
- hash-linked cards inside collapsed sections now auto-open their parent disclosure for direct navigation.
- homepage browser-only section now stays collapsed by default so the first scan stays utility-first.
- `projects/json-shape-diff-studio`: static JSON comparison utility for schema and payload drift.
- `PROJECT_TRUTHS.md`: portfolio constraints that future changes and automations should follow.
- `docs/portfolio-originality-rubric.md`: usefulness, differentiation, installation, test/eval, and clean-checkout evidence required for existing and future projects.
- `docs/portfolio-automation-message-update.md`: maintained instructions for the existing recurring automation; strong-project maintenance takes priority over new-project output.

## Accessibility And UX

- Keyboard-accessible navigation, disclosures, and visitor button.
- `Skip to content` support.
- Responsive layout for mobile and desktop.

## Local Usage

```bash
python -c "import http.server,mimetypes; mimetypes.add_type('text/javascript','.mjs'); http.server.ThreadingHTTPServer(('127.0.0.1',8765),http.server.SimpleHTTPRequestHandler).serve_forever()"
```

Then open `http://127.0.0.1:8765`. This explicitly sets the module MIME type on Windows; the counter allows this preview origin. The site still works if the counter backend is unavailable, without fabricating marks or a count.

Run the dependency-free frontend and backend handler checks with Node.js 24+:

```bash
node --test tests/*.test.mjs supabase/tests/handler.test.mjs
```

Live write smoke tests are opt-in and require targeted synthetic-mark cleanup, as documented under `supabase/`. Do not run those as scheduled health checks.

## Future Improvements

- Add CI for link checks and HTML validation.
- Move project metadata into a single manifest.
- Deepen genuinely useful developer tools and AI workflows before adding projects; report verified capability and limitations, never promised popularity or stars.
