# Rate Limit Policy Lab

Static browser lab for comparing rate-limiting policies before an API gateway rule gets justified with the wrong traffic story.

## What it does

- Generates steady, burst-launch, or spiky request traffic.
- Compares three policies on the exact same traffic:
  - Fixed Window
  - Sliding Window
  - Token Bucket
- Reports admitted requests, dropped requests, admit rate, worst five-second burst loss, and largest admitted five-second window.
- Renders a per-second timeline for one selected policy.
- Copies a concise recommendation brief for notes or review handoff.

## Why it belongs in the portfolio

This is a practical systems-design utility, not just another chart demo. The point is to make burst behavior visible:

- fixed windows are easy to explain but harsh at boundaries
- sliding windows smooth edge effects but are less intuitive
- token buckets absorb bursts well but depend heavily on refill tuning

## Local run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/rate-limit-policy-lab/`.

## GitHub Pages compatibility

- Static HTML/CSS/JS only
- No backend
- No build step
