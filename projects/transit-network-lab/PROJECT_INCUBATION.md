# Route Ledger — Project Incubation

Status: **proposal, deliberation run 2 of at least 3**

Started: 2026-09-03

Build authorization: **not granted yet**

## Decision so far

Keep the idea alive for one final evidence run. Do not create a repository or begin implementation yet.

The real-feed test proved that DART publishes future-effective schedule changes with rider-visible timing shifts, but it did not find a change in the two UTD-relevant journeys tested. A mature open-source semantic GTFS diff also reduces the novelty of the proposed core. Route Ledger now survives only as a saved-trip impact and notification product, not as a general feed-diff tool. Promotion depends on a measurable recurring-trip hit rate, user demand, and clear rights for public fixtures.

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

## Run 2 evidence from real DART feeds

Run 2 downloaded and inspected four official DART archives without committing the source data:

| Feed | Published role | Effective range | SHA-256 |
| --- | --- | --- | --- |
| `V711-215-216-20260720` | archived revision | 2026-07-20 through 2026-09-13 | `99310c4d92e34353c2e1642bd141f6a1939c4647a1128de5b1e67a80129f5702` |
| `V716-215-216-20260720` | archived revision | 2026-07-20 through 2026-09-13 | `f123dd5ef3f3fd27d501338ea4b39f6561222220a60407a6645a6dcc9b1b0c31` |
| `V720-215-216-20260818` | current active archive on September 4 | 2026-08-18 through 2026-09-13 | `44546ff87dad8e2e2d74bb2e9cd1965b2b2be97a6be3beacc951c6f9187dcd3c` |
| `V731-218-216-20260914` | file served by DART's stable latest URL | 2026-09-14 through 2026-09-20 | `ee49e086c286daafba9f92a63bd5f36341ea1e67bc46e67cae49df278daea35d` |

The DART archive dashboard still identified `V720` as the active version while the stable latest URL already served future-effective `V731`. This is useful product evidence: a consumer can discover the next schedule before it becomes current, but ingestion must model **published**, **effective**, and **active** as separate states.

### Identity and false-positive findings

| Comparison | Stop ID overlap | Route ID overlap | Trip ID overlap | Semantic route overlap | Rider-facing finding on a representative Tuesday |
| --- | ---: | ---: | ---: | ---: | --- |
| `V711` -> `V716` | 100% | 100% | 98.84% | 100% | Five Blue Line trips gained a missing headsign; endpoint times were unchanged |
| `V716` -> `V720` | 99.66% | 100% | 84.47% | 100% | Route 233 changed its headsign; several routes changed intermediate `stop_times` detail without changing endpoints |
| `V720` -> `V731` | 99.97% | 3.95% | 1.87% | 100% | Six routes changed endpoint-time signatures despite near-total route/trip ID churn |

Raw primary-key or row diffs are therefore not a viable product. A major signup can replace almost every route and trip ID while preserving all 92 route identities, and an intermediate-stop representation change can look like 164 changed Route 883W trips even when every endpoint departure and arrival stays the same.

### A useful semantic diff exists

Between `V720` and future-effective `V731`, a weekday Route 003 trip from CBD West Transit Center to SMU/Mockingbird Station moves from `04:30-04:56` to `04:35-05:01`. The five-minute shift is small but rider-visible and available before the new feed becomes active. Other representative Route 109 trips arrive four minutes earlier, while Routes 22, 108, 237, and 238 also contain endpoint timing changes.

This satisfies the narrow data gate that two real snapshots can produce a useful itinerary change. It does not establish that any given commuter is affected often enough to subscribe.

### UTD-relevant trip result

Two Tuesday journey sets were compared across all four feed versions:

- Route 883E, CityLine/Bush Station to University Parkway Circle: all 65 weekday departures and 20-minute endpoint timings stayed identical.
- Route 883W, University Parkway Circle to Frankford at Osage Plaza: all 81 weekday departures and 16-minute endpoint timings stayed identical.

`V720` temporarily omitted many intermediate Route 883W stop rows and `V731` restored them, but the saved-trip endpoint result did not change. A row-level alert would have been noisy; a semantic journey alert should correctly remain silent.

### Source-rights constraint

The feed page calls GTFS an open specification but does not publish a feed-specific reuse license. DART's [site-wide legal notice](https://www.dart.org/about/public-access-information/legal-notices) says commercial use of site materials requires written permission and does not grant redistribution rights. Until DART clarifies the feed license, a public repository should retain source URLs, hashes, and derived findings only. Checked-in tests must use hand-authored synthetic GTFS fixtures or explicitly permission-cleared data.

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

- Checked-in synthetic miniature GTFS fixtures with two meaningful schedule versions; use DART-derived rows only after redistribution rights are explicit.
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

## Competitive findings from run 2

- [Google Maps](https://support.google.com/maps/answer/10271256) can save a frequent transit trip and surface current directions, ETA, and agency alerts. Its official help does not document an old-versus-new timetable comparison or a pre-effective itinerary-change notice.
- [Transit](https://help.transitapp.com/article/96-get-notifications-about-disruptions-on-your-line) sends line-level notifications when an agency publishes a service alert. Its [GO workflow](https://help.transitapp.com/article/549-how-to-use-go) guides a trip leaving within 60 minutes. Neither official workflow documents persistent origin/destination/time constraints evaluated across static schedule versions.
- DART already shares real-time service changes with Google Maps and Transit. Route Ledger must not claim that ordinary disruption alerts are missing.
- [`gtfs-semantic-diff`](https://github.com/niyalist/gtfs-semantic-diff) is a substantial direct overlap: it performs cross-version identity matching and emits 41 categories of semantic route, pattern, timetable, stop, calendar, fare, and metadata changes. A new generic GTFS diff engine would not be differentiated.
- [Transitland](https://www.transit.land/documentation/concepts/static-gtfs-feed-versions/) already archives and identifies feed versions, but it is infrastructure rather than a saved-trip notification product, and historic downloads depend on plan and source-license rules.

The remaining wedge is narrower and clearer: evaluate a rider's saved constraints against an incoming effective schedule, explain only the itinerary impact, and deduplicate one advance notice. The project should reuse or interoperate with existing parsing/diff work where practical rather than presenting feed comparison itself as novel.

## Questions still open for run 3

- Across six consecutive DART versions, how many of three representative recurring journeys receive a material notice?
- Can a version shift make a real transfer infeasible, rather than only move a one-seat ride by a few minutes?
- Will at least three commuters actually save a recurring origin/destination/time constraint for advance notices?
- Does DART provide a feed-specific license or written reuse guidance that permits public derived fixtures and a deployed service?
- Can the MVP stay focused if semantic feed comparison is delegated to an existing component?

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
8. Feed reuse and public-fixture rights are explicit enough for an open repository and deployed demo.

## Gate state after run 2

| Gate | State | Evidence |
| --- | --- | --- |
| Three deliberation runs | pending | Two runs recorded |
| Useful real semantic diff | passed | Route 003 moves five minutes in `V731` before its effective date |
| Exact incumbent overlap | provisional pass | No documented exact saved-trip revision notice; generic semantic diff is already solved |
| Three-user demand | blocked | No user validation yet |
| Separate from Transit Network Planner | passed | Different data, runtime, user verb, and notification payoff |
| Bounded first release | pending | Narrow workflow is plausible; integration with existing diff tooling needs a decision |
| Public deployment path | provisional pass | Public feed URL exists; operational rights are not yet clear |
| Reuse and fixture rights | blocked | No feed-specific license found |

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

## Incubation score — run 2

| Criterion | Score | Current evidence |
| --- | ---: | --- |
| Clear user value | 3/5 | A real five-minute future shift exists; both UTD-relevant journeys stayed unchanged |
| Technical depth | 4/5 | Saved-constraint evaluation and reliable notices remain deep; generic semantic diff already exists |
| Portfolio differentiation | 4/5 | Strong backend/product gap filler, though it reuses the transit domain |
| Data feasibility | 3/5 | Official archives and effective dates work; representation noise and reuse rights add risk |
| Competitive differentiation | 2/5 | Incumbents cover saved trips and alerts separately, and open source covers semantic feed diff |
| Bounded delivery | 3/5 | One-service scope is possible only if feed diffing is not rebuilt as a second product |

Provisional total: **19/30 — one final evidence run, lean reject unless hit rate and user demand improve**.

## Deliberation log

### Run 1 — 2026-09-03

- Chose a real transit schedule-change workflow over a generic cloud demo.
- Grounded the data hypothesis in official DART and GTFS sources.
- Defined a backend-first technical thesis and a small product surface.
- Distinguished it from the existing Transit Network Planner across user verb, data, time, failure, runtime, and payoff.
- Rejected two crowded standalone ideas and kept model-promotion work inside the existing ML repo.
- Next decision: validate historical feed behavior and exact competitor overlap before changing the status.

### Run 2 — 2026-09-04

- Downloaded and hashed three archived DART feeds plus the future-effective feed already served by the stable latest URL.
- Proved that route/trip primary keys can churn almost completely while all semantic route identities remain stable.
- Found a real five-minute Route 003 schedule shift available before its effective date.
- Verified that two UTD-relevant Route 883 journey sets remain unchanged, including a false-positive intermediate-stop representation change.
- Found strong overlap from `gtfs-semantic-diff`, narrowing the product to saved-trip evaluation and notice delivery.
- Marked public fixture reuse as blocked because DART publishes no feed-specific license on the feed page.
- Next decision: quantify notice hit rate across six versions and three journeys, find one broken-transfer case, and require three-user demand plus rights clarity. Otherwise reject the standalone project.

