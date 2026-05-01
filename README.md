# Abhi Khurana Portfolio

Main personal site for project demos and an in-progress engineering blog.

## Live Site

- URL: `https://abhikhur27.github.io/`

## Focus of this version

- Dark "digital spaces" visual language.
- Project directory with category filtering.
- Blog-style expandable writing shelf for draft essays.
- Build-to-blog bridge board that surfaces the projects with the strongest visible writing momentum.
- Writing queue board that keeps the next three closest-to-shipping drafts visible.
- Reading-route board that turns the visible draft shelf into a guided three-stop blog path.
- Shipping board that ranks visible drafts by how close they are to becoming full posts.
- Draft shelf summary cards for visible stages and topic mix.
- Topic atlas cards that turn the draft shelf into lane-based navigation.
- A linked-trails layer that bridges projects with the drafts already growing out of them.
- Route composer that turns the current project filter into a build -> contrast -> draft path.
- A real-life builds shelf for physical projects (3D prints, woodworking, robotics, homelab logs).
- Fully static architecture for GitHub Pages.
- Stage-aware draft shelf filters for planning the blog pipeline.
- Shareable project and draft-shelf view links so filtered homepage states can be sent directly.
- Draft dashboard pipeline cards that surface the fastest lane and most-linked build in the current writing view.
- Visitor quick-start modes that turn the homepage into an intent-based project router.
- Project compare tray that pins up to three builds and turns them into a copyable side-by-side pitch.

## Included subprojects in this repo

- `projects/transit-network-lab`
- `projects/sports-analytics-explorer`
- `projects/rail-headway-sandbox`
- `projects/market-regime-lab`
- `projects/queueing-resilience-lab`
- `projects/cache-policy-studio`
- `projects/latency-budget-planner`
- `projects/incident-command-lab`
- `projects/patch-window-commander`
- `projects/detour-dispatch`
- `projects/registration-rush-command`
- `projects/office-hours-overflow`
- `projects/systems-decision-labs`
- `projects/sound-shift-studio`
- `projects/merge-conflict-studio`
- `projects/sprint-cutline`
- `projects/schema-drift-command`
- `projects/failure-mode-atlas`
- `projects/control-loop-lab`
- `projects/handoff-briefing-lab`
- `projects/race-condition-lab`
- `projects/dependency-drift-triage`
- `projects/state-compression-drill`
- `projects/probe-budget-lab`
- `projects/focus-lease-simulator`
- `projects/assumption-ledger-lab`
- `projects/retry-storm-studio`
- `projects/error-budget-broker`
- `projects/postmortem-redaction-lab`
- `projects/queue-discipline-studio`
- `projects/escalation-tree-lab`

## Technical design

- `index.html`: semantic structure for hero, project index, real-life builds shelf, blog sections, and topic filters.
- `projects/systems-decision-labs`: anthology page that groups the repeated campus/infrastructure decision sims into one portfolio family.
- `projects/cache-policy-studio`: cache policy sandbox for TTL, stale windows, and origin-load tradeoffs.
- `projects/latency-budget-planner`: latency budgeting surface for turning network/backend/render slices into loader and optimistic-UI guidance.
- `projects/sound-shift-studio`: branching sound-change sandbox for exploring language drift.
- `projects/merge-conflict-studio`: three-way merge training game for practicing conflict resolution under behavioral constraints.
- `projects/sprint-cutline`: release-week prioritization game about cutting scope without breaking trust.
- `projects/schema-drift-command`: schema migration decision game about compatibility shims, partner trust, and contract cutovers.
- `projects/failure-mode-atlas`: incident clue-to-failure mapping tool that ranks likely failure families and next diagnostic actions.
- `projects/control-loop-lab`: feedback-stability simulator for lag, gain, damping, and queue spill tradeoffs.
- `projects/handoff-briefing-lab`: incident handoff simulator where the player chooses the five updates that the next shift actually needs.
- `projects/race-condition-lab`: concurrency decision lab for request ordering, idempotency, mutexes, and autosave conflict handling.
- `projects/dependency-drift-triage`: dependency maintenance triage game for choosing upgrades under security, compatibility, and release-window constraints.
- `projects/state-compression-drill`: incident handoff writing game for compressing noisy operational state into a five-fact packet.
- `projects/probe-budget-lab`: observability budgeting game about placing limited probes before an incident reveals what your telemetry can and cannot explain.
- `projects/focus-lease-simulator`: interruption-management game about leasing deep-work blocks while pressure, debt, and context-switch residue build over a day.
- `projects/error-budget-broker`: release-week reliability game about spending a finite error budget across growth, trust, and operator pressure.
- `projects/retry-storm-studio`: retry amplification sandbox for tuning retries, jitter, overlap, fanout, and idempotency before failures turn into self-inflicted load storms.
- `projects/postmortem-redaction-lab`: incident disclosure game about choosing what the public report says versus what the internal follow-up keeps, then scoring trust, learning, and legal exposure.
- `projects/queue-discipline-studio`: service-line policy game about choosing between FIFO fairness, short-job throughput, and priority-case escalation under visible queue pressure.
- `projects/escalation-tree-lab`: incident-routing game about paging the right responder under containment, trust, fatigue, and blast-radius pressure.
- `styles.css`: shared ink-style design system.
- `script.js`: project filters, result-count feedback, linked build/draft trails, build-to-blog bridge board, topic-atlas navigation, writing shelf spotlight controls, shipping board scoring, writing pipeline briefs, shareable filtered-view links, stage filters, and mobile nav behavior.
- Homepage launch window: a direct bridge between the newest build and the blog lanes it should turn into writing.
- `docs/portfolio-originality-rubric.md`: the bar future projects must clear before they get built.

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

## Future improvements

- Add CI for link checks and HTML validation.
- Add richer blog post pages per topic once the draft shelf narrows them into finished essays.
- Move project metadata into a single manifest.
