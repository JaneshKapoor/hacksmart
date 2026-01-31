# BatterySmart Digital Twin

A real-time simulation platform for testing "what-if" scenarios on a battery swap station network.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

---

## 📖 How to Use

### Step 1: Control Center (Main Page)
The main dashboard shows 8 battery swap stations on an interactive map.

| Feature | Description |
|---------|-------------|
| **Network Map** | Visual display of all stations with status colors |
| **KPI Dashboard** | Real-time performance metrics |
| **Scenario Builder** | Test different scenarios |
| **Simulation Controls** | Start, pause, reset, speed controls |

### Step 2: Apply a Scenario

1. **Select a scenario tab** on the right panel:
   - **Demand** → Weather effects (rain, heat) that change demand
   - **Capacity** → Add/remove chargers at stations
   - **Failures** → Simulate emergencies (fire, power outage)
   - **Pricing** → Dynamic peak-hour pricing
   - **Inventory** → Safety stock levels

2. **Configure parameters** using sliders or buttons
3. Click **"Apply Scenario & See Impact"**
4. Click **"Run Simulation"** to start

### Step 3: View Analytics

1. Click **"Analytics"** button in the header
2. See real-time performance charts that update during simulation
3. Compare **Baseline vs Scenario** KPIs
4. Review **Station Performance** table
5. Check **Insights & Recommendations** for AI suggestions

---

## ⏱️ Timeline

| Phase | Action |
|-------|--------|
| **Before** | Select scenario, configure parameters |
| **During** | Watch map animations, monitor KPIs in real-time |
| **After** | Review Analytics page for detailed comparison |

---

## 🎯 Scenarios Explained

| Scenario | What It Tests |
|----------|---------------|
| **Baseline** | Normal network state (no changes) |
| **Demand** | How weather affects swap demand |
| **Capacity** | Impact of adding/removing chargers |
| **Failures** | Emergency response and driver rerouting |
| **Pricing** | Peak pricing to balance demand |
| **Inventory** | Safety stock and battery redistribution |
| **Station Ops** | Adding new stations to network |

---

## Simulation Theory & Algorithm Design

The simulation engine (`src/simulation/engine.ts`) is a **discrete-event, time-stepped simulation** that models a city-wide battery swap station network. It does not use graph-based pathfinding (like Dijkstra or A*) — instead it operates in a continuous 2D coordinate space using Euclidean distances and probabilistic models.

### Core Loop

The engine advances in **1-minute ticks**. Each tick:
1. Generates new swap requests based on demand
2. Updates all driver positions and states
3. Updates station inventory, charging, and queues
4. Recalculates system-wide KPIs

### Demand Generation — Poisson Process

New swap requests arrive following a **Poisson distribution**, the standard statistical model for random independent arrivals (used widely in queuing theory and telecom modeling).

```
lambda = hourlyDemandCurve[currentHour] * weatherMultiplier * 0.2 * (stationCount / 8)
```

- A predefined **demand curve** models time-of-day patterns (higher lambda during rush hours, lower at night).
- Weather and event multipliers scale the base demand up or down.
- The Poisson random variable determines how many requests arrive each minute, producing realistic bursty behavior rather than a constant stream.

### Station Selection — Weighted Scoring Heuristic

When a driver needs a swap, the engine selects a station using a **composite score**:

```
score = euclidean_distance(driver, station) + avgWaitTime * 3
```

- All operational stations are scored and sorted.
- The **top 3** are shortlisted.
- A **weighted random selection** is made using inverse-score probabilities (`P ∝ 1/score`), so closer stations with shorter queues are more likely to be chosen but not deterministic — this models real-world driver behavior where people don't always pick the optimal choice.

### Driver Rerouting — Greedy Nearest-Neighbor

When a station goes offline (fire, power outage, etc.), all en-route drivers are rerouted:

```
score = euclidean_distance(driver, station) + avgWaitTime * 2
```

The engine scans all operational stations with available inventory and picks the one with the lowest combined score. Drivers that can't find any available station are marked as "abandoned" (a lost swap).

### Driver Movement — Linear Interpolation

Drivers move toward their target at a constant speed (`DRIVER_SPEED = 8 units/min`) using **vector-based linear interpolation**:

```
direction = normalize(target_position - current_position)
new_position = current_position + direction * min(speed, remaining_distance)
```

Battery drain is also modeled — low-battery drivers have a probabilistic chance of reaching critical level while traveling.

### Wait Time Modeling — M/M/c Queue Approximation

Station wait times follow a simplified **M/M/c queuing model** (multiple parallel servers):

```
avgWaitTime = (queueLength * AVG_SWAP_DURATION) / activeChargers
```

Where `AVG_SWAP_DURATION = 4 minutes`. This approximates how multiple charger bays serve a queue of waiting drivers in parallel.

### Battery Charging — Probabilistic Model

Each tick, stations have a probability of completing a battery charge:

```
chargeCompletionProbability = min(0.95, activeChargers * 0.06)
```

When a charge completes, the station's ready inventory increases by 1. Empty charger slots are automatically filled from the uncharged battery pool at a rate of 15% per tick.

### Algorithm Summary

| Component | Method | Why |
|---|---|---|
| Demand arrivals | Poisson process | Models realistic random bursty demand |
| Station selection | Weighted score (distance + wait) | Balances proximity with queue length |
| Rerouting | Greedy nearest-neighbor | Fast real-time decision under emergencies |
| Movement | Linear interpolation | Simple continuous motion in 2D space |
| Wait times | M/M/c queue approximation | Models parallel charger service |
| Charging | Per-tick probability | Stochastic battery readiness |
| Distance | Euclidean (no road graph) | Lightweight, no map dependency |

### KPI Metrics Tracked

The engine continuously computes these system-wide metrics by aggregating across all operational stations:

- **Avg Wait Time** — mean wait across all stations
- **Lost Swaps** — drivers who couldn't find an available station
- **Charger Utilization** — ratio of charging batteries to active chargers
- **City Throughput** — estimated swaps per hour across the network
- **Idle Inventory** — batteries sitting unused (not charging, not ready)
- **Operational Cost** — sum of base station cost + per-charger + inventory holding costs
- **Revenue** — total swaps * price per swap
- **Rerouted Drivers** — count of drivers redirected due to station failures
- **Peak Wait Time** — worst-case wait time across all stations

---

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Lucide React** for icons

---

## 📂 Project Structure

```
src/
├── app/                 # Next.js pages
│   ├── page.tsx         # Control Center (main)
│   └── analytics/       # Analytics page
├── components/          # UI components
├── hooks/               # Custom hooks (useSimulation)
└── simulation/          # Engine, types, mock data
```
