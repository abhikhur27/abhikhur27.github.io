# Signal Flow Lab

Signal Flow Lab is a browser-based directed-graph simulator for exploring propagation dynamics under different damping and activation-threshold settings.

## What It Demonstrates

- Random directed network generation
- Weighted edge signal propagation
- Damping + threshold-trigger behavior
- Live network metrics (active nodes, peak signal, total energy)

## How To Use

1. Adjust node count, damping, and activation threshold.
2. Click `Randomize Graph` to generate a new topology.
3. Click `Inject Pulse` to create a shock at a random node.
4. Pause/resume the simulation to inspect network state.

## Technical Design

- Node signals update every animation frame.
- New signal values are computed from:
  - damped self-retention
  - incoming weighted edge contributions
  - threshold-based activation boost
- Rendering uses SVG paths for directed flow structure and circle radius/color for node intensity.

## Future Improvements

- Add custom edge editing and manual topology drawing
- Add step-mode timeline with rewind
- Add export/import of graph JSON
