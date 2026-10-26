# Portfolio Quality and Originality Rubric

Apply this to existing listings, automation focus choices, and new proposals. A small collection of substantial, useful, verifiable projects is the goal. Shipping another project is not a goal by itself.

## Retired listings

As of October 26, 2026, do not select or relist Rollback Call (`rollback-call`), Incident Handoff Builder (`incident-handoff-builder`), Lease Decision Guide (`projects/lease-decision-guide`), or CSV Quality Checker (`projects/csv-column-profiler`). Preserve the source and repository history. A rename, reskin, new framework, or expanded description does not undo this decision. Reuse a genuinely useful mechanic only inside a stronger maintained product, without a separate project listing.

Renamed or reskinned stand-ins for those same filler workflows are also banned. Do not fill a vacated listing with a cosmetic replacement.

## Voice check

Keep the latest approved copy as the baseline and use Abhi's plain, professional voice across pages, controls, generated explanations, and introductory documentation. Explain the input, behavior, example output, and real limitations directly. Do not use em dashes, corporate phrasing, inflated claims, or boilerplate privacy-boundary sections. Do not invent personal stories, usage, or results. Keep actual privacy protections and useful technical detail; do not turn them into promotional copy. A maintenance run is not permission for a redesign or a new voice.

## Hard gates

Every gate must have concrete evidence before a project is described as portfolio-ready:

1. **Useful problem:** Name the target user, the recurring task or failure, and the actual input-to-output workflow. Explain what useful work the deliverable completes.
2. **Substantial differentiation:** Compare with existing tools and the portfolio's current work. Identify the nontrivial capability, implementation, or demonstrated workflow improvement. New nouns, a different dataset, a model/API wrapper, or a polished screenshot are insufficient.
3. **Complete product path:** The core workflow must work beyond a canned happy-path demo, with validation, actionable errors, and appropriate recovery. State unsupported cases and real operational boundaries.
4. **Installability and reproducibility:** Include prerequisites, setup/install commands, a minimal example, redistributable sample inputs, expected outputs, and dependency/environment details. An evaluator must be able to reproduce the result without private data or undocumented local state.
5. **Tests and evaluation:** Automate core-logic, invalid-input, regression, and failure-path checks. For AI workflows, include a reproducible evaluation set, a simpler baseline, relevant quality and failure metrics, and evidence that the model improves the workflow. Include cost/latency or privacy limits when relevant. Do not treat one plausible generated answer as an evaluation.
6. **Clean-checkout end-to-end proof:** In a fresh environment, follow the documented setup and run one realistic input through the actual entry point to its output. Record the commit, commands, environment, observed result, and limitations. A unit-test pass, syntax check, screenshot, or mocked model alone does not prove the full workflow. If credentials or upstream access block a necessary live check, mark that part unverified and do not claim the gate passed.
7. **Truthful presentation:** Separate measured results from hypotheses. Do not invent users, production deployments, integrations, adoption, benchmarks, returns, or research outcomes. A visitor should immediately understand the actual deliverable and implementation.

Missing evidence means improve the existing work or keep it off the homepage. A quiet run that documents a blocker or removes clutter is better than an unsupported launch.

## Preferred direction

Favor substantial developer tools and AI workflows that people could reuse: reliable local tooling, reproducible code/data workflows, engineering diagnostics with actionable results, or evidence-backed AI assistance integrated into a complete task. Applied ML, quantitative research tooling, quantum-computing-adjacent experiments, and useful Windows/productivity software are suitable when they clear the same gates.

Prefer maintaining a strong existing repository over starting another. Small utility improvements belong inside an appropriate maintained product, not a new card or repo. Do not pad the portfolio with generic chat interfaces, CRUD shells, prompt collections, one-file validators, dashboard variations, or scenario reskins.

Popular GitHub projects may inspire investigation of real problems and engineering choices. Stars are a discovery signal, not proof of quality or a promised outcome. Never promise popularity, adoption, or stars, and do not copy a project merely because it is popular.

## Duplication and incubation

Before a new proposal, list the closest existing tools and portfolio projects. Explain the concrete gap and why extending an existing repository is inadequate. If the distinction is cosmetic or the workflow could be replaced by a short script, static explanation, or existing tool with little loss, reject or merge the idea.

A rare new standalone project must survive multiple dated proposal/refinement runs. The incubation note must contain the user/problem evidence, alternatives, nontrivial differentiation, scoped workflow, implementation plan, install path, test/eval plan, and clean-checkout acceptance commands. Rejection is a valid conclusion. Incubation does not waive the evidence gate or authorize a public listing before implementation is verified.

## Run record

For each meaningful improvement, record the repository and commit, the user-facing capability improved, the commands/checks and observed results, any unmet gate or remaining risk, and the next highest-value deep-work target. Rotate among credible existing work without reviving weak projects just to vary the name.
