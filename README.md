# Abhi Khurana Portfolio

Main personal site for project demos and an in-progress engineering blog.

## Live Site

- URL: `https://abhikhur27.github.io/`

## Focus of this version

- Dark "digital spaces" visual language.
- Project directory with category filtering.
- Blog-style expandable writing shelf for draft essays.
- Fully static architecture for GitHub Pages.

## Included subprojects in this repo

- `projects/transit-network-lab`
- `projects/sports-analytics-explorer`
- `projects/rail-headway-sandbox`
- `projects/market-regime-lab`

## Technical design

- `index.html`: semantic structure for hero, projects, and blog sections.
- `styles.css`: shared ink-style design system.
- `script.js`: project filters, reveal-on-scroll, and mobile nav behavior.

```mermaid
flowchart TD
  A[Portfolio Home] --> B[Project Index]
  A --> C[Blog Shelf]
  B --> D[Internal Subprojects]
  B --> E[External Repo Demos]
```

## Accessibility and UX

- Keyboard-accessible nav and filter controls.
- `Skip to content` support.
- Reduced-motion handling.
- Responsive layout for mobile and desktop.

## Local usage

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Client request email automation

A Spark-safe Firebase email pipeline is included at:

- `automation/client-request-email`

It provides:

- A Firestore batch-update helper that queues emails whenever a client request is updated.
- A scheduled GitHub Action worker that sends queued emails via SMTP.
- A polished HTML email template with plain-text fallback.

Setup docs and exact env variables are in:

- `automation/client-request-email/README.md`

## Future improvements

- Add CI for link checks and HTML validation.
- Add richer blog post pages per topic.
- Move project metadata into a single manifest.
