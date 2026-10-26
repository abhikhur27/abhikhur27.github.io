# Transit Network Planner

Build and edit a small transit map, plan a trip, and see how closing a connection affects the network. You can compare travel time, transfers, and a score based on the delay caused by individual closures.

## What it does

- Drag stops or add connections with a line name, color, and speed.
- Find the fastest route, the route with fewer transfers, or the route with the lowest closure-delay score.
- Close each connection in turn and check which station pairs lose their route or need a longer trip. This is often called an N-1 check.
- Assign example riders to trips, split them between equally fast routes, and try moving overflow riders to alternatives with room.
- Show backup routes, the weakest connection on your trip, stranded riders, and the total delay across riders.
- Update routes while you drag. The more expensive network-wide closure checks refresh when you release the stop.

## How the rider model works

The example city has six pairs of stops with assigned rider counts. For each trip, riders split evenly across up to 16 equally fast routes. The model then makes up to four passes to move overflow riders onto the fastest alternatives that have spare capacity. The legend shows the capacity used for each connection. Generated cities get smaller example rider counts and default capacities.

The worst closure for riders is ranked first by the number affected, then by riders stranded, additional crowding, and added delay. Added passenger-minutes means the sum of the delays across riders: 10 people delayed by 5 minutes is 50 passenger-minutes. Rider-segments count one rider crossing one connection, so the same person can count more than once on a multi-connection trip.

The model also checks the closure that disconnects the most station pairs. That may be a different closure from the one affecting the most riders. The closure-delay score adds individual connection penalties along a route; it is a comparison score rather than a predicted delay.

These are made-up networks and rider counts. The model gives the same result for the same network, but it is not fitted to real ridership and does not calculate a full traffic equilibrium.

## Verification

```bash
npm run check
npm test
```

The tests cover routing choices, closures, equal-route demand splitting, capacity limits, and alternate routes. GitHub Actions runs them on Node 20 and Node 22 when the project or its workflow changes.

## Local run

```bash
python -m http.server 8000
```

Open `projects/transit-network-lab/index.html`.
