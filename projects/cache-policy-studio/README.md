# Cache Policy Studio

Static cache-policy sandbox for reasoning about TTL, stale-while-revalidate windows, and request pressure.

## What It Models

- Requests per minute
- Base hit rate
- TTL window
- Stale-while-revalidate allowance
- Origin latency
- Payload size

The simulator converts those controls into a rough request mix across edge hits, revalidations, and origin misses, then surfaces:

- estimated edge latency
- origin calls per minute
- approximate bandwidth footprint
- stale-read risk

## Why It Exists

This project makes caching tradeoffs legible in portfolio form. Instead of talking about cache policy abstractly, it turns the knobs into a small systems decision surface.

## Files

- `index.html`: page structure and metric cards
- `styles.css`: editorial dashboard styling
- `script.js`: policy math, presets, and live metric updates

## Local Run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/cache-policy-studio/`.
