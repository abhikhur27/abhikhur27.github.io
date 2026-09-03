# Route Ledger — Project Incubation

Status: **proposal, deliberation run 1 of at least 3**  
Started: 2026-09-03  
Build authorization: **not granted yet**

## Decision so far

Keep the idea alive for a second deliberation run. Do not create a repository or begin implementation yet.

Route Ledger is currently the strongest new-project hypothesis because it combines a concrete local user problem with backend, data, reliability, and product depth that the portfolio does not yet show. It still has to prove that schedule revisions create meaningful saved-trip changes often enough to justify a product.

## One-sentence product test

> Route Ledger watches public transit schedule revisions and tells a commuter exactly how a saved trip will change before the new timetable takes effect.

A stranger should understand the job without hearing “dashboard,” “visualizer,” “AI,” or “portfolio project.”

## Target user and pain

Primary user: a North Texas commuter who repeats the same school or work trip and plans around transfers.

The failure is not “I need another trip planner.” It is discovering too late that a published timetable revision moved a departure, removed a connection, changed a service day, or made a saved transfer infeasible.

The initial local wedge is credible:

- Dallas Area Rapid Transit publishes one GTFS Schedule feed across bus, rail, TRE, trolley, and streetcar service.
- DART says the feed is republished for both major service changes and smaller weather/event changes, recommends checking for new datasets frequently, and exposes an archive.
- GTFS provides versioned, structured stops, routes, trips, calendars, transfers, and stop times that can be compared reproducibly.

Sources:

- [DART fixed-route schedule and archive](https://www.dart.org/about/about-dart/fixed-route-schedule)
- [Canonical GTFS Schedule reference](https://gtfs.org/documentation/schedule/reference/)
- [GTFS overview](https://gtfs.org/documentation/overview/)

## Core workflow

1. A user saves an origin, destination, travel date pattern, and arrive-by or depart-after time.
2. The ingestion worker downloads and hashes each new agency GTFS archive.
3. A schedule-aware router evaluates the saved journey against both the previous and incoming feed.
4. The diff engine classifies the effect: unchanged, shifted, different transfer, slower, faster, or no longer routable.
5. The user receives one concise notice with the old and new itinerary, effective date, and source-feed provenance.
6. The same comparison is available through an API and a minimal web history view.

The notification is the product payoff. A map is optional supporting context, not the product.

## Why this is an internship-strength gap filler

The strongest existing work already demonstrates algorithms, deterministic simulations, applied ML, RAG evaluation, local utilities, and browser interaction. It does not yet demonstrate a maintained multi-component service with scheduled ingestion, durable relational state, API design, background jobs, deployment, and user-facing reliability.

Current 2027 internship postings reinforce that gap:

- [Datadog](https://careers.datadoghq.com/detail/8052095/) emphasizes distributed systems, cloud-native infrastructure, reliability, and real-time data processing.
- [Zip](https://jobs.ashbyhq.com/zip/249837b3-106f-4751-a4f2-03a2c5df5faf) asks interns to build reliable products, scalable frontends, and APIs end to end.
- [Notion](https://jobs.ashbyhq.com/notion/3fba1c39-c5cb-47d7-9ad2-1cec4d7e9d0c) calls for tested, documented work across web services, databases, applications, and tools.
- [Pylon](https://jobs.ashbyhq.com/pylon-labs/fcea8b52-81f1-4b0c-b575-d7b180faec4d/) lists full-stack product work and React, Go, GraphQL, and AWS as useful signals.

Route Ledger can demonstrate those abilities through one coherent user outcome instead of bolting infrastructure onto a toy problem.

## Proposed technical thesis

The technically interesting unit is not a row-level GTFS diff. IDs can churn between feed versions even when service is semantically unchanged. The project must compare the journeys a rider can actually take.

Provisional stack:

- Go service for ingestion, canonicalization, routing, and background evaluation.
- PostgreSQL for agency feeds, immutable snapshot metadata, saved journeys, and evaluation history.
- TypeScript web client for trip setup and one focused change report.
- Docker Compose for a one-command local system.
- GitHub Actions for unit, integration, migration, and fixture-replay gates.
- OpenTelemetry traces and structured logs only after the core workflow works.

Provisional algorithmic core:

- Parse and validate GTFS ZIP files without trusting paths or unbounded archive sizes.
- Canonicalize stop/route/trip identity across snapshots with explicit confidence and fallbacks.
- Use a schedule-aware transit algorithm such as round-based RAPTOR rather than the existing static weighted graph.
- Re-evaluate saved journey constraints under each feed snapshot.
- Produce a semantic itinerary diff with source hashes and deterministic replay fixtures.

## Minimum credible architecture

```text
agency feed URL
      |
scheduled ingest worker
      |
raw SHA-256 snapshot + normalized relational tables
      |
saved-journey evaluation queue
      |
schedule-aware router -> semantic diff -> notification
                               |
                         API + small web view
```

This is one deployable service plus a database for the first release. Kubernetes, Kafka, Redis, microservices, and AI summaries are excluded until load or workflow evidence requires them.

## Data and reliability contracts

The first implementation plan must include:

- Checked-in, redistribution-safe miniature GTFS fixtures with two meaningful schedule versions.
- A raw-feed provenance record: source URL, fetched timestamp, effective range, byte size, and SHA-256.
- Idempotent ingest: processing the same archive twice creates no duplicate version or notices.
- Transactional activation: a partially parsed feed never becomes current.
- Deterministic journey results for a fixed feed, date, and query.
- Notification deduplication and retry behavior.
- Database migration tests from an empty schema and the previous supported schema.
- Resource limits for ZIP expansion, CSV rows, and malformed values.
- An integration test proving a formerly valid transfer becomes infeasible after a five-minute timetable shift.

## Product scope for a first release

Must have:

- One agency: DART.
- Feed archive ingestion and version history.
- Stop lookup and one saved recurring trip.
- Depart-after and arrive-by journey evaluation.
- Old-versus-new itinerary diff.
- In-app notice; email is optional only after deduplication is proven.
- Reproducible local installation and a public read-only demo using fixture data.

Explicitly out of scope:

- A general Google Maps replacement.
- Live vehicle tracking where DART does not provide a public feed.
- Fare purchasing, account linking, or scraping GoPass.
- Crowdsourced delay reports.
- A map-first analytics dashboard.
- Multi-region agency support before the DART workflow is reliable.
- LLM-written alerts; deterministic facts are clearer and safer.

## Differentiation from the existing Transit Network Planner

| Dimension | Transit Network Planner | Route Ledger |
| --- | --- | --- |
| User verb | Design and stress-test a hypothetical network | Save a real trip and receive schedule-change notices |
| Data | Hand-authored static graph | Versioned official GTFS archives |
| Time model | Edge weights in one network state | Calendars, departure times, transfers, and effective dates |
| Failure mode | Link outage disconnects or delays station pairs | Published timetable change breaks a rider's itinerary |
| Runtime | Static browser project | Scheduled backend service with durable state |
| Payoff | Planning insight | Advance warning and an actionable replacement trip |

This clears the duplicate rule on different user verb, information structure, time model, failure mode, and payoff loop. If the product degrades into “upload two GTFS files and view a chart,” it fails the originality rubric and should be rejected.

## Alternatives considered in run 1

### HTTP replay regression gate — rejected for now

The engineering signal was strong, but the product space is already covered deeply by [Keploy](https://keploy.io/docs/), [GoReplay](https://goreplay.org/docs/), and [Hoverfly](https://docs.hoverfly.io/en/latest/). A smaller clone would be a portfolio-shaped developer tool without a defensible user wedge.

### Digital cinema package verifier — rejected for now

The AMC/theater connection was distinctive, but [DCP-o-matic already performs extensive DCP verification](https://dcpomatic.com/manual/pdf/dcpomatic.pdf), including manifest, hash, asset, XML, and bitrate checks. Building a credible alternative would also depend on specialized standards and representative media fixtures that are not currently available.

### Time-series model promotion gate — fold into existing work

Leakage-safe, baseline-aware model promotion remains a strong extension for `applied-ml-signal-lab`, but it is not a separate product yet. [MLflow already supports candidate-versus-baseline metric validation](https://mlflow.org/docs/latest/ml/evaluation), so a standalone tool would need evidence that the time-series policy is valuable beyond the existing repo.

## Competitive questions still open

Run 2 must investigate whether Google Maps, Transit, agency alert systems, or open-source GTFS tools already provide saved-trip **version-to-version** impact notices. General service alerts and current-trip routing do not count as the same job, but an existing exact solution would weaken the proposal.

Run 2 must also download at least two official DART archive versions and answer:

- Do route/trip/stop identifiers remain stable enough to compare?
- How often do schedule versions produce material itinerary changes?
- Can an archive's effective date be inferred reliably?
- Is a UTD-relevant trip changed in any recent pair of feeds?
- Are the source terms compatible with storing small derived fixtures and hashes?

## Build plan if the idea survives

### Phase 0 — evidence before code

- Collect at least six consecutive DART feed versions.
- Build a written change inventory using existing command-line/database tools, not product code.
- Identify three real saved journeys with at least one material historical change.
- Interview or informally test the concept with three commuters.

### Phase 1 — routing contract

- Freeze two reduced GTFS snapshots and expected journey outcomes.
- Implement the importer and schedule-aware routing core.
- Prove deterministic results, archive safety, and semantic diffs.

### Phase 2 — usable product loop

- Add saved journeys, scheduled ingestion, idempotent evaluations, and notices.
- Add one focused TypeScript UI and documented API.
- Ship Docker Compose and CI from the first usable release.

### Phase 3 — production proof

- Deploy the service, collect operational telemetry, and publish a short architecture decision record.
- Demonstrate rollback/reprocessing after a malformed feed.
- Add a second agency only if the first agency has sustained use.

## Promotion gates

The idea may become a standalone repository only after all of these are true:

1. At least three deliberation runs are recorded here.
2. Two real DART snapshots produce a useful semantic journey diff.
3. The exact saved-trip change-notice workflow is not already solved well by a free incumbent.
4. At least three target users say they would save a recurring trip or want the notice.
5. The project cannot be delivered honestly as an extension of the static Transit Network Planner.
6. The first release can be completed as one service, one database, and one small UI within a bounded development cycle.
7. There is a credible deployment and demo path that does not depend on paid or private APIs.

## Kill criteria

Reject or fold the idea into the existing transit project if any of these occur:

- Recent feed versions rarely change rider-visible itineraries.
- Stable comparison requires private agency data or scraping a closed application.
- The value is fully reproduced by existing saved-trip alerts.
- User validation produces interest in maps or analytics but not in recurring-trip notices.
- The implementation becomes a generic GTFS dashboard.
- Reliable journey identity across feed versions requires heuristics that cannot explain their confidence.
- The only impressive part is infrastructure that the user workflow does not need.

## Incubation score — run 1

| Criterion | Score | Current evidence |
| --- | ---: | --- |
| Clear user value | 4/5 | Specific recurring-trip failure; user validation pending |
| Technical depth | 5/5 | Ingestion, temporal routing, semantic diffing, durable jobs |
| Portfolio differentiation | 4/5 | Strongly different runtime and payoff; same transit domain |
| Data feasibility | 3/5 | Official current/archive feeds exist; historical quality untested |
| Competitive differentiation | 3/5 | Exact saved-trip revision alerts still need landscape review |
| Bounded delivery | 3/5 | One-service scope is plausible; routing and identity may expand |

Provisional total: **22/30 — continue incubating, do not build**.

## Deliberation log

### Run 1 — 2026-09-03

- Chose a real transit schedule-change workflow over a generic cloud demo.
- Grounded the data hypothesis in official DART and GTFS sources.
- Defined a backend-first technical thesis and a small product surface.
- Distinguished it from the existing Transit Network Planner across user verb, data, time, failure, runtime, and payoff.
- Rejected two crowded standalone ideas and kept model-promotion work inside the existing ML repo.
- Next decision: validate historical feed behavior and exact competitor overlap before changing the status.
