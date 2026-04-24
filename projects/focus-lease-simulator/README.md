# Focus Lease Simulator

Interruption-management game about leasing deep-work blocks across a day instead of pretending focus is an infinite background resource.

## Core idea

You play through eight work blocks. Each block introduces a different interruption pressure. The goal is not to eliminate interruptions; it is to decide when to absorb the hit, when to defer it, and when to protect momentum anyway.

## Why it clears the originality bar

- The user has a concrete role: protect a limited day of focus.
- Each turn creates a real tradeoff between present momentum and future debt.
- Different decision patterns produce meaningfully different end states.
- The payoff is experiential. You feel the compounding cost of context switching instead of reading a static explanation about it.

## Mechanics

- `Accept Now`: lowers debt but breaks the current focus run.
- `Defer`: preserves some momentum but pushes urgency into later blocks.
- `Protect Focus`: grows the uninterrupted streak, but debt rises faster.
- Deep-work output is earned block by block from current focus, energy, debt, and streak state.

## Files

- `index.html`: page structure and game surface.
- `styles.css`: editorial dark theme with two-column board + sidebar layout.
- `script.js`: event deck, state updates, scoring loop, and clipboard brief export.

## Local run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/focus-lease-simulator/`.

## GitHub Pages compatibility

- Fully static HTML/CSS/JS.
- No build step.
- Safe to host directly from the repo.
