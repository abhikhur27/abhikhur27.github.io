# Queue Discipline Studio

Static queue-policy game about choosing who gets served first when fairness, throughput, and exception handling all pull in different directions.

## Core idea

You run a strained service desk across six rounds. Each round changes the mix of short jobs, long jobs, and priority cases. The point is not to find one universally best policy. It is to feel how different queue disciplines create visible winners, visible losers, and different trust costs.

## Why it clears the originality bar

- The user occupies a concrete operational role with bounded authority.
- Each turn turns a classic scheduling concept into a social policy decision instead of a sterile formula.
- The scoring axes conflict on purpose: speed, fairness optics, backlog control, and abandonment do not move together.
- The result is experiential. You can feel why "efficient" and "defensible" are not the same thing in service systems.

## Mechanics

- `Hold FIFO`: preserves fairness optics but can let backlog creep.
- `Fast-Lane Short Jobs`: improves throughput while making longer waits feel harsher.
- `Escalate Priority Cases`: protects urgent or VIP work while the rest of the line absorbs the visible skip.

## Files

- `index.html`: page structure and shift surface.
- `styles.css`: static editorial theme for the board + sidebar layout.
- `script.js`: scenario deck, scoring loop, and clipboard brief export.

## Local run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/queue-discipline-studio/`.

## GitHub Pages compatibility

- Fully static HTML/CSS/JS.
- No build step.
- Safe to host directly from the repo.
