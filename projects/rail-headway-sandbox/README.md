# Rail Headway Operations Studio

A route-and-dispatch design tool for rail corridor planning. This version replaces slider-only controls with editable infrastructure, timeline dispatch design, disruption testing, and richer reliability analytics.

## What is new

- Route Builder table
- Edit station names, inter-station spacing, dwell times, and demand weighting.
- Add/remove stations to redesign corridor geometry.

- Dispatch Designer canvas
- Click to add departures, drag markers to retime service, and double-click to remove departures.
- Apply auto-generated dispatch patterns (2.5 to 6 minute service templates).

- Disruption Lab
- Inject incidents with start minute, duration, speed degradation, and dwell penalty.
- Add random incidents for stress testing or clear all incidents to return to baseline.

- Advanced metrics
- Median and P95 headway.
- Expected wait adjusted for headway irregularity.
- On-time performance, bunching alerts, corridor capacity, and demand utilization.
- Fleet requirement estimate derived from round-trip cycle and realized headway.

- Visual analytics
- Live corridor animation for directional train motion and cycle behavior.
- Station arrival heatstrip showing consistency patterns over the operating hour.
- Snapshot table to compare multiple scenarios during tuning.

## Technical model

- Discrete run simulation across editable station segments.
- Dwell and travel-time perturbations with deterministic jitter.
- Incident windows that reduce speed and add dwell penalties.
- Mid-line bunching detection from realized center-station headways.

## Local run

```bash
python -m http.server 8000
```

Open:

```text
projects/rail-headway-sandbox/index.html
```