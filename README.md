# ElectriGo Digital Twin

> Real-time simulation platform for testing "what-if" scenarios on battery swap station networks

A comprehensive digital twin of an EV battery swap station network in Delhi NCR, enabling virtual testing of operational changes, emergency scenarios, and demand fluctuations before real-world deployment.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Quick Start](#-quick-start)
- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Simulation Theory](#-simulation-theory--algorithm-design)
- [API Integrations](#-api-integrations)
- [Database Schema](#-database-schema)
- [Authentication](#-authentication)
- [Project Structure](#-project-structure)
- [Usage Guide](#-usage-guide)

---

## 🎯 Overview

**ElectriGo Digital Twin** simulates a city-wide battery swap station network with real-time driver behavior, station operations, and network dynamics. It models:

- **8-20 Real Stations** from Delhi NCR (via Open Charge Map API)
- **15-40 Drivers** with autonomous routing and battery management
- **Real-time Weather** effects on demand (Open-Meteo API)
- **Carbon Intensity** tracking (Electricity Maps API)
- **Operational Scenarios** (demand surges, station failures, capacity changes)

### Key Benefits

✅ **Risk-free Testing** - Test network changes virtually before deployment
✅ **Emergency Planning** - Simulate station failures and rerouting
✅ **Demand Forecasting** - Model weather and time-of-day demand patterns
✅ **Capacity Optimization** - Find optimal charger counts and inventory levels
✅ **Cost Analysis** - Track operational costs vs. throughput

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account (for database & auth)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/hacksmart.git
cd hacksmart

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase keys and API tokens

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# APIs (Optional - has fallbacks)
ELECTRICITY_MAPS_API_KEY=your_electricity_maps_key
OPEN_CHARGE_MAP_API_KEY=your_ocm_key
```

---

## ✨ Features

### 1. Interactive Dashboard
- **Live Network Map** - Leaflet-based map with real-time station and driver positions
- **Station Status** - Color-coded markers (green=operational, yellow=low stock, orange=overloaded, red=emergency)
- **Driver Tracking** - See all active drivers moving in real-time
- **KPI Metrics** - Average wait time, throughput, utilization, lost swaps
- **Network Health** - Overall system health percentage with sub-metrics

### 2. Drivers Page
- **Real-time Table** - All drivers with battery level, state, target station, wait time
- **Live Updates** - Table refreshes every tick as simulation runs
- **Detailed Stats** - Swaps today, owed amount, travel time
- **State Indicators** - Visual badges for idle/traveling/queued/swapping states

### 3. Simulation Controls
- **Play/Pause/Reset** - Full simulation control
- **Speed Control** - 0.5x, 1x speeds for faster/slower testing
- **Time Display** - Current simulation time and day counter
- **Scenario Selection** - Switch between Demand and Failures scenarios

### 4. Scenario System
- **Demand Scenario** - Weather-driven demand fluctuations (active by default)
- **Failures Scenario** - Manually toggle station emergencies and test rerouting
- **Reset Button** - Quick return to baseline demand scenario

### 5. Analytics & Visualizations
- **Station Performance** - Per-station metrics, utilization, swaps, inventory
- **KPI History** - Time-series charts showing trends over last 2 hours
- **Weather Integration** - Real-time weather display with demand multiplier
- **Carbon Tracking** - Live carbon intensity (g CO2/kWh)

### 6. Data Persistence
- **Supabase Sync** - Auto-saves simulation state every 5 seconds
- **Historical Snapshots** - Station snapshots every 5 minutes for analytics
- **Cross-page Sync** - Simulation continues when switching between pages

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  Dashboard (/page.tsx)           Drivers Page (/drivers)        │
│  - Network Map (Leaflet)         - Driver Table                 │
│  - Live Metrics                  - State Filters                │
│  - Scenarios Panel               - Real-time Updates            │
│  - Station Performance                                          │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ↓
        ┌──────────────────────────┐
        │  SimulationProvider      │
        │  (Global Context)        │
        │  - Manages engine        │
        │  - Syncs to Supabase     │
        └──────────┬───────────────┘
                   │
        ┌──────────┴──────────┐
        ↓                     ↓
   ┌─────────────┐    ┌──────────────┐
   │  Engine     │    │  Supabase    │
   │  (Memory)   │◄───┤  PostgreSQL  │
   │             │────►              │
   └─────────────┘    └──────────────┘
        │
        ├─ Stations (8-20)
        ├─ Drivers (15-40)
        ├─ KPIs (real-time metrics)
        └─ Weather/Carbon data
```

### Data Flow

```
External APIs
    │
    ├─ Open-Meteo (Weather)
    ├─ Electricity Maps (Carbon)
    └─ Open Charge Map (Stations)
         │
         ↓
    Next.js API Routes (/api/*)
         │
         ↓
    SimulationProvider (React Context)
         │
         ↓
    SimulationEngine (Core Logic)
         │
         ├─ tick() every (1000/speed) ms
         ├─ generateDemand()
         ├─ updateDrivers()
         ├─ updateStations()
         └─ recalculateKPIs()
              │
              ↓
         setState callback
              │
              ├─→ React components re-render
              └─→ Supabase sync (throttled 5s)
```

### Component Architecture

```
App Layout
├── AuthProvider (Authentication)
└── SimulationProvider (Simulation State)
    ├── Sidebar (Navigation)
    │   ├── Dashboard button → /
    │   └── Drivers button → /drivers
    ├── Header (Controls)
    │   ├── Logo
    │   ├── Time & Day display
    │   ├── Speed selector (0.5x, 1x)
    │   ├── Play/Pause button
    │   ├── Reset button
    │   └── Weather & Carbon indicators
    └── Page Content
        ├── Dashboard (/)
        │   ├── Left Panel
        │   │   ├── LiveMetrics (KPIs)
        │   │   ├── Scenarios
        │   │   ├── NetworkHealth
        │   │   └── CombinedStats (Charts)
        │   └── Right Panel
        │       ├── MapView (Leaflet map)
        │       └── StationPerformance (Table)
        └── Drivers (/drivers)
            ├── Stats cards (counts by state)
            └── Drivers table (real-time)
```

### Station State Machine

```
         ┌──────────────┐
         │ OPERATIONAL  │  (Green, 60%+ inventory)
         └────┬───────┬─┘
              │       │
      ┌───────┘       └──────────┐
      │                          │
      ↓                          ↓
┌──────────┐            ┌──────────────┐
│LOW-STOCK │  (Yellow)  │ OVERLOADED   │  (Orange)
│(20-60%)  │            │(queue>2×ch)  │
└──────┬───┘            │ or <20% inv  │
       │                └──────┬───────┘
       │                       │
       └───────────┬───────────┘
                   │
                   ↓
            ┌──────────────┐
            │  EMERGENCY   │  (Red, manual failure)
            └──────┬───────┘
                   │ toggleStationFailure()
                   ↓
               REROUTE all traveling drivers
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.4 | React framework with App Router & SSR |
| **React** | 19.2.3 | UI component library |
| **TypeScript** | 5.x | Type-safe development |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **Recharts** | 3.7.0 | Data visualization (charts) |
| **Leaflet** | 1.9.4 | Interactive maps |
| **React Leaflet** | 5.0.0 | React wrapper for Leaflet |
| **Lucide React** | 0.563.0 | Icon library |

### Backend & Database
| Technology | Purpose |
|------------|---------|
| **Supabase** | PostgreSQL database + Authentication |
| **Supabase SSR** | Server-side auth helpers |
| **PostgreSQL** | Relational database (via Supabase) |

### External APIs
| API | Purpose | Fallback |
|-----|---------|----------|
| **Open-Meteo** | Real-time weather data (temperature, precipitation) | 30°C, 1.0x multiplier |
| **Electricity Maps** | Carbon intensity (g CO2/kWh) | 720 g CO2/kWh |
| **Open Charge Map** | Real EV charging station locations | Hardcoded 20 stations |

### Development
- **ESLint 9** - Code linting
- **Node.js 20+** - Runtime
- **npm/yarn** - Package management

---

## 🧮 Simulation Theory & Algorithm Design

The simulation engine (`src/simulation/engine.ts`) is a **discrete-event, time-stepped simulation** operating in continuous 2D space.

### Core Simulation Loop

Each **1-minute tick** executes:
1. **Advance time** by 1 minute
2. **Generate demand** (Poisson arrivals)
3. **Update drivers** (movement, queuing, swapping)
4. **Update stations** (charging, inventory, queues)
5. **Recalculate KPIs** (aggregate metrics)
6. **Record history** (every 5 minutes)
7. **Notify React** (trigger re-render)

### 1. Demand Generation - Poisson Process

New swap requests arrive following a **Poisson distribution**:

```typescript
lambda = DEMAND_CURVE[hour] * weatherMultiplier * randomVariation * scaleFactor

// randomVariation: 0.7-1.3 (±30%)
// scaleFactor: 0.3 * (stationCount / 8)

driversToGenerate = poissonRandom(lambda)
```

**Demand Curve** (24-hour pattern):
```
Hour:  00  01  02  03  04  05  06  07  08  09  10  11
Mult:  0.2 0.15 0.1 0.1 0.15 0.3 0.5 0.8 1.2 1.0 0.9 0.85

Hour:  12  13  14  15  16  17  18  19  20  21  22  23
Mult:  0.9 0.85 0.8 0.85 0.9 1.3 1.5 1.4 1.2 0.9 0.6 0.35
```

**Weather Multiplier:**
- Clear: 1.0x
- Rain/Thunder: 1.3-1.5x (more demand)
- Snow: 1.3x
- Extreme temperature: 1.1-1.3x

### 2. Station Selection - Weighted Scoring Heuristic

When a driver needs a swap:

```typescript
// Score all operational stations with inventory
score = euclideanDistance(driver, station) + avgWaitTime * 3

// Select top 3 by score
// Weighted random selection: P(station) ∝ 1/score
```

**Why this approach:**
- Balances proximity and wait time
- Not purely deterministic (models human choice)
- Fast: O(n log n) for n stations
- No complex graph pathfinding needed

### 3. Driver Rerouting - Greedy Nearest-Neighbor

When a station fails:

```typescript
// Find all drivers traveling to failed station
driversToReroute = drivers.filter(d =>
    d.targetStationId === failedStationId &&
    d.state === 'traveling'
)

// For each driver:
score = euclideanDistance(driver, station) + avgWaitTime * 2
newTarget = min(score) among operational stations

// If no inventory anywhere → mark as abandoned
```

### 4. Driver Movement - Linear Interpolation

Drivers move at constant speed in 2D space:

```typescript
direction = normalize(targetPosition - currentPosition)
newPosition = currentPosition + direction * min(DRIVER_SPEED, remainingDistance)

// DRIVER_SPEED = 8 units/min
// Space: 100×100 units (represents ~50km × 50km)
```

**Arrival detection:**
```typescript
if (distance <= DRIVER_SPEED) {
    driver.position = station.position  // Snap to station
    if (queue === 0 && inventory > 0) {
        driver.state = 'swapping'
    } else {
        driver.state = 'queued'
        station.queueLength++
    }
}
```

### 5. Wait Time Modeling - M/M/c Queue Approximation

Station wait times approximate a **multi-server queue**:

```typescript
avgWaitTime = (queueLength * AVG_SWAP_DURATION) / activeChargers

// AVG_SWAP_DURATION = 4 minutes
// activeChargers = parallel service capacity
```

### 6. Battery Charging - Probabilistic Model

Each tick, batteries have a chance to complete charging:

```typescript
chargeProb = min(0.95, activeChargers * 0.06)

// Per-charger contribution to completion probability
// More chargers → faster charging
// Random check each tick
```

**Charger refilling:**
```typescript
// 15% chance per tick to move uncharged battery to charger
if (Math.random() < 0.15 && unchargedCount > 0) {
    unchargedBatteries--
    chargingBatteries++
}
```

### 7. KPI Calculations

**Charger Utilization:**
```typescript
utilization = (totalChargingBatteries / totalActiveChargers) * 100
```

**City Throughput (swaps/hour):**
```typescript
throughput = (totalSwapsInLast60Min / 60) * 60
```

**Average Wait Time:**
```typescript
avgWaitTime = sum(station.avgWaitTime * station.queueLength) /
              sum(station.queueLength)
```

### Algorithm Summary

| Component | Method | Complexity | Rationale |
|-----------|--------|-----------|-----------|
| Demand arrivals | Poisson process | O(1) | Models realistic random bursts |
| Station selection | Weighted scoring | O(n log n) | Balances distance + wait time |
| Rerouting | Greedy nearest | O(n) | Fast emergency response |
| Movement | Linear interpolation | O(1) | Simple continuous motion |
| Wait times | M/M/c approximation | O(1) | Models parallel service |
| Charging | Probabilistic | O(1) | Stochastic battery readiness |
| Distance | Euclidean 2D | O(1) | No map dependency |

---

## 🌐 API Integrations

### 1. Open-Meteo Weather API

**Endpoint:** `https://api.open-meteo.com/v1/forecast`
**Location:** Delhi NCR (28.6139°N, 77.2090°E)
**Route:** `/api/weather`

**Response:**
```json
{
  "temperature": 30,
  "condition": "Clear",
  "description": "Clear sky",
  "multiplier": 1.0,
  "isFallback": false
}
```

**Demand Multipliers:**
- Clear: 1.0x
- Rainy/Thunderstorm: 1.3-1.5x
- Snow: 1.3x
- Extreme heat (>40°C): 1.2x
- Extreme cold (<5°C): 1.3x

### 2. Electricity Maps Carbon API

**Endpoint:** `https://api-access.electricitymaps.com/free-tier/carbon-intensity/latest`
**Zone:** IN-NO (India Northern Grid)
**Route:** `/api/carbon`

**Response:**
```json
{
  "carbonIntensity": 720,
  "zone": "IN-NO",
  "timestamp": "2026-02-01T12:00:00Z",
  "isFallback": false
}
```

### 3. Open Charge Map Stations API

**Endpoint:** `https://api.openchargemap.io/v3/poi/`
**Parameters:**
- `latitude=28.6139`
- `longitude=77.2090`
- `distance=50` (km)
- `maxresults=200`

**Route:** `/api/stations`

**Adapter:** Converts OCM format to internal `Station` type:
```typescript
// OCM structure → Station structure
{
  id: ocm.ID,
  name: ocm.AddressInfo.Title,
  latitude: ocm.AddressInfo.Latitude,
  longitude: ocm.AddressInfo.Longitude,
  chargers: ocm.NumberOfPoints || 4,
  operator: ocm.OperatorInfo?.Title,
  // ... + simulation-specific fields
}
```

---

## 🗄️ Database Schema

### Tables

#### `stations`
```sql
CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ocm_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    location TEXT,
    address TEXT,
    operator TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    chargers INTEGER DEFAULT 4,
    active_chargers INTEGER DEFAULT 4,
    charger_type TEXT DEFAULT 'standard',
    inventory_cap INTEGER DEFAULT 20,
    current_inventory INTEGER DEFAULT 15,
    charging_batteries INTEGER DEFAULT 0,
    queue_length INTEGER DEFAULT 0,
    avg_wait_time DOUBLE PRECISION DEFAULT 0,
    total_swaps INTEGER DEFAULT 0,
    lost_swaps INTEGER DEFAULT 0,
    status TEXT DEFAULT 'operational',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `drivers`
```sql
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    state TEXT DEFAULT 'idle',
    target_station_id UUID REFERENCES stations(id),
    battery_level DOUBLE PRECISION DEFAULT 50,
    wait_time DOUBLE PRECISION DEFAULT 0,
    travel_time DOUBLE PRECISION DEFAULT 0,
    owed_amount DOUBLE PRECISION DEFAULT 0,
    swaps_today INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `simulation_state`
```sql
CREATE TABLE simulation_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_running BOOLEAN DEFAULT FALSE,
    is_paused BOOLEAN DEFAULT TRUE,
    speed INTEGER DEFAULT 1,
    simulation_time TIMESTAMPTZ DEFAULT NOW(),
    day INTEGER DEFAULT 1,
    active_scenario_type TEXT DEFAULT 'demand',
    active_scenario_params JSONB DEFAULT '{}'::JSONB,
    weather_data JSONB,
    carbon_data JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `station_snapshots` (Analytics)
```sql
CREATE TABLE station_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID REFERENCES stations(id),
    snapshot_time TIMESTAMPTZ NOT NULL,
    current_inventory INTEGER,
    queue_length INTEGER,
    status TEXT,
    total_swaps INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
CREATE INDEX idx_stations_ocm_id ON stations(ocm_id);
CREATE INDEX idx_stations_status ON stations(status);
CREATE INDEX idx_drivers_state ON drivers(state);
CREATE INDEX idx_station_snapshots_station_time
    ON station_snapshots(station_id, snapshot_time DESC);
```

### Row Level Security (RLS)

All tables have RLS enabled with policies allowing authenticated users to read/write:

```sql
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stations"
    ON stations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can update stations"
    ON stations FOR UPDATE
    TO authenticated
    USING (true);
```

---

## 🔐 Authentication

### Supabase Auth Integration

**Provider:** Supabase (PostgreSQL + JWT tokens)
**Storage:** HTTP-only cookies (secure)
**Methods:** Email/password authentication

### Auth Flow

```
┌──────────────┐
│  Login Page  │
│  /login      │
└──────┬───────┘
       │ Enter email + password
       ↓
┌──────────────────────┐
│ Server Action        │
│ login(formData)      │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ Supabase Auth        │
│ signInWithPassword() │
└──────┬───────────────┘
       │
       ├─ ✅ Valid → JWT token
       │           → HTTP-only cookie
       │           → Redirect to /
       │
       └─ ❌ Invalid → Error message
                     → Stay on /login
```

### Session Management

**Middleware** (`src/middleware.ts`):
- Runs on every request
- Refreshes Supabase session
- Validates JWT token
- Redirects unauthenticated users to `/login`

**Protected Routes:**
- `/` (Dashboard)
- `/drivers`

**Public Routes:**
- `/login`
- `/auth/callback`
- `/api/*`

### Logout

```typescript
// Clears Supabase session
await supabase.auth.signOut()
// Clears cookies
// Redirects to /login
```

---

## 📂 Project Structure

```
hacksmart/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── page.tsx              # Dashboard (/)
│   │   ├── drivers/
│   │   │   └── page.tsx          # Drivers list page
│   │   ├── login/
│   │   │   ├── page.tsx          # Login UI
│   │   │   └── actions.ts        # Auth server actions
│   │   ├── auth/callback/        # OAuth callback handler
│   │   ├── api/                  # API routes
│   │   │   ├── weather/route.ts
│   │   │   ├── carbon/route.ts
│   │   │   └── stations/route.ts
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Global styles
│   │
│   ├── components/               # React components
│   │   ├── SimulationProvider.tsx  # Global simulation context
│   │   ├── AuthProvider.tsx        # Auth context
│   │   ├── Providers.tsx           # Combined providers
│   │   ├── Header.tsx              # Top navigation bar
│   │   ├── Sidebar.tsx             # Side navigation
│   │   ├── MapView.tsx             # Leaflet map
│   │   ├── LiveMetrics.tsx         # KPI cards
│   │   ├── Scenarios.tsx           # Scenario selector
│   │   ├── NetworkHealth.tsx       # Health gauge
│   │   ├── StationPerformance.tsx  # Station table
│   │   └── CombinedStats.tsx       # Charts
│   │
│   ├── hooks/
│   │   └── useSimulation.ts      # Simulation context hook
│   │
│   ├── lib/                      # Utilities & services
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser client
│   │   │   ├── server.ts         # Server client
│   │   │   ├── middleware.ts     # Auth middleware
│   │   │   └── simulation.ts     # DB operations
│   │   ├── geoUtils.ts           # Geo conversions
│   │   ├── stationAdapter.ts     # OCM → Station adapter
│   │   ├── weatherService.ts     # Weather integration
│   │   ├── carbonService.ts      # Carbon integration
│   │   └── export.ts             # Data export
│   │
│   ├── simulation/               # Simulation engine
│   │   ├── types.ts              # TypeScript interfaces (150 lines)
│   │   └── engine.ts             # Core engine logic (608 lines)
│   │
│   └── middleware.ts             # Next.js request middleware
│
├── supabase/                     # Database setup
│   ├── migrations/
│   │   ├── 20260131155410_create_profiles.sql
│   │   └── 20260201000000_create_simulation_tables.sql
│   └── snippets/                 # SQL helpers
│
├── public/                       # Static assets
├── tests/                        # E2E & unit tests
├── .env.local                    # Environment variables (not committed)
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

### Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/simulation/engine.ts` | 608 | Core simulation logic |
| `src/simulation/types.ts` | ~150 | Type definitions |
| `src/components/SimulationProvider.tsx` | ~240 | Global state management |
| `src/components/MapView.tsx` | ~150 | Interactive Leaflet map |
| `src/app/page.tsx` | ~180 | Dashboard UI |
| `src/app/drivers/page.tsx` | ~200 | Drivers table page |
| `src/lib/supabase/simulation.ts` | ~200 | Database operations |

---

## 📖 Usage Guide

### Step 1: Start the Simulation

1. **Navigate to Dashboard** (`/`)
2. **Click "Run Simulation"** in the header
3. **Adjust speed** (0.5x or 1x) if needed
4. **Watch the map** - Drivers appear and move toward stations

### Step 2: Monitor KPIs

**Live Metrics Panel** (left sidebar):
- **Avg Wait Time** - Should stay under 5 minutes
- **Lost Swaps** - Target: 0 (indicates full coverage)
- **Charger Utilization** - Optimal: 60-80%
- **City Throughput** - Swaps per hour across network
- **Active Drivers** - Real-time driver count

### Step 3: Test Scenarios

#### Demand Scenario (Active by Default)
- Weather automatically affects demand
- Higher demand during rain/extreme temperatures
- Peak hours: 6pm-8pm (1.4-1.5x multiplier)

#### Failures Scenario
1. **Click a station** on the map (becomes selected)
2. **Click "Failures"** button in Scenarios panel
3. **Station turns red** (emergency state)
4. **Watch drivers reroute** to other stations
5. **Toggle again** to restore station

### Step 4: View Drivers

1. **Click Drivers icon** in sidebar
2. **See all active drivers** in real-time table
3. **Filter by state** (traveling, queued, swapping)
4. **Monitor battery levels** and wait times

### Step 5: Reset & Restart

- **Reset button** in header → Clears all drivers, resets metrics, pauses simulation
- **Scenario reset** → Returns to Demand scenario (baseline)

### Step 6: Analyze Performance

**Station Performance Table:**
- View per-station metrics
- Identify bottlenecks (high queue, low inventory)
- Compare utilization across stations

**Combined Stats Charts:**
- KPI trends over last 2 hours
- Historical performance data
- Identify patterns and spikes

---

## 🎯 Scenarios Explained

| Scenario | What It Tests | How to Use |
|----------|---------------|------------|
| **Demand** | Weather-driven demand fluctuations | Active by default, varies with weather |
| **Failures** | Station emergency response & rerouting | Select station → Click "Failures" |

### Scenario Parameters

**Demand Scenario:**
- **Weather multiplier:** 1.0-1.5x based on real weather
- **Time-of-day curve:** 0.1-1.5x across 24 hours
- **Random variation:** ±30% per tick

**Failures Scenario:**
- **Emergency toggle:** Manual station failure
- **Automatic rerouting:** Drivers traveling to failed station rerouted
- **Lost swaps tracking:** Drivers with no available alternative counted

---

## 🚧 Future Enhancements

### Planned Features
- [ ] Advanced routing (A* pathfinding with road networks)
- [ ] Battery range constraints in routing
- [ ] Dynamic re-routing on queue changes
- [ ] Multi-user collaboration (WebSockets)
- [ ] Historical data analytics dashboard
- [ ] Machine learning demand prediction
- [ ] More scenario types (pricing, growth, capacity)
- [ ] Export simulation results (CSV, JSON)
- [ ] Mobile app companion
- [ ] API for external integrations

### Performance Optimizations
- [ ] Web Worker for simulation engine (8x+ speeds)
- [ ] Redis caching for API responses
- [ ] Batch database updates
- [ ] Lazy loading for large driver lists
- [ ] Virtual scrolling for tables

---

## 🤝 Contributing

Contributions welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Open-Meteo** for weather data
- **Electricity Maps** for carbon intensity data
- **Open Charge Map** for real EV charging station locations
- **Supabase** for database and authentication infrastructure
- **Leaflet** for interactive mapping
- **Next.js** team for the amazing framework

---

## 📞 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ for a sustainable EV future**
