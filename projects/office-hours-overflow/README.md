# Office Hours Overflow

Decision simulation about running overloaded CS office hours without breaking fairness, comprehension, or TA stamina.

## Core idea

You play the TA lead during a help-room surge. Each round forces a tradeoff:

- move the queue quickly
- teach concepts deeply
- protect staff energy
- keep the room feeling fair

This passes the portfolio originality bar because the interaction is not "tweak inputs and read a chart." The user has to inhabit an operating role and commit to irreversible queue-management choices under pressure.

## What is in the build

- Four authored rounds with distinct help-room scenarios
- Four tracked system metrics:
  - comprehension
  - fairness
  - TA energy
  - queue load
- Visible tradeoff previews on every choice
- Shift log and dynamic status commentary
- End-of-shift debrief that reflects the strategy you actually used

## Files

- `index.html`: structure for hero, scoreboard, round choices, and debrief
- `styles.css`: editorial, low-light visual system for the lab
- `script.js`: round engine, metric updates, and ending logic

## Local run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/projects/office-hours-overflow/`.

## GitHub Pages compatibility

- Fully static
- No build tooling
- Relative assets only
