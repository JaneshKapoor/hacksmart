"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSimulation } from "@/hooks/useSimulation";
import type { WeatherData, CarbonData } from "@/simulation/types";
import { LeafletMap } from "@/components/map";
import { Sidebar } from "@/components/layout";
import {
  Station,
  ScenarioType,
  SCENARIO_CATEGORIES,
  WEATHER_OPTIONS,
  FAILURE_TYPES,
} from "@/simulation/types";
import { fetchRealStations } from "@/lib/stationAdapter";
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  MapPin,
  Clock,
  Battery,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronUp,
  Info,
  BarChart3,
  Store,
  Cloud,
  DollarSign,
  ArrowUpRight,
  Shuffle,
  Activity,
  Flame,
  Home,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Cell,
} from "recharts";

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "8px",
  fontSize: "12px",
};

export default function ControlCenter() {
  const router = useRouter();
  const {
    state,
    start,
    pause,
    reset,
    setSpeed,
    setScenario,
    applyInterventions,
    loadStations,
    weatherData,
    carbonData,
  } = useSimulation();
  const [activeScenarioType, setActiveScenarioType] =
    useState<ScenarioType>("baseline");
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  // Scenario parameters
  const [demandMultiplier, setDemandMultiplier] = useState(1.0);
  const [weatherType, setWeatherType] = useState("normal");
  const [failureType, setFailureType] = useState("fire");
  const [chargerChange, setChargerChange] = useState(0);
  const [targetStationId, setTargetStationId] = useState("station-1");
  const [safetyStock, setSafetyStock] = useState(10);
  const [pricingMultiplier, setPricingMultiplier] = useState(1.5);

  // Network scenario
  const [networkDisabledStations, setNetworkDisabledStations] = useState<
    Set<string>
  >(new Set());

  // Growth scenario
  const [growthRate, setGrowthRate] = useState(50);
  const [growthTimeline, setGrowthTimeline] = useState(6);

  // Combined scenario
  const [combinedDemand, setCombinedDemand] = useState(false);
  const [combinedDemandValue, setCombinedDemandValue] = useState(1.3);
  const [combinedCapacity, setCombinedCapacity] = useState(false);
  const [combinedCapacityValue, setCombinedCapacityValue] = useState(4);
  const [combinedPricing, setCombinedPricing] = useState(false);
  const [combinedPricingValue, setCombinedPricingValue] = useState(1.5);

  // Bottom analytics toggle
  const [showStationAnalytics, setShowStationAnalytics] = useState(true);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (state?.isRunning) pause();
          else start();
          break;
        case "KeyR":
          if (!e.metaKey && !e.ctrlKey) {
            reset();
          }
          break;
        case "Digit1":
          setSpeed(1);
          break;
        case "Digit2":
          setSpeed(2);
          break;
        case "Digit3":
          setSpeed(4);
          break;
        case "Digit4":
          setSpeed(8);
          break;
      }
    },
    [state?.isRunning, start, pause, reset, setSpeed],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Auto-load real station data on mount
  useEffect(() => {
    (async () => {
      try {
        const stations = await fetchRealStations();
        if (stations.length > 0) {
          loadStations(stations);
          setTargetStationId(stations[0].id);
        }
      } catch (err) {
        console.error(
          "Failed to load real stations, using simulated data:",
          err,
        );
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Initializing ElectriGo...</p>
        </div>
      </div>
    );
  }

  const formatTimeParts = (minutes: number) => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return {
      hours: String(displayHours),
      mins: mins.toString().padStart(2, "0"),
      ampm,
    };
  };

  const handleScenarioChange = (type: ScenarioType) => {
    setActiveScenarioType(type);
    setScenario(type);
  };

  const handleApplyScenario = () => {
    const interventions = [];
    let feedbackMsg = "";

    if (activeScenarioType === "demand") {
      interventions.push({
        id: `demand-${Date.now()}`,
        type: "demand_shift" as const,
        value: demandMultiplier,
        params: { weather: weatherType },
      });
      feedbackMsg = `Demand increased by ${((demandMultiplier - 1) * 100).toFixed(0)}% (${weatherType.replace("_", " ")})`;
    } else if (activeScenarioType === "failures") {
      interventions.push({
        id: `failure-${Date.now()}`,
        type: "trigger_emergency" as const,
        stationId: targetStationId,
        emergencyType: failureType as
          | "fire"
          | "power_outage"
          | "charger_failure"
          | "overload"
          | "no_battery",
        duration: 120,
      });
      const stationName =
        state.stations.find((s) => s.id === targetStationId)?.name || "Station";
      feedbackMsg = `${failureType.replace("_", " ")} triggered at ${stationName}`;
    } else if (activeScenarioType === "capacity") {
      interventions.push({
        id: `capacity-${Date.now()}`,
        type: "modify_chargers" as const,
        stationId: targetStationId,
        value:
          (state.stations.find((s) => s.id === targetStationId)?.chargers ||
            12) + chargerChange,
      });
      const stationName =
        state.stations.find((s) => s.id === targetStationId)?.name || "Station";
      feedbackMsg = `Chargers ${chargerChange >= 0 ? "increased" : "reduced"} by ${Math.abs(chargerChange)} at ${stationName}`;
    } else if (activeScenarioType === "pricing") {
      interventions.push({
        id: `pricing-${Date.now()}`,
        type: "pricing_change" as const,
        value: pricingMultiplier,
      });
      feedbackMsg = `Dynamic pricing applied (${pricingMultiplier}x during peak hours)`;
    } else if (activeScenarioType === "inventory") {
      interventions.push({
        id: `inventory-${Date.now()}`,
        type: "change_policy" as const,
        params: { safetyStock, rebalanceThreshold: safetyStock * 0.8 },
      });
      feedbackMsg = `Inventory policy applied (safety stock: ${safetyStock} batteries)`;
    } else if (activeScenarioType === "station_ops") {
      interventions.push({
        id: `station-${Date.now()}`,
        type: "add_station" as const,
        position: { x: 55, y: 65 },
        params: { chargers: 8, bays: 40 },
      });
      feedbackMsg = `New station added to network`;
    } else if (activeScenarioType === "network") {
      networkDisabledStations.forEach((stationId) => {
        interventions.push({
          id: `network-disable-${stationId}-${Date.now()}`,
          type: "remove_station" as const,
          stationId,
        });
      });
      feedbackMsg = `${networkDisabledStations.size} station(s) taken offline — testing network resilience`;
    } else if (activeScenarioType === "growth") {
      const monthlyGrowth = Math.pow(1 + growthRate / 100, 1 / 12);
      const totalGrowth = Math.pow(monthlyGrowth, growthTimeline);
      interventions.push({
        id: `growth-${Date.now()}`,
        type: "demand_shift" as const,
        value: totalGrowth,
      });
      feedbackMsg = `${growthRate}% annual growth over ${growthTimeline} months → ${((totalGrowth - 1) * 100).toFixed(0)}% demand increase`;
    } else if (activeScenarioType === "combined") {
      if (combinedDemand) {
        interventions.push({
          id: `combined-demand-${Date.now()}`,
          type: "demand_shift" as const,
          value: combinedDemandValue,
        });
      }
      if (combinedCapacity) {
        state.stations.forEach((s) => {
          interventions.push({
            id: `combined-capacity-${s.id}-${Date.now()}`,
            type: "modify_chargers" as const,
            stationId: s.id,
            value: s.chargers + combinedCapacityValue,
          });
        });
      }
      if (combinedPricing) {
        interventions.push({
          id: `combined-pricing-${Date.now()}`,
          type: "pricing_change" as const,
          value: combinedPricingValue,
        });
      }
      const parts = [
        combinedDemand &&
          `+${((combinedDemandValue - 1) * 100).toFixed(0)}% demand`,
        combinedCapacity && `+${combinedCapacityValue} chargers/station`,
        combinedPricing && `${combinedPricingValue}x pricing`,
      ].filter(Boolean);
      feedbackMsg = `Combined: ${parts.join(" + ")}`;
    } else {
      feedbackMsg = `${SCENARIO_CATEGORIES.find((c) => c.type === activeScenarioType)?.label} scenario applied`;
    }

    applyInterventions(interventions);
    setAppliedFeedback(feedbackMsg);
    setTimeout(() => setAppliedFeedback(null), 3000);
  };

  const kpiData = [
    {
      label: "Avg Wait Time",
      value: state.scenarioKPIs.avgWaitTime,
      baseline: state.baselineKPIs.avgWaitTime,
      unit: "min",
      icon: Clock,
      color: "blue",
      inverse: true,
    },
    {
      label: "Lost Swaps",
      value: state.scenarioKPIs.lostSwaps,
      baseline: state.baselineKPIs.lostSwaps,
      unit: "",
      icon: AlertTriangle,
      color: "red",
      inverse: true,
    },
    {
      label: "Charger Utilization",
      value: state.scenarioKPIs.chargerUtilization * 100,
      baseline: state.baselineKPIs.chargerUtilization * 100,
      unit: "%",
      icon: Zap,
      color: "amber",
      inverse: false,
    },
    {
      label: "City Throughput",
      value: state.scenarioKPIs.cityThroughput,
      baseline: state.baselineKPIs.cityThroughput,
      unit: "/hr",
      icon: TrendingUp,
      color: "emerald",
      inverse: false,
    },
  ];

  const scenarioIcons: Record<string, React.ReactNode> = {
    baseline: <BarChart3 size={14} />,
    station_ops: <Store size={14} />,
    capacity: <Zap size={14} />,
    inventory: <Battery size={14} />,
    demand: <Cloud size={14} />,
    network: <MapPin size={14} />,
    pricing: <DollarSign size={14} />,
    failures: <AlertTriangle size={14} />,
    growth: <ArrowUpRight size={14} />,
    combined: <Shuffle size={14} />,
  };

  const getKPIDelta = (value: number, baseline: number, inverse: boolean) => {
    const diff = value - baseline;
    const pct = baseline !== 0 ? (diff / baseline) * 100 : 0;
    const isBetter = inverse ? diff < 0 : diff > 0;
    return { pct, isBetter };
  };

  // Computed data for Network Health + Combined + Charts
  const operationalCount = state.stations.filter(
    (s) => s.status === "operational" || s.status === "low_inventory",
  ).length;
  const totalStationCount = state.stations.length;
  const healthPct =
    totalStationCount > 0
      ? Math.round((operationalCount / totalStationCount) * 100)
      : 0;
  const totalChargers = state.stations.reduce(
    (sum, s) => sum + s.chargers,
    0,
  );
  const activeChargersCount = state.stations.reduce(
    (sum, s) => sum + s.activeChargers,
    0,
  );
  const avgUtilization =
    totalStationCount > 0
      ? (state.stations.reduce((sum, s) => sum + s.utilizationRate, 0) /
          totalStationCount) *
        100
      : 0;
  const totalInventory = state.stations.reduce(
    (sum, s) => sum + s.currentInventory,
    0,
  );
  const totalCap = state.stations.reduce(
    (sum, s) => sum + s.inventoryCap,
    0,
  );
  const inventoryPct =
    totalCap > 0 ? Math.round((totalInventory / totalCap) * 100) : 0;
  const chargingBatteriesCount = state.stations.reduce(
    (sum, s) => sum + s.chargingBatteries,
    0,
  );

  // Chart data
  const chartData = state.timeSeriesData.map((point) => ({
    time: `${Math.floor(point.time / 60) % 24}:${(point.time % 60).toString().padStart(2, "0")}`,
    waitTime: point.avgWaitTime,
    throughput: point.throughput,
    utilization: point.utilization * 100,
  }));

  const stationBarData = state.stations
    .filter((s) => s.status !== "offline")
    .map((s) => ({
      name: s.name.length > 14 ? s.name.slice(0, 14) + "..." : s.name,
      utilization: Math.round(s.utilizationRate * 100),
    }))
    .sort((a, b) => b.utilization - a.utilization);

  const stationTableData = state.stations
    .map((s) => ({
      id: s.id,
      name: s.name,
      totalSwaps: s.totalSwaps,
      inventory: s.currentInventory,
      inventoryCap: s.inventoryCap,
      utilization: (s.utilizationRate * 100).toFixed(0),
      lostSwaps: s.lostSwaps,
      status: s.status,
    }))
    .sort((a, b) => b.totalSwaps - a.totalSwaps);

  const hasChartData = chartData.length > 0;

  // Donut chart math
  const donutR = 40;
  const donutCirc = 2 * Math.PI * donutR;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 shrink-0 z-50">
          <div className="flex items-center justify-between px-5 h-full">
            {/* Left: Logo + Home + Run */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-base font-bold text-white">
                  Electri<span className="text-cyan-400">Go</span>
                </span>
              </button>

              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors text-xs border border-slate-700/50"
              >
                <Home size={12} />
                Home
              </button>

              <div className="h-6 w-px bg-slate-700/50" />

              {/* Play/Pause/Reset */}
              <div className="flex items-center gap-1.5">
                {!state.isRunning ? (
                  <button
                    onClick={start}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium text-xs transition-colors"
                  >
                    <Play size={13} />
                    Run Simulation
                  </button>
                ) : (
                  <button
                    onClick={pause}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 rounded-lg font-medium text-xs transition-colors"
                  >
                    <Pause size={13} />
                    Pause
                  </button>
                )}
                <button
                  onClick={reset}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
                  title="Reset (R)"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            {/* Center: Status + Time + Speed */}
            <div className="flex items-center gap-4">
              <span
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all ${state.isRunning ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"}`}
              >
                {state.isRunning && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
                {state.isRunning ? "LIVE" : "Paused"}
              </span>
              <span className="text-lg font-bold font-mono tabular-nums">
                {(() => {
                  const t = formatTimeParts(state.time);
                  return (
                    <>
                      {t.hours}
                      <span
                        className={state.isRunning ? "animate-blink-colon" : ""}
                      >
                        {":"}
                      </span>
                      {t.mins}{" "}
                      <span className="text-sm text-slate-400">{t.ampm}</span>
                    </>
                  );
                })()}
              </span>
              <span className="text-xs text-slate-500">Day {state.day}</span>

              <div className="h-5 w-px bg-slate-700/50" />

              <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg">
                {[1, 2, 4, 8].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      state.speed === s
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-700 hover:text-slate-300"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Badges + Avatar */}
            <div className="flex items-center gap-3">
              {weatherData && !weatherData.isFallback && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-sky-500/10 border border-sky-500/30 text-sky-300">
                  <Cloud size={11} />
                  <span>{weatherData.temperature.toFixed(0)}°C</span>
                  <span className="text-slate-500">
                    {weatherData.condition.replace("_", " ")}
                  </span>
                </div>
              )}
              {carbonData && !carbonData.isFallback && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border ${
                    carbonData.carbonIntensity > 800
                      ? "bg-red-500/10 border-red-500/30 text-red-300"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  }`}
                >
                  <Zap size={11} />
                  <span>{carbonData.carbonIntensity} gCO2</span>
                </div>
              )}
              <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs text-slate-400 font-medium">
                A
              </div>
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel */}
          <div className="w-[300px] shrink-0 border-r border-slate-800/80 bg-gradient-to-b from-slate-900/60 to-slate-950/40 flex flex-col overflow-y-auto">
            {/* Live Metrics */}
            <div className="p-4 border-b border-slate-800/60">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm text-white flex items-center gap-2">
                  <Activity size={14} className="text-cyan-400" />
                  Live Metrics
                </h2>
                {state.activeScenario && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] rounded-full font-medium">
                    vs Baseline
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {kpiData.map((kpi) => {
                  const Icon = kpi.icon;
                  const { pct, isBetter } = getKPIDelta(
                    kpi.value,
                    kpi.baseline,
                    kpi.inverse,
                  );
                  const showDelta =
                    state.activeScenario && Math.abs(pct) >= 0.5;
                  const iconColor =
                    kpi.color === "blue"
                      ? "text-blue-400"
                      : kpi.color === "red"
                        ? "text-red-400"
                        : kpi.color === "amber"
                          ? "text-amber-400"
                          : "text-emerald-400";

                  return (
                    <div
                      key={kpi.label}
                      className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Icon size={12} className={iconColor} />
                        <span className="text-[10px] text-slate-400 font-medium">
                          {kpi.label}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline">
                          <span className="text-xl font-bold tabular-nums text-white">
                            {kpi.value.toFixed(
                              kpi.unit === "%" || kpi.unit === "min" ? 1 : 0,
                            )}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-0.5">
                            {kpi.unit}
                          </span>
                        </div>
                        {showDelta && (
                          <div
                            className={`flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded ${isBetter ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}
                          >
                            {isBetter ? (
                              <TrendingUp size={9} />
                            ) : (
                              <TrendingDown size={9} />
                            )}
                            {Math.abs(pct).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scenarios */}
            <div className="p-4 border-b border-slate-800/60">
              <h2 className="font-semibold text-sm text-white flex items-center gap-2 mb-3">
                <Shuffle size={14} className="text-purple-400" />
                Scenarios
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {SCENARIO_CATEGORIES.map((cat) => (
                  <button
                    key={cat.type}
                    onClick={() =>
                      !state.isRunning && handleScenarioChange(cat.type)
                    }
                    disabled={state.isRunning}
                    title={cat.description}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
                      ${
                        activeScenarioType === cat.type
                          ? "bg-blue-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                      }
                      ${state.isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span>{scenarioIcons[cat.type]}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Scenario Controls (non-baseline) */}
            {activeScenarioType !== "baseline" && (
              <div className="p-4 border-b border-slate-800/60">
                {activeScenarioType === "demand" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {WEATHER_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setWeatherType(opt.value);
                            setDemandMultiplier(opt.multiplier);
                          }}
                          className={`p-2 rounded-lg text-left border transition-all text-xs ${
                            weatherType === opt.value
                              ? "bg-blue-500/15 border-blue-500/40 text-blue-300"
                              : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600"
                          }`}
                        >
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-[10px] opacity-70 mt-0.5">
                            {((opt.multiplier - 1) * 100).toFixed(0)}% demand
                          </div>
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-medium mb-1 block">
                        Demand:{" "}
                        <span className="text-blue-400">
                          {(demandMultiplier * 100).toFixed(0)}%
                        </span>
                      </label>
                      <input
                        type="range"
                        min="80"
                        max="200"
                        value={demandMultiplier * 100}
                        onChange={(e) =>
                          setDemandMultiplier(Number(e.target.value) / 100)
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {activeScenarioType === "failures" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {FAILURE_TYPES.map((type) => (
                        <button
                          key={type.value}
                          onClick={() => setFailureType(type.value)}
                          className={`p-2 rounded-lg text-left border transition-all ${
                            failureType === type.value
                              ? "bg-red-500/15 border-red-500/40"
                              : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600"
                          }`}
                        >
                          <span className="text-base block">{type.icon}</span>
                          <div className="text-xs font-medium text-slate-200 mt-0.5">
                            {type.label}
                          </div>
                        </button>
                      ))}
                    </div>
                    <select
                      value={targetStationId}
                      onChange={(e) => setTargetStationId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                    >
                      {state.stations
                        .filter((s) => s.status !== "offline")
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {activeScenarioType === "capacity" && (
                  <div className="space-y-3">
                    <select
                      value={targetStationId}
                      onChange={(e) => setTargetStationId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                    >
                      {state.stations
                        .filter((s) => s.status !== "offline")
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.chargers} chargers)
                          </option>
                        ))}
                    </select>
                    <div>
                      <label className="text-xs text-slate-300 font-medium mb-1 block">
                        Adjustment:{" "}
                        <span
                          className={
                            chargerChange >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }
                        >
                          {chargerChange >= 0 ? "+" : ""}
                          {chargerChange}
                        </span>
                      </label>
                      <input
                        type="range"
                        min="-6"
                        max="10"
                        value={chargerChange}
                        onChange={(e) =>
                          setChargerChange(Number(e.target.value))
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {activeScenarioType === "pricing" && (
                  <div className="space-y-3">
                    <p className="text-[10px] text-slate-500">
                      Higher prices reduce demand but increase revenue.
                    </p>
                    <div>
                      <label className="text-xs text-slate-300 font-medium mb-1 block">
                        Peak Multiplier:{" "}
                        <span className="text-amber-400">
                          {pricingMultiplier}x
                        </span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="2.5"
                        step="0.1"
                        value={pricingMultiplier}
                        onChange={(e) =>
                          setPricingMultiplier(Number(e.target.value))
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {activeScenarioType === "inventory" && (
                  <div className="space-y-3">
                    <p className="text-[10px] text-slate-500">
                      Set safety stock levels and rebalancing rules.
                    </p>
                    <div>
                      <label className="text-xs text-slate-300 font-medium mb-1 block">
                        Safety Stock:{" "}
                        <span className="text-blue-400">
                          {safetyStock} batteries
                        </span>
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="25"
                        value={safetyStock}
                        onChange={(e) =>
                          setSafetyStock(Number(e.target.value))
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {activeScenarioType === "station_ops" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-left hover:bg-emerald-500/15 transition-colors">
                      <span className="text-lg block">+</span>
                      <span className="text-xs font-medium text-emerald-300">
                        Add Station
                      </span>
                    </button>
                    <button className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-left hover:bg-red-500/15 transition-colors">
                      <span className="text-lg block">-</span>
                      <span className="text-xs font-medium text-red-300">
                        Remove Station
                      </span>
                    </button>
                  </div>
                )}

                {activeScenarioType === "network" && (
                  <div className="space-y-3">
                    <p className="text-[10px] text-slate-400">
                      Take stations offline to test resilience.
                    </p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {state.stations
                        .filter((s) => s.status !== "offline")
                        .map((s) => {
                          const isDisabled = networkDisabledStations.has(s.id);
                          return (
                            <button
                              key={s.id}
                              onClick={() => {
                                const next = new Set(networkDisabledStations);
                                if (isDisabled) next.delete(s.id);
                                else next.add(s.id);
                                setNetworkDisabledStations(next);
                              }}
                              className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                                isDisabled
                                  ? "bg-red-500/15 border-red-500/40"
                                  : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center text-[9px] ${
                                  isDisabled
                                    ? "bg-red-500 border-red-500 text-white"
                                    : "border-slate-600"
                                }`}
                              >
                                {isDisabled && "✓"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-slate-200 truncate">
                                  {s.name}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {activeScenarioType === "growth" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-300 font-medium mb-1 block">
                        Growth Rate:{" "}
                        <span className="text-emerald-400">{growthRate}%</span>
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="150"
                        value={growthRate}
                        onChange={(e) =>
                          setGrowthRate(Number(e.target.value))
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-medium mb-1 block">
                        Timeline:{" "}
                        <span className="text-blue-400">
                          {growthTimeline} months
                        </span>
                      </label>
                      <input
                        type="range"
                        min="3"
                        max="24"
                        value={growthTimeline}
                        onChange={(e) =>
                          setGrowthTimeline(Number(e.target.value))
                        }
                        className="w-full"
                      />
                    </div>
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <p className="text-[10px] text-emerald-300">
                        <TrendingUp size={10} className="inline mr-1" />
                        Projected: +
                        {(
                          (Math.pow(
                            Math.pow(1 + growthRate / 100, 1 / 12),
                            growthTimeline,
                          ) -
                            1) *
                          100
                        ).toFixed(0)}
                        % demand
                      </p>
                    </div>
                  </div>
                )}

                {activeScenarioType === "combined" && (
                  <div className="space-y-2">
                    {/* Demand toggle */}
                    <div
                      className={`rounded-lg border transition-all ${combinedDemand ? "bg-blue-500/10 border-blue-500/30" : "bg-slate-800/50 border-slate-700/50"}`}
                    >
                      <button
                        onClick={() => setCombinedDemand(!combinedDemand)}
                        className="w-full flex items-center gap-2 p-2.5 text-left"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center text-[9px] ${combinedDemand ? "bg-blue-500 border-blue-500 text-white" : "border-slate-600"}`}
                        >
                          {combinedDemand && "✓"}
                        </div>
                        <Cloud size={13} className="text-slate-400" />
                        <span className="text-xs font-medium text-slate-200">
                          Demand Surge
                        </span>
                      </button>
                      {combinedDemand && (
                        <div className="px-2.5 pb-2.5">
                          <input
                            type="range"
                            min="100"
                            max="200"
                            value={combinedDemandValue * 100}
                            onChange={(e) =>
                              setCombinedDemandValue(
                                Number(e.target.value) / 100,
                              )
                            }
                            className="w-full"
                          />
                          <div className="text-[10px] text-blue-400 mt-0.5">
                            +{((combinedDemandValue - 1) * 100).toFixed(0)}%
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Capacity toggle */}
                    <div
                      className={`rounded-lg border transition-all ${combinedCapacity ? "bg-emerald-500/10 border-emerald-500/30" : "bg-slate-800/50 border-slate-700/50"}`}
                    >
                      <button
                        onClick={() => setCombinedCapacity(!combinedCapacity)}
                        className="w-full flex items-center gap-2 p-2.5 text-left"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center text-[9px] ${combinedCapacity ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-600"}`}
                        >
                          {combinedCapacity && "✓"}
                        </div>
                        <Zap size={13} className="text-slate-400" />
                        <span className="text-xs font-medium text-slate-200">
                          Add Chargers
                        </span>
                      </button>
                      {combinedCapacity && (
                        <div className="px-2.5 pb-2.5">
                          <input
                            type="range"
                            min="1"
                            max="8"
                            value={combinedCapacityValue}
                            onChange={(e) =>
                              setCombinedCapacityValue(Number(e.target.value))
                            }
                            className="w-full"
                          />
                          <div className="text-[10px] text-emerald-400 mt-0.5">
                            +{combinedCapacityValue}/station
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pricing toggle */}
                    <div
                      className={`rounded-lg border transition-all ${combinedPricing ? "bg-amber-500/10 border-amber-500/30" : "bg-slate-800/50 border-slate-700/50"}`}
                    >
                      <button
                        onClick={() => setCombinedPricing(!combinedPricing)}
                        className="w-full flex items-center gap-2 p-2.5 text-left"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center text-[9px] ${combinedPricing ? "bg-amber-500 border-amber-500 text-white" : "border-slate-600"}`}
                        >
                          {combinedPricing && "✓"}
                        </div>
                        <DollarSign size={13} className="text-slate-400" />
                        <span className="text-xs font-medium text-slate-200">
                          Dynamic Pricing
                        </span>
                      </button>
                      {combinedPricing && (
                        <div className="px-2.5 pb-2.5">
                          <input
                            type="range"
                            min="100"
                            max="250"
                            step="10"
                            value={combinedPricingValue * 100}
                            onChange={(e) =>
                              setCombinedPricingValue(
                                Number(e.target.value) / 100,
                              )
                            }
                            className="w-full"
                          />
                          <div className="text-[10px] text-amber-400 mt-0.5">
                            {combinedPricingValue}x peak
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Apply Button */}
                <div className="mt-3">
                  {appliedFeedback && (
                    <div className="mb-2 p-2 bg-emerald-500/15 border border-emerald-500/25 rounded-lg animate-pulse">
                      <span className="text-emerald-400 text-[10px] font-medium">
                        {appliedFeedback}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={handleApplyScenario}
                    disabled={state.isRunning}
                    className={`w-full py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all
                      ${
                        state.isRunning
                          ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 text-white hover:shadow-lg hover:shadow-purple-500/25"
                      }`}
                  >
                    <Zap size={13} />
                    Apply Scenario
                  </button>
                </div>
              </div>
            )}

            {/* Network Health */}
            <div className="p-4 border-b border-slate-800/60">
              <h2 className="font-semibold text-sm text-white mb-4">
                Network Health
              </h2>
              <div className="flex justify-center mb-4">
                <svg viewBox="0 0 100 100" className="w-32 h-32">
                  {/* Background ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r={donutR}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="8"
                  />
                  {/* Progress ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r={donutR}
                    fill="none"
                    stroke={
                      healthPct >= 80
                        ? "#10b981"
                        : healthPct >= 50
                          ? "#f59e0b"
                          : "#ef4444"
                    }
                    strokeWidth="8"
                    strokeDasharray={`${(healthPct / 100) * donutCirc} ${donutCirc}`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    className="transition-all duration-500"
                  />
                  <text
                    x="50"
                    y="46"
                    textAnchor="middle"
                    className="fill-white text-xl font-bold"
                    style={{ fontSize: "22px" }}
                  >
                    {healthPct}%
                  </text>
                  <text
                    x="50"
                    y="60"
                    textAnchor="middle"
                    className="fill-slate-400"
                    style={{ fontSize: "8px" }}
                  >
                    Status
                  </text>
                </svg>
              </div>
              <div className="flex items-center justify-center gap-5 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-white font-bold">
                    {Math.round(
                      (operationalCount / totalStationCount) * 100,
                    )}
                    %
                  </span>
                  <span className="text-slate-500">Status</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-white font-bold">
                    {avgUtilization.toFixed(0)}%
                  </span>
                  <span className="text-slate-500">Auto</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-white font-bold">
                    {chargingBatteriesCount}
                  </span>
                  <span className="text-slate-500">Charge</span>
                </div>
              </div>
            </div>

            {/* Combined Stats */}
            <div className="p-4">
              <h2 className="font-semibold text-sm text-white mb-3">
                Combined
              </h2>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 mb-1">
                    <Zap size={10} className="text-amber-400" />
                    Active Chargers
                  </div>
                  <div className="text-lg font-bold tabular-nums">
                    {activeChargersCount}
                    <span className="text-xs text-slate-600">
                      /{totalChargers}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 mb-1">
                    <Clock size={10} className="text-cyan-400" />
                    Active Wait Time
                  </div>
                  <div className="text-lg font-bold tabular-nums">
                    {state.scenarioKPIs.avgWaitTime.toFixed(1)}
                    <span className="text-xs text-slate-600"> min</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Battery size={10} className="text-emerald-400" />
                    Battery Inventory
                  </span>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      inventoryPct < 25
                        ? "text-red-400"
                        : inventoryPct < 50
                          ? "text-amber-400"
                          : "text-emerald-400"
                    }`}
                  >
                    {inventoryPct}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      inventoryPct < 25
                        ? "bg-red-500"
                        : inventoryPct < 50
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${inventoryPct}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1.5">
                  {totalInventory.toLocaleString()} /{" "}
                  {totalCap.toLocaleString()} batteries
                </div>
              </div>
            </div>

            {/* Alerts */}
            {state.alerts.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/50">
                <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">
                  Alerts
                </div>
                <div className="space-y-1 max-h-16 overflow-y-auto">
                  {state.alerts.slice(0, 3).map((alert) => (
                    <div
                      key={alert.id}
                      className={`text-[10px] px-2.5 py-1.5 rounded-lg ${
                        alert.type === "danger"
                          ? "bg-red-500/10 text-red-300"
                          : alert.type === "warning"
                            ? "bg-amber-500/10 text-amber-300"
                            : "bg-blue-500/10 text-blue-300"
                      }`}
                    >
                      {alert.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Map + Station Analytics */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Map */}
            <div
              className={`relative ${showStationAnalytics ? "h-[55vh]" : "flex-1"} shrink-0`}
            >
              <div className="h-full w-full">
                <LeafletMap
                  stations={state.stations}
                  drivers={state.drivers}
                  showConnections={true}
                  showDrivers={true}
                />
              </div>

              {/* Map Overlay - Legend */}
              <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-sm px-4 py-2.5 rounded-lg border border-slate-700/50">
                <div className="flex gap-3.5 text-[10px]">
                  {[
                    { color: "bg-emerald-500", label: "Operational" },
                    { color: "bg-amber-500", label: "Low Stock" },
                    { color: "bg-orange-500", label: "Overloaded" },
                    { color: "bg-red-500", label: "Emergency" },
                    { color: "bg-cyan-400", label: "Driver" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-1.5"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${item.color}`}
                      />
                      <span className="text-slate-400">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Map Overlay - Stats */}
              <div className="absolute top-4 right-4 z-[1000] flex items-center gap-3.5 bg-slate-900/90 backdrop-blur-sm px-4 py-2.5 rounded-lg border border-slate-700/50 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Users size={12} />
                  {state.drivers.length} drivers
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} />
                  {state.stations.filter((s) => s.status !== "offline").length}{" "}
                  stations
                </div>
              </div>
            </div>

            {/* Station Performance & Analytics */}
            <div
              className={`border-t border-slate-800 flex flex-col ${showStationAnalytics ? "flex-1 min-h-0" : ""}`}
            >
              <button
                onClick={() => setShowStationAnalytics(!showStationAnalytics)}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/30 transition-colors shrink-0"
              >
                <h2 className="text-sm font-semibold text-white">
                  Station Performance & Analytics
                </h2>
                <ChevronUp
                  size={16}
                  className={`text-slate-400 transition-transform ${showStationAnalytics ? "" : "rotate-180"}`}
                />
              </button>

              {showStationAnalytics && (
                <div className="flex-1 overflow-y-auto px-5 pb-5">
                  <div className="grid grid-cols-2 gap-5">
                    {/* Left column: Charts */}
                    <div className="space-y-5">
                      {/* Station Utilization Comparison */}
                      <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-4">
                        <h3 className="text-xs font-semibold text-white mb-3">
                          Station Utilization Comparison
                        </h3>
                        <div style={{ height: Math.max(250, stationBarData.length * 22) }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={stationBarData}
                              layout="vertical"
                              margin={{ left: 8, right: 16 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(148, 163, 184, 0.1)"
                                horizontal={false}
                              />
                              <XAxis
                                type="number"
                                domain={[0, 100]}
                                stroke="#64748b"
                                fontSize={9}
                                tickLine={false}
                                unit="%"
                              />
                              <YAxis
                                dataKey="name"
                                type="category"
                                stroke="#64748b"
                                fontSize={8}
                                width={90}
                                tickLine={false}
                              />
                              <Tooltip
                                contentStyle={CHART_TOOLTIP_STYLE}
                                formatter={(value) => [
                                  `${value}%`,
                                  "Utilization",
                                ]}
                              />
                              <Bar
                                dataKey="utilization"
                                radius={[0, 4, 4, 0]}
                                barSize={12}
                              >
                                {stationBarData.map((entry, index) => (
                                  <Cell
                                    key={index}
                                    fill={
                                      entry.utilization > 90
                                        ? "#ef4444"
                                        : entry.utilization > 70
                                          ? "#f59e0b"
                                          : "#10b981"
                                    }
                                    fillOpacity={0.8}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Performance Over Time */}
                      <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-4">
                        <h3 className="text-xs font-semibold text-white mb-3">
                          Performance Over Time
                        </h3>
                        <div className="h-48">
                          {hasChartData ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData}>
                                <defs>
                                  <linearGradient
                                    id="waitGrad"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                  >
                                    <stop
                                      offset="5%"
                                      stopColor="#3b82f6"
                                      stopOpacity={0.3}
                                    />
                                    <stop
                                      offset="95%"
                                      stopColor="#3b82f6"
                                      stopOpacity={0}
                                    />
                                  </linearGradient>
                                  <linearGradient
                                    id="throughGrad"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                  >
                                    <stop
                                      offset="5%"
                                      stopColor="#10b981"
                                      stopOpacity={0.3}
                                    />
                                    <stop
                                      offset="95%"
                                      stopColor="#10b981"
                                      stopOpacity={0}
                                    />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="rgba(148, 163, 184, 0.1)"
                                />
                                <XAxis
                                  dataKey="time"
                                  stroke="#64748b"
                                  fontSize={9}
                                  tickLine={false}
                                />
                                <YAxis
                                  stroke="#64748b"
                                  fontSize={9}
                                  tickLine={false}
                                />
                                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                                <Area
                                  type="monotone"
                                  dataKey="waitTime"
                                  name="Wait (min)"
                                  stroke="#3b82f6"
                                  fill="url(#waitGrad)"
                                  strokeWidth={2}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="throughput"
                                  name="Throughput"
                                  stroke="#10b981"
                                  fill="url(#throughGrad)"
                                  strokeWidth={2}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="utilization"
                                  name="Util (%)"
                                  stroke="#f59e0b"
                                  strokeWidth={2}
                                  dot={false}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500">
                              <BarChart3
                                size={32}
                                className="mb-1.5 text-slate-700"
                              />
                              <p className="text-[10px]">
                                Run simulation to see data
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right column: Station Performance Table */}
                    <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-4">
                      <h3 className="text-xs font-semibold text-white mb-3">
                        Station Performance
                      </h3>
                      <div className="overflow-y-auto max-h-[500px]">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="border-b border-slate-700/50">
                              <th className="text-left py-2 pr-3 text-slate-400 font-medium">
                                Station
                              </th>
                              <th className="text-right py-2 px-2 text-slate-400 font-medium">
                                Swaps
                              </th>
                              <th className="text-right py-2 px-2 text-slate-400 font-medium">
                                Inventory
                              </th>
                              <th className="text-right py-2 px-2 text-slate-400 font-medium">
                                Utilization
                              </th>
                              <th className="text-right py-2 px-2 text-slate-400 font-medium">
                                Lost
                              </th>
                              <th className="text-center py-2 pl-2 text-slate-400 font-medium">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {stationTableData.map((s) => (
                              <tr
                                key={s.id}
                                className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors"
                              >
                                <td className="py-2 pr-3">
                                  <span className="text-white font-medium">
                                    {s.name}
                                  </span>
                                </td>
                                <td className="text-right py-2 px-2 text-white font-bold">
                                  {s.totalSwaps}
                                </td>
                                <td className="text-right py-2 px-2">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <div className="w-10 h-1 bg-slate-700 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          s.inventory / s.inventoryCap < 0.3
                                            ? "bg-red-500"
                                            : s.inventory / s.inventoryCap <
                                                0.5
                                              ? "bg-amber-500"
                                              : "bg-emerald-500"
                                        }`}
                                        style={{
                                          width: `${(s.inventory / s.inventoryCap) * 100}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-[9px] text-slate-400">
                                      {s.inventory}/{s.inventoryCap}
                                    </span>
                                  </div>
                                </td>
                                <td className="text-right py-2 px-2">
                                  <span
                                    className={`font-medium ${
                                      Number(s.utilization) > 90
                                        ? "text-red-400"
                                        : Number(s.utilization) > 70
                                          ? "text-amber-400"
                                          : "text-emerald-400"
                                    }`}
                                  >
                                    {s.utilization}%
                                  </span>
                                </td>
                                <td className="text-right py-2 px-2">
                                  <span
                                    className={
                                      s.lostSwaps > 0
                                        ? "text-red-400 font-medium"
                                        : "text-slate-500"
                                    }
                                  >
                                    {s.lostSwaps}
                                  </span>
                                </td>
                                <td className="text-center py-2 pl-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                                      s.status === "operational"
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : s.status === "fire"
                                          ? "bg-red-500/20 text-red-400"
                                          : s.status === "overloaded"
                                            ? "bg-orange-500/20 text-orange-400"
                                            : "bg-amber-500/20 text-amber-400"
                                    }`}
                                  >
                                    {s.status.replace("_", " ")}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
