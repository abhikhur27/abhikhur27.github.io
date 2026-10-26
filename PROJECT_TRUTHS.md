# Project Truths

These are the non-negotiable truths for this portfolio.

## Homepage truths

- Use `https://abhikhur.com` as the canonical portfolio URL in metadata, resumes, and future public references. The GitHub Pages hostname is only a redirect alias; actual GitHub repository URLs remain unchanged.
- Keep the approved dark engineering-index direction: near-black background, a narrow reading column, muted green links, and no decorative card grid.
- Preserve the existing personal photograph and personal bio. Keep the face visible when cropping responsively.
- Keep a working, current one-page resume link in the navigation and introduction.
- State the dual degree in Computer Science and Mathematics. Include current undergraduate research in RADA on quantum Bayesian optimization (QBO) without inventing dates, publications, or results.
- Each selected project must identify a concrete deliverable. Prefer a live tool, real sample output, downloadable artifact, or reproducible documented experiment. Never fabricate benchmark results or expose private trading data and returns.
- The homepage must be easy to understand on a first visit.
- Browsing projects is more important than clever portfolio mechanics.
- If a section makes the site harder to navigate, it should be removed or simplified.
- Visitors should never need to learn "how the website works" before they can read the work.
- Avoid clutter-heavy copy blocks and dashboard-like "panel farms" that bury the core project action.
- If a project page has too many explanatory cards, keep only the controls, primary output, and one concise results surface.
- Keep visual styling clean and restrained; do not ship gradient-heavy "AI-generated" looking surfaces as the default UI.
- Prefer flat backgrounds, clear contrast, and readable spacing over decorative visual effects.
- Keep portfolio cards and section copy short. If a card needs a paragraph to be understood, the copy is too dense.
- Default to low-clutter layouts with fewer controls and less on-page text.
- Do not add extra homepage hero taglines, category slogans, or decorative project-section headlines unless explicitly requested.
- Do not add homepage filtering chips, tabs, or category controls unless they are clearly necessary.
- Default homepage project browsing should be a simple list/grid of projects, not a navigation system.
- Preserve the existing more personal bio paragraph unless I explicitly ask to change or remove it.

## Content truths

- Do not publish templates, placeholders, scaffolding, or "fill this in later" sections on `main`.
- Do not ship self-referential gimmicks like pinning my own projects unless there is a very strong reason.
- If no real physical builds are published yet, say that directly instead of hosting a fake shelf.
- If a project is unfinished, confusing, or not portfolio-ready, it should stay off the homepage.
- If a project is a weak standalone but has one useful mechanic, fold the idea into an anthology instead of keeping a separate public folder.
- Rollback Call (`rollback-call`), Incident Handoff Builder (`incident-handoff-builder`), Lease Decision Guide (`projects/lease-decision-guide`), and CSV Quality Checker (`projects/csv-column-profiler`) are retired from portfolio selection as of October 26, 2026. Preserve their source and repository history; do not relist, rename, reskin, or recreate them as new portfolio projects. A useful isolated mechanic may be reused inside a genuinely substantial maintained product without a new public project card.
- Existing source code, an attractive screenshot, or an old automation recommendation is not evidence that a project deserves a public listing. Apply the same quality gate to old and new work.

## Project-labeling truths

- Label web projects honestly.
- If something is a browser simulation or static web app, say `HTML, CSS, JavaScript` clearly.
- Do not let names like `OS Scheduler Simulator` imply C, C++, Rust, Java, or native systems work when the implementation is actually web-based.
- Prefer phrases like `Browser demo`, `Browser tool`, or `Static web project` when that is the truth.
- Avoid weak suffix naming. Do not end public project titles with labels like `Simulator`, `Studio`, `Lab`, `Playground`, `Hub`, or similar filler unless there is a concrete, defensible reason.
- Do not publish "AI-slop game" style project framing; names should be plain, concrete, and credible.

## Direction truths

- The portfolio should increasingly include real utility software, not only concept sims.
- Prioritize genuinely useful, substantial developer tools and AI workflows: tools that complete a real recurring task, remove meaningful manual work, or make a technical workflow more reliable. Windows software, applied research tooling, and productivity utilities remain options when they meet that bar.
- New work should bias toward usefulness, installability, and real workflows.
- Non-browser repos are a priority direction when they are substantive and applied.
- Strong non-browser lanes include applied machine learning, quantitative finance research tooling, and quantum-computing-adjacent experiments with real technical depth.
- Automation should actively favor high-quality standalone repos in those lanes over adding another browser demo variation.
- New work should usually deepen an existing maintained repo instead of creating another standalone repository.
- Small CLI utilities belong in `portfolio-utility-suite` by default unless there is a strong reason they need independent lifecycle, packaging, or branding.
- A rare new standalone project is acceptable only after it has been deliberated across multiple runs and is clearly stronger than another small utility, browser demo, or portfolio gimmick.
- A new name, framework, LLM wrapper, chat interface, prompt preset, or generic CRUD/dashboard shell is not meaningful differentiation. State the nontrivial implementation and the measurable workflow improvement over existing alternatives.
- Successful GitHub projects and stars may inspire problem selection and engineering study. Never promise stars, adoption, popularity, revenue, or benchmark gains; report only verified results and clearly label hypotheses.
- A smaller number of sharper, more believable projects is better than a huge pile of same-family experiments.
- The current public repo intentionally keeps only a small curated set of internal subprojects.
- Future automation runs should prioritize sustained improvements to one practical repo at a time, rotating across strong existing projects such as `portfolio-utility-suite`, `applied-ml-signal-lab`, `lower-48-warlines`, and `projects/transit-network-lab`.
- WebGL/Three.js work is welcome when useful, but should be one option among many platforms, not the default path.

## Strong-project evidence gate

- Use `docs/portfolio-originality-rubric.md` before selecting, proposing, building, or recommending a project. Prefer deep improvements to a strong existing repository; do not produce a project merely to fill an automation run.
- Identify a specific target user, recurring problem, complete input-to-output workflow, and useful deliverable. Explain why an existing tool or simpler implementation does not already solve it adequately.
- Provide installation or reproducible setup instructions with prerequisites, a minimal working example, realistic sample inputs, expected outputs, and explicit limitations. A screenshot-only demo is insufficient.
- Require meaningful automated tests for core logic, invalid inputs, and failure/recovery paths. AI workflows also need a reproducible evaluation set, a baseline, quality/failure metrics, and evidence that the model adds value; a successful API response is not a quality evaluation.
- Before calling a workflow working or portfolio-ready, verify the documented end-to-end path from a clean checkout in a fresh environment, using redistributable fixtures or a documented bounded live check. Record the commit, commands, environment, and observed output. If credentials, access, or dependencies prevent verification, report it as blocked or partial and do not claim the gate passed.
- Technical depth must support the real workflow, not inflate it with architecture or interface clutter. Never invent users, production use, integrations, benchmarks, research results, or performance claims.
- Keep an otherwise useful project off the homepage until its evidence gate passes. Installation fixes, reliability, tests/evals, documentation, and removal of weak work are valid automation outcomes.

## Automation truths

- Default to simplification, clarity, and honesty.
- Execute portfolio automation only on desktop `ABHIONEMILLION`, never on laptop `ABHIKHUR` or another laptop. Keep duplicate laptop jobs paused. Required repositories, runtimes, dependencies, fixtures, and authorized integrations must be available on the desktop; do not make laptop execution or laptop-local files a prerequisite. Report missing desktop prerequisites instead of silently falling back to the laptop.
- The October 26, 2026 retirement and strong-project evidence gate override older project lists, incubation notes, automation memory recommendations, and generic instructions to add small utilities. Never resurrect a retired listing to satisfy a rotation or publishing quota.
- Work directly on the current/default branch, normally `main`, unless the owner explicitly requests isolation or a pull request. Never create or push `codex/*` branches.
- Before automated homepage writes, verify its checkout is on the detected default branch (`main`), not a stale `codex/*` branch. If it is not, stop that write and report the checkout state; do not reset, force-switch, publish the stale branch, or discard user work to repair it.
- Do not add extra routing layers, compare trays, pinning systems, or portfolio meta-features unless explicitly requested.
- Do not inflate project UIs with excessive coach/diagnostic/lens boards that duplicate the same signal in different wording.
- Prefer one strong, actionable result surface over many verbose summary panels.
- Keep control surfaces tight: do not ship large button walls when a smaller set of primary actions can do the job.
- Treat "button budget" as a quality gate. If a new button is not clearly essential to the core workflow, remove it or keep it behind a dev-only path.
- Avoid "AI-slop game" style projects unless there is clear functional use and technical depth.
- Before creating a new project, check whether it is actually distinct from existing work.
- Before creating a new repo, assume the answer is no and look for a way to improve, merge, or retire existing work first.
- If a new-project idea appears promising, write or refine an incubation note first; build it only after the idea survives repeated scrutiny.
- Before publishing anything, ask: would a stranger immediately understand what this is and why it exists?
- If GitHub pinned repos change, homepage project ordering should reflect that priority when it does not create self-referential clutter.
