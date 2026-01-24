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

## 🗂️ Tech Stack

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
