'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSimulation } from '@/hooks/useSimulation';
import type { WeatherData, CarbonData } from '@/simulation/types';
import { LeafletMap } from '@/components/map';
import { Station, ScenarioType, SCENARIO_CATEGORIES, WEATHER_OPTIONS, FAILURE_TYPES } from '@/simulation/types';
import { fetchRealStations } from '@/lib/stationAdapter';
import {
  Play, Pause, RotateCcw, Zap, MapPin, Clock, Battery, Users,
  TrendingUp, TrendingDown, AlertTriangle, ChevronRight, Info,
  BarChart3, Store, Cloud, DollarSign, ArrowUpRight, Shuffle,
  Activity, Flame, Globe, Cpu
} from 'lucide-react';

type DataMode = 'simulation' | 'real';

export default function ControlCenter() {
  const router = useRouter();
  const { state, start, pause, reset, setSpeed, setScenario, applyInterventions, loadStations, weatherData, carbonData } = useSimulation();
  const [activeScenarioType, setActiveScenarioType] = useState<ScenarioType>('baseline');
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);
  const [dataMode, setDataMode] = useState<DataMode>('simulation');
  const [isLoadingReal, setIsLoadingReal] = useState(false);
  const [realStationCount, setRealStationCount] = useState(0);

  // Scenario parameters
  const [demandMultiplier, setDemandMultiplier] = useState(1.0);
  const [weatherType, setWeatherType] = useState('normal');
  const [failureType, setFailureType] = useState('fire');
  const [chargerChange, setChargerChange] = useState(0);
  const [targetStationId, setTargetStationId] = useState('station-1');
  const [safetyStock, setSafetyStock] = useState(10);
  const [pricingMultiplier, setPricingMultiplier] = useState(1.5);

  // Network scenario
  const [networkDisabledStations, setNetworkDisabledStations] = useState<Set<string>>(new Set());

  // Growth scenario
  const [growthRate, setGrowthRate] = useState(50); // % annual
  const [growthTimeline, setGrowthTimeline] = useState(6); // months

  // Combined scenario
  const [combinedDemand, setCombinedDemand] = useState(false);
  const [combinedDemandValue, setCombinedDemandValue] = useState(1.3);
  const [combinedCapacity, setCombinedCapacity] = useState(false);
  const [combinedCapacityValue, setCombinedCapacityValue] = useState(4);
  const [combinedPricing, setCombinedPricing] = useState(false);
  const [combinedPricingValue, setCombinedPricingValue] = useState(1.5);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (state?.isRunning) pause(); else start();
        break;
      case 'KeyR':
        if (!e.metaKey && !e.ctrlKey) { reset(); }
        break;
      case 'Digit1': setSpeed(1); break;
      case 'Digit2': setSpeed(2); break;
      case 'Digit3': setSpeed(4); break;
      case 'Digit4': setSpeed(8); break;
    }
  }, [state?.isRunning, start, pause, reset, setSpeed]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle data mode switch
  const handleDataModeChange = async (mode: DataMode) => {
    if (mode === dataMode) return;

    if (mode === 'real') {
      setIsLoadingReal(true);
      setDataMode(mode);
      try {
        const stations = await fetchRealStations();
        if (stations.length > 0) {
          loadStations(stations);
          setRealStationCount(stations.length);
          setTargetStationId(stations[0].id);
        } else {
          // No stations returned, revert
          setDataMode('simulation');
        }
      } catch (err) {
        console.error('Failed to load real stations:', err);
        setDataMode('simulation');
      } finally {
        setIsLoadingReal(false);
      }
    } else {
      setDataMode(mode);
      loadStations(undefined); // Reset to mock data
      setTargetStationId('station-1');
    }
  };

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
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return { hours: String(displayHours), mins: mins.toString().padStart(2, '0'), ampm };
  };

  const handleScenarioChange = (type: ScenarioType) => {
    setActiveScenarioType(type);
    setScenario(type);
  };

  const handleApplyScenario = () => {
    const interventions = [];
    let feedbackMsg = '';

    if (activeScenarioType === 'demand') {
      interventions.push({
        id: `demand-${Date.now()}`,
        type: 'demand_shift' as const,
        value: demandMultiplier,
        params: { weather: weatherType },
      });
      feedbackMsg = `Demand increased by ${((demandMultiplier - 1) * 100).toFixed(0)}% (${weatherType.replace('_', ' ')})`;
    } else if (activeScenarioType === 'failures') {
      interventions.push({
        id: `failure-${Date.now()}`,
        type: 'trigger_emergency' as const,
        stationId: targetStationId,
        emergencyType: failureType as 'fire' | 'power_outage' | 'charger_failure' | 'overload' | 'no_battery',
        duration: 120,
      });
      const stationName = state.stations.find(s => s.id === targetStationId)?.name || 'Station';
      feedbackMsg = `${failureType.replace('_', ' ')} triggered at ${stationName}`;
    } else if (activeScenarioType === 'capacity') {
      interventions.push({
        id: `capacity-${Date.now()}`,
        type: 'modify_chargers' as const,
        stationId: targetStationId,
        value: (state.stations.find(s => s.id === targetStationId)?.chargers || 12) + chargerChange,
      });
      const stationName = state.stations.find(s => s.id === targetStationId)?.name || 'Station';
      feedbackMsg = `Chargers ${chargerChange >= 0 ? 'increased' : 'reduced'} by ${Math.abs(chargerChange)} at ${stationName}`;
    } else if (activeScenarioType === 'pricing') {
      interventions.push({
        id: `pricing-${Date.now()}`,
        type: 'pricing_change' as const,
        value: pricingMultiplier,
      });
      feedbackMsg = `Dynamic pricing applied (${pricingMultiplier}x during peak hours)`;
    } else if (activeScenarioType === 'inventory') {
      interventions.push({
        id: `inventory-${Date.now()}`,
        type: 'change_policy' as const,
        params: { safetyStock, rebalanceThreshold: safetyStock * 0.8 },
      });
      feedbackMsg = `Inventory policy applied (safety stock: ${safetyStock} batteries)`;
    } else if (activeScenarioType === 'station_ops') {
      interventions.push({
        id: `station-${Date.now()}`,
        type: 'add_station' as const,
        position: { x: 55, y: 65 },
        params: { chargers: 8, bays: 40 },
      });
      feedbackMsg = `New station added to network`;
    } else if (activeScenarioType === 'network') {
      // Disable selected stations
      networkDisabledStations.forEach((stationId) => {
        interventions.push({
          id: `network-disable-${stationId}-${Date.now()}`,
          type: 'remove_station' as const,
          stationId,
        });
      });
      feedbackMsg = `${networkDisabledStations.size} station(s) taken offline — testing network resilience`;
    } else if (activeScenarioType === 'growth') {
      // Growth scenario: compound demand increase based on growth rate and timeline
      // Monthly growth = (1 + annual_rate)^(1/12), then raised to timeline months
      const monthlyGrowth = Math.pow(1 + growthRate / 100, 1 / 12);
      const totalGrowth = Math.pow(monthlyGrowth, growthTimeline);
      interventions.push({
        id: `growth-${Date.now()}`,
        type: 'demand_shift' as const,
        value: totalGrowth,
      });
      feedbackMsg = `${growthRate}% annual growth over ${growthTimeline} months → ${((totalGrowth - 1) * 100).toFixed(0)}% demand increase`;
    } else if (activeScenarioType === 'combined') {
      if (combinedDemand) {
        interventions.push({
          id: `combined-demand-${Date.now()}`,
          type: 'demand_shift' as const,
          value: combinedDemandValue,
        });
      }
      if (combinedCapacity) {
        // Apply extra chargers to all stations
        state.stations.forEach((s) => {
          interventions.push({
            id: `combined-capacity-${s.id}-${Date.now()}`,
            type: 'modify_chargers' as const,
            stationId: s.id,
            value: s.chargers + combinedCapacityValue,
          });
        });
      }
      if (combinedPricing) {
        interventions.push({
          id: `combined-pricing-${Date.now()}`,
          type: 'pricing_change' as const,
          value: combinedPricingValue,
        });
      }
      const parts = [
        combinedDemand && `+${((combinedDemandValue - 1) * 100).toFixed(0)}% demand`,
        combinedCapacity && `+${combinedCapacityValue} chargers/station`,
        combinedPricing && `${combinedPricingValue}x pricing`,
      ].filter(Boolean);
      feedbackMsg = `Combined: ${parts.join(' + ')}`;
    } else {
      feedbackMsg = `${SCENARIO_CATEGORIES.find(c => c.type === activeScenarioType)?.label} scenario applied`;
    }

    applyInterventions(interventions);
    setAppliedFeedback(feedbackMsg);
    setTimeout(() => setAppliedFeedback(null), 3000);
  };

  const kpiData = [
    {
      label: 'Avg Wait Time',
      value: state.scenarioKPIs.avgWaitTime,
      baseline: state.baselineKPIs.avgWaitTime,
      unit: 'min',
      icon: Clock,
      color: 'blue',
      inverse: true
    },
    {
      label: 'Lost Swaps',
      value: state.scenarioKPIs.lostSwaps,
      baseline: state.baselineKPIs.lostSwaps,
      unit: '',
      icon: AlertTriangle,
      color: 'red',
      inverse: true
    },
    {
      label: 'Charger Utilization',
      value: state.scenarioKPIs.chargerUtilization * 100,
      baseline: state.baselineKPIs.chargerUtilization * 100,
      unit: '%',
      icon: Zap,
      color: 'amber',
      inverse: false
    },
    {
      label: 'City Throughput',
      value: state.scenarioKPIs.cityThroughput,
      baseline: state.baselineKPIs.cityThroughput,
      unit: '/hr',
      icon: TrendingUp,
      color: 'emerald',
      inverse: false
    },
  ];

  const scenarioIcons: Record<string, React.ReactNode> = {
    baseline: <BarChart3 size={16} />,
    station_ops: <Store size={16} />,
    capacity: <Zap size={16} />,
    inventory: <Battery size={16} />,
    demand: <Cloud size={16} />,
    network: <MapPin size={16} />,
    pricing: <DollarSign size={16} />,
    failures: <AlertTriangle size={16} />,
    growth: <ArrowUpRight size={16} />,
    combined: <Shuffle size={16} />,
  };

  const getKPIDelta = (value: number, baseline: number, inverse: boolean) => {
    const diff = value - baseline;
    const pct = baseline !== 0 ? (diff / baseline) * 100 : 0;
    const isBetter = inverse ? diff < 0 : diff > 0;
    return { pct, isBetter };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
        <div className="px-6 py-3 grid grid-cols-[auto_1fr_auto] items-center gap-4">
          {/* Left: Logo + Sim Controls */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">
                  Electri<span className="text-cyan-400">Go</span>
                </h1>
                <p className="text-xs text-slate-500 leading-tight">Simulation Sandbox</p>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-700/50" />

            {/* Play/Pause/Reset */}
            <div className="flex items-center gap-3">
              {!state.isRunning ? (
                <button
                  onClick={start}
                  className="group flex items-center gap-3 px-9 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl font-bold text-lg hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Play size={22} className="group-hover:animate-pulse" />
                  Run
                </button>
              ) : (
                <button
                  onClick={pause}
                  className="group flex items-center gap-3 px-9 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl font-bold text-lg hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Pause size={22} className="group-hover:animate-pulse" />
                  Pause
                </button>
              )}
              <button
                onClick={reset}
                className="group p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all border border-slate-700/50 hover:border-slate-600 hover:scale-[1.05] active:scale-[0.95]"
                title="Reset (R)"
              >
                <RotateCcw size={22} className="group-hover:rotate-[-180deg] transition-transform duration-500" />
              </button>
            </div>
          </div>

          {/* Center: Time + Speed */}
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${state.isRunning ? 'bg-emerald-500/20 text-emerald-400 shadow-sm shadow-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                {state.isRunning && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                {state.isRunning ? 'LIVE' : 'PAUSED'}
              </span>
              <span className="text-xl font-bold font-mono tabular-nums">
                {(() => { const t = formatTimeParts(state.time); return (<>{t.hours}<span className={state.isRunning ? 'animate-blink-colon' : ''}>{':'}</span>{t.mins} {t.ampm}</>); })()}
              </span>
              <span className="text-sm text-slate-500">Day {state.day}</span>
            </div>

            <div className="h-6 w-px bg-slate-700/50" />

            <div className="flex items-center gap-1.5 bg-slate-800/50 p-1 rounded-xl">
              {[1, 2, 4, 8].map((s) => (
                <button
                  key={s}
                  onClick={() => { setSpeed(s); if (!state.isRunning) { /* speed stored for next start */ } }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${state.speed === s
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'text-slate-500 hover:bg-slate-700 hover:text-slate-300'}`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Right: Badges + Data Mode + Analytics */}
          <div className="flex items-center gap-3">
            {/* Weather Badge */}
            {weatherData && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${weatherData.isFallback
                ? 'bg-slate-800/50 border-slate-700/50 text-slate-500'
                : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                }`}>
                <Cloud size={13} />
                <span>{weatherData.temperature.toFixed(0)}°C</span>
                <span className="text-slate-500">|</span>
                <span>{weatherData.condition.replace('_', ' ')}</span>
                {weatherData.multiplier > 1 && (
                  <span className="text-amber-400">{weatherData.multiplier}x</span>
                )}
              </div>
            )}

            {/* Carbon Badge */}
            {carbonData && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${carbonData.isFallback
                ? 'bg-slate-800/50 border-slate-700/50 text-slate-500'
                : (carbonData.carbonIntensity > 800)
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                <Zap size={13} />
                <span>{carbonData.carbonIntensity} gCO2</span>
              </div>
            )}

            <div className="flex items-center bg-slate-800/80 rounded-xl border border-slate-700/50 p-1">
              <button
                onClick={() => handleDataModeChange('simulation')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${dataMode === 'simulation'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
              >
                <Cpu size={15} />
                Sim
              </button>
              <button
                onClick={() => handleDataModeChange('real')}
                disabled={isLoadingReal}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${dataMode === 'real'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'} ${isLoadingReal ? 'opacity-50' : ''}`}
              >
                <Globe size={15} className={dataMode === 'real' ? 'animate-pulse' : ''} />
                {isLoadingReal ? '...' : 'Real'}
              </button>
            </div>

            <button
              onClick={() => router.push('/analytics')}
              className="group flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 border border-slate-700/50 rounded-xl text-sm font-medium hover:bg-slate-700 hover:border-purple-500/30 transition-all hover:shadow-sm hover:shadow-purple-500/20"
            >
              <Activity size={16} className="text-purple-400 group-hover:animate-pulse" />
              Analytics
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-60px)]">
        {/* Left Panel */}
        <div className="w-[440px] border-r border-slate-800/80 bg-gradient-to-b from-slate-900/60 to-slate-950/40 flex flex-col overflow-hidden">
          {/* KPI Cards */}
          <div className="p-5 border-b border-slate-800/60">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base text-white flex items-center gap-2">
                <Activity size={16} className="text-cyan-400" />
                Live Metrics
              </h2>
              {state.activeScenario && (
                <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">vs Baseline</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {kpiData.map((kpi, index) => {
                const Icon = kpi.icon;
                const { pct, isBetter } = getKPIDelta(kpi.value, kpi.baseline, kpi.inverse);
                const showDelta = state.activeScenario && Math.abs(pct) >= 0.5;

                const gradientClass = kpi.color === 'blue'
                  ? 'from-blue-500/20 to-blue-600/5'
                  : kpi.color === 'red'
                    ? 'from-red-500/20 to-red-600/5'
                    : kpi.color === 'amber'
                      ? 'from-amber-500/20 to-amber-600/5'
                      : 'from-emerald-500/20 to-emerald-600/5';

                const iconBgClass = kpi.color === 'blue'
                  ? 'bg-blue-500/20 text-blue-400'
                  : kpi.color === 'red'
                    ? 'bg-red-500/20 text-red-400'
                    : kpi.color === 'amber'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400';

                const glowClass = kpi.color === 'blue'
                  ? 'shadow-blue-500/20'
                  : kpi.color === 'red'
                    ? 'shadow-red-500/20'
                    : kpi.color === 'amber'
                      ? 'shadow-amber-500/20'
                      : 'shadow-emerald-500/20';

                return (
                  <div
                    key={kpi.label}
                    className={`metric-card group bg-gradient-to-br ${gradientClass} hover:shadow-lg ${glowClass} flex flex-col min-h-[120px]`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Shimmer overlay */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />

                    {/* Header row: Icon + Label */}
                    <div className="flex items-center gap-3 relative z-10 mb-6">
                      <div className={`w-10 h-10 rounded-xl ${iconBgClass} flex items-center justify-center flex-shrink-0 group-hover:animate-float transition-all duration-300 group-hover:scale-110`}>
                        <Icon size={18} className="drop-shadow-lg" />
                      </div>
                      <span className="text-sm text-slate-400 font-medium leading-tight">{kpi.label}</span>
                    </div>

                    {/* Value row - pushed to bottom with more spacing */}
                    <div className="flex items-baseline justify-between relative z-10 mt-auto pt-8">
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold tabular-nums leading-none text-white tracking-tight">
                          {kpi.value.toFixed(kpi.unit === '%' || kpi.unit === 'min' ? 1 : 0)}
                        </span>
                        <span className="text-base text-slate-500 font-medium ml-1">{kpi.unit}</span>
                      </div>
                      {showDelta && (
                        <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-all ${isBetter ? 'text-emerald-400 bg-emerald-500/15 shadow-sm shadow-emerald-500/20' : 'text-red-400 bg-red-500/15 shadow-sm shadow-red-500/20'}`}>
                          {isBetter ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {Math.abs(pct).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scenario Builder */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <h2 className="font-semibold text-base text-white flex items-center gap-2">
                <Shuffle size={16} className="text-purple-400" />
                Scenarios
              </h2>
              <span className="text-xs text-slate-500">
                {SCENARIO_CATEGORIES.find(c => c.type === activeScenarioType)?.label}
              </span>
            </div>

            {/* Scenario Tabs - 5 column grid */}
            <div className="px-6 pb-5">
              <div className="glass-card rounded-2xl p-5">
                <div className="grid grid-cols-5 gap-4">
                  {SCENARIO_CATEGORIES.map((cat, index) => (
                    <button
                      key={cat.type}
                      onClick={() => !state.isRunning && handleScenarioChange(cat.type)}
                      disabled={state.isRunning}
                      title={cat.description}
                      className={`scenario-tab group flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl text-xs font-medium transition-all duration-300 ripple-effect
                        ${activeScenarioType === cat.type
                          ? 'active text-white shadow-lg'
                          : 'text-slate-500 hover:text-slate-200 hover:bg-slate-700/40'}
                        ${state.isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <span className={`text-xl transition-transform duration-300 ${activeScenarioType === cat.type ? 'animate-float' : 'group-hover:scale-110'}`}>
                        {scenarioIcons[cat.type]}
                      </span>
                      <span className="truncate max-w-full leading-tight text-center">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scenario Controls */}
            <div className="flex-1 px-6 py-6 overflow-y-auto">
              {activeScenarioType === 'baseline' && (() => {
                const operational = state.stations.filter(s => s.status === 'operational').length;
                const totalStations = state.stations.length;
                const totalChargers = state.stations.reduce((sum, s) => sum + s.chargers, 0);
                const activeChargers = state.stations.reduce((sum, s) => sum + s.activeChargers, 0);
                const avgUtil = totalStations > 0 ? state.stations.reduce((sum, s) => sum + s.utilizationRate, 0) / totalStations * 100 : 0;
                const totalInventory = state.stations.reduce((sum, s) => sum + s.currentInventory, 0);
                const totalCap = state.stations.reduce((sum, s) => sum + s.inventoryCap, 0);
                const inventoryPct = totalCap > 0 ? (totalInventory / totalCap) * 100 : 0;
                const totalSwaps = state.stations.reduce((sum, s) => sum + s.totalSwaps, 0);
                const avgWait = totalStations > 0 ? state.stations.reduce((sum, s) => sum + s.avgWaitTime, 0) / totalStations : 0;
                const lowStockStations = state.stations.filter(s => s.currentInventory / s.inventoryCap < 0.25).length;

                return (
                  <div className="space-y-7">
                    {/* Status banner with progress ring */}
                    <div className={`relative flex items-center gap-5 p-5 rounded-2xl border overflow-hidden transition-all ${operational === totalStations
                      ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border-emerald-500/30'
                      : operational > totalStations * 0.7
                        ? 'bg-gradient-to-r from-amber-500/10 to-amber-600/5 border-amber-500/30'
                        : 'bg-gradient-to-r from-red-500/10 to-red-600/5 border-red-500/30'
                      }`}>
                      {/* Shimmer overlay */}
                      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" style={{ animationDuration: '3s', animationIterationCount: 'infinite' }} />

                      {/* Progress ring */}
                      <div className="relative w-12 h-12 flex-shrink-0">
                        <svg className="w-12 h-12 -rotate-90">
                          <circle
                            cx="24" cy="24" r="20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="text-slate-700/50"
                          />
                          <circle
                            cx="24" cy="24" r="20"
                            fill="none"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={`${(operational / totalStations) * 125.6} 125.6`}
                            className={`transition-all duration-1000 ${operational === totalStations ? 'text-emerald-500' : operational > totalStations * 0.7 ? 'text-amber-500' : 'text-red-500'}`}
                            style={{ filter: 'drop-shadow(0 0 6px currentColor)' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className={`w-2.5 h-2.5 rounded-full animate-breathe ${operational === totalStations ? 'bg-emerald-500 text-emerald-500' : operational > totalStations * 0.7 ? 'bg-amber-500 text-amber-500' : 'bg-red-500 text-red-500'}`} />
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="text-base font-semibold text-white mb-0.5">
                          {operational === totalStations ? 'All Systems Operational' : `${operational}/${totalStations} Operational`}
                        </div>
                        <div className="text-xs text-slate-400">
                          Network health: {((operational / totalStations) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {/* Stats grid with glass cards */}
                    <div className="grid grid-cols-2 gap-5">
                      <div className="glass-card rounded-xl p-5 group hover:scale-[1.02] transition-transform duration-300" style={{ borderLeft: '4px solid #10b981' }}>
                        <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                          <MapPin size={14} className="text-emerald-400" />
                          Stations Online
                        </div>
                        <div className="text-2xl font-bold text-emerald-400 tabular-nums">
                          {operational}<span className="text-sm text-slate-600 font-medium ml-0.5">/{totalStations}</span>
                        </div>
                      </div>
                      <div className="glass-card rounded-xl p-5 group hover:scale-[1.02] transition-transform duration-300" style={{ borderLeft: '4px solid #3b82f6' }}>
                        <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                          <Zap size={14} className="text-blue-400" />
                          Active Chargers
                        </div>
                        <div className="text-2xl font-bold text-blue-400 tabular-nums">
                          {activeChargers}<span className="text-sm text-slate-600 font-medium ml-0.5">/{totalChargers}</span>
                        </div>
                      </div>
                      <div className="glass-card rounded-xl p-5 group hover:scale-[1.02] transition-transform duration-300" style={{ borderLeft: '4px solid #f59e0b' }}>
                        <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                          <Activity size={14} className="text-amber-400" />
                          Avg Utilization
                        </div>
                        <div className={`text-2xl font-bold tabular-nums ${avgUtil > 85 ? 'text-red-400' : avgUtil > 65 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {avgUtil.toFixed(1)}<span className="text-sm">%</span>
                        </div>
                      </div>
                      <div className="glass-card rounded-xl p-5 group hover:scale-[1.02] transition-transform duration-300" style={{ borderLeft: '4px solid #22d3ee' }}>
                        <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                          <Clock size={14} className="text-cyan-400" />
                          Avg Wait Time
                        </div>
                        <div className={`text-2xl font-bold tabular-nums ${avgWait > 8 ? 'text-red-400' : avgWait > 4 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {avgWait.toFixed(1)}<span className="text-sm text-slate-600 font-medium"> min</span>
                        </div>
                      </div>
                    </div>

                    {/* Inventory bar with premium styling */}
                    <div className="glass-card rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-slate-300 flex items-center gap-3 font-medium">
                          <Battery size={20} className="text-emerald-400 animate-float" />
                          Battery Inventory
                        </span>
                        <span className={`text-xl font-bold tabular-nums ${inventoryPct < 25 ? 'text-red-400' : inventoryPct < 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {inventoryPct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="premium-progress">
                        <div
                          className={`premium-progress-fill ${inventoryPct < 25 ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-400' : inventoryPct < 50 ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400' : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400'}`}
                          style={{ width: `${inventoryPct}%`, boxShadow: inventoryPct < 25 ? '0 0 12px rgba(239, 68, 68, 0.4)' : inventoryPct < 50 ? '0 0 12px rgba(245, 158, 11, 0.4)' : '0 0 12px rgba(16, 185, 129, 0.4)' }}
                        />
                      </div>
                      <div className="flex justify-between mt-4">
                        <span className="text-xs text-slate-500">{totalInventory.toLocaleString()} / {totalCap.toLocaleString()} batteries</span>
                        {lowStockStations > 0 && (
                          <span className="text-xs text-amber-400 flex items-center gap-1.5 animate-pulse">
                            <AlertTriangle size={12} />
                            {lowStockStations} low stock
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Total swaps with neon styling */}
                    <div className="glass-card rounded-xl p-6 flex items-center justify-between group hover:border-purple-500/30 transition-colors mt-4">
                      <span className="text-sm text-slate-400 flex items-center gap-4 font-medium">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                          <Zap size={20} className="text-purple-400 group-hover:animate-float" />
                        </div>
                        Total Swaps
                      </span>
                      <span className="text-3xl font-bold tabular-nums text-white" style={{ textShadow: '0 0 20px rgba(168, 85, 247, 0.4)' }}>
                        {totalSwaps.toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 text-center pt-3">
                      Select a scenario above to test interventions
                    </p>
                  </div>
                );
              })()}

              {activeScenarioType === 'demand' && (
                <div className="space-y-5">
                  <div>
                    <label className="text-sm text-slate-300 font-medium mb-3 block">Weather Condition</label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {WEATHER_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { setWeatherType(opt.value); setDemandMultiplier(opt.multiplier); }}
                          className={`p-3 rounded-xl text-left border transition-all ${weatherType === opt.value
                            ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                            : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'}`}
                        >
                          <div className="text-sm font-medium">{opt.label}</div>
                          <div className="text-xs opacity-70 mt-1">
                            {((opt.multiplier - 1) * 100).toFixed(0)}% demand
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 font-medium mb-2 block">
                      Demand Multiplier: <span className="text-blue-400">{(demandMultiplier * 100).toFixed(0)}%</span>
                    </label>
                    <input type="range" min="80" max="200" value={demandMultiplier * 100}
                      onChange={(e) => setDemandMultiplier(Number(e.target.value) / 100)} className="w-full" />
                  </div>
                </div>
              )}

              {activeScenarioType === 'failures' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400">
                    Simulate emergencies to test network resilience and driver rerouting
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {FAILURE_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setFailureType(type.value)}
                        className={`p-3 rounded-xl text-left border transition-all ${failureType === type.value
                          ? 'bg-red-500/15 border-red-500/40'
                          : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'}`}
                      >
                        <span className="text-xl mb-1 block">{type.icon}</span>
                        <div className="text-sm font-medium text-slate-200">{type.label}</div>
                      </button>
                    ))}
                  </div>
                  {/* Target station selector */}
                  <div>
                    <label className="text-sm text-slate-300 font-medium mb-2 block">Target Station</label>
                    <select
                      value={targetStationId}
                      onChange={(e) => setTargetStationId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200"
                    >
                      {state.stations.filter(s => s.status !== 'offline').map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-xs text-red-300">
                      <AlertTriangle size={12} className="inline mr-1" />
                      {state.stations.find(s => s.id === targetStationId)?.name || 'Station'} will be affected. Drivers will auto-reroute.
                    </p>
                  </div>
                </div>
              )}

              {activeScenarioType === 'capacity' && (
                <div className="space-y-5">
                  <p className="text-sm text-slate-400">
                    Modify charger capacity at stations to test impact on throughput
                  </p>
                  <div>
                    <label className="text-sm text-slate-300 font-medium mb-2 block">Target Station</label>
                    <select
                      value={targetStationId}
                      onChange={(e) => setTargetStationId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200"
                    >
                      {state.stations.filter(s => s.status !== 'offline').map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.chargers} chargers)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 font-medium mb-2 block">
                      Charger Adjustment: <span className={chargerChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {chargerChange >= 0 ? '+' : ''}{chargerChange}
                      </span>
                    </label>
                    <input type="range" min="-6" max="10" value={chargerChange}
                      onChange={(e) => setChargerChange(Number(e.target.value))} className="w-full" />
                    <div className="flex justify-between text-xs text-slate-600 mt-1">
                      <span>-6</span><span>0</span><span>+10</span>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-xl">
                    <p className="text-xs text-slate-400">
                      Current: <span className="text-slate-200">{state.stations.find(s => s.id === targetStationId)?.chargers || 0}</span> chargers
                      {' '}&rarr;{' '}
                      <span className="text-blue-400">{(state.stations.find(s => s.id === targetStationId)?.chargers || 0) + chargerChange}</span>
                    </p>
                  </div>
                </div>
              )}

              {activeScenarioType === 'pricing' && (
                <div className="space-y-5">
                  <div className="p-3 bg-slate-800/50 rounded-xl">
                    <p className="text-sm text-slate-300 mb-1">Dynamic Pricing Strategy</p>
                    <p className="text-xs text-slate-500">
                      Increase prices during peak hours to balance demand. Higher prices reduce demand but increase revenue.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 font-medium mb-2 block">
                      Peak Hour Multiplier: <span className="text-amber-400">{pricingMultiplier}x</span>
                    </label>
                    <input type="range" min="1" max="2.5" step="0.1" value={pricingMultiplier}
                      onChange={(e) => setPricingMultiplier(Number(e.target.value))} className="w-full" />
                    <div className="flex justify-between text-xs text-slate-600 mt-1">
                      <span>1x</span><span>1.5x</span><span>2.5x</span>
                    </div>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <p className="text-xs text-amber-300">
                      Peak hours: 8 AM - 8 PM. ~30% price elasticity.
                    </p>
                  </div>
                </div>
              )}

              {activeScenarioType === 'inventory' && (
                <div className="space-y-5">
                  <div className="p-3 bg-slate-800/50 rounded-xl">
                    <p className="text-sm text-slate-300 mb-1">Inventory Management</p>
                    <p className="text-xs text-slate-500">
                      Set safety stock levels and rebalancing rules to optimize battery availability.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 font-medium mb-2 block">
                      Safety Stock: <span className="text-blue-400">{safetyStock} batteries</span>
                    </label>
                    <input type="range" min="5" max="25" value={safetyStock}
                      onChange={(e) => setSafetyStock(Number(e.target.value))} className="w-full" />
                    <div className="flex justify-between text-xs text-slate-600 mt-1">
                      <span>5</span><span>15</span><span>25</span>
                    </div>
                  </div>
                </div>
              )}

              {activeScenarioType === 'station_ops' && (
                <div className="space-y-5">
                  <div className="p-3 bg-slate-800/50 rounded-xl">
                    <p className="text-sm text-slate-300 mb-1">Station Operations</p>
                    <p className="text-xs text-slate-500">
                      Add or remove stations to test network capacity changes.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-left hover:bg-emerald-500/15 transition-colors">
                      <span className="text-2xl block mb-1">+</span>
                      <span className="text-sm font-medium text-emerald-300">Add Station</span>
                      <span className="text-xs text-slate-500 block mt-0.5">New 8-charger station</span>
                    </button>
                    <button className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-left hover:bg-red-500/15 transition-colors">
                      <span className="text-2xl block mb-1">-</span>
                      <span className="text-sm font-medium text-red-300">Remove Station</span>
                      <span className="text-xs text-slate-500 block mt-0.5">Close & reroute</span>
                    </button>
                  </div>
                </div>
              )}

              {activeScenarioType === 'network' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400">
                    Take stations offline to test network resilience. Drivers will auto-reroute to remaining stations.
                  </p>
                  <div>
                    <label className="text-sm text-slate-300 font-medium mb-2.5 block">Select Stations to Disable</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {state.stations.filter(s => s.status !== 'offline').map((s) => {
                        const isDisabled = networkDisabledStations.has(s.id);
                        return (
                          <button
                            key={s.id}
                            onClick={() => {
                              const next = new Set(networkDisabledStations);
                              if (isDisabled) next.delete(s.id); else next.add(s.id);
                              setNetworkDisabledStations(next);
                            }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isDisabled
                              ? 'bg-red-500/15 border-red-500/40'
                              : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                              }`}
                          >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${isDisabled ? 'bg-red-500 border-red-500 text-white' : 'border-slate-600'
                              }`}>
                              {isDisabled && '✓'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-200 truncate">{s.name}</div>
                              <div className="text-xs text-slate-500">{s.chargers} chargers · {s.location}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {networkDisabledStations.size > 0 && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-xs text-red-300">
                        <AlertTriangle size={12} className="inline mr-1" />
                        {networkDisabledStations.size} station(s) will go offline.
                        {' '}{state.stations.filter(s => s.status !== 'offline').length - networkDisabledStations.size} remaining to serve all drivers.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeScenarioType === 'growth' && (
                <div className="space-y-5">
                  <div className="p-3 bg-slate-800/50 rounded-xl">
                    <p className="text-sm text-slate-300 mb-1">Demand Growth Projection</p>
                    <p className="text-xs text-slate-500">
                      Model how increasing EV adoption affects network performance over time.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 font-medium mb-2 block">
                      Annual Growth Rate: <span className="text-emerald-400">{growthRate}%</span>
                    </label>
                    <input type="range" min="10" max="150" value={growthRate}
                      onChange={(e) => setGrowthRate(Number(e.target.value))} className="w-full" />
                    <div className="flex justify-between text-xs text-slate-600 mt-1">
                      <span>10%</span><span>75%</span><span>150%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 font-medium mb-2 block">
                      Timeline: <span className="text-blue-400">{growthTimeline} months</span>
                    </label>
                    <input type="range" min="3" max="24" value={growthTimeline}
                      onChange={(e) => setGrowthTimeline(Number(e.target.value))} className="w-full" />
                    <div className="flex justify-between text-xs text-slate-600 mt-1">
                      <span>3mo</span><span>12mo</span><span>24mo</span>
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <p className="text-xs text-emerald-300">
                      <TrendingUp size={12} className="inline mr-1" />
                      Projected demand increase:{' '}
                      <span className="font-bold">
                        {((Math.pow(Math.pow(1 + growthRate / 100, 1 / 12), growthTimeline) - 1) * 100).toFixed(0)}%
                      </span>
                      {' '}over {growthTimeline} months
                    </p>
                  </div>
                </div>
              )}

              {activeScenarioType === 'combined' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400">
                    Stack multiple interventions to test compound effects on the network.
                  </p>

                  {/* Demand toggle */}
                  <div className={`rounded-xl border transition-all ${combinedDemand ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                    <button
                      onClick={() => setCombinedDemand(!combinedDemand)}
                      className="w-full flex items-center gap-3 p-3.5 text-left"
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${combinedDemand ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-600'
                        }`}>
                        {combinedDemand && '✓'}
                      </div>
                      <Cloud size={16} className="text-slate-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-200">Demand Surge</div>
                        <div className="text-xs text-slate-500">Increase swap demand</div>
                      </div>
                    </button>
                    {combinedDemand && (
                      <div className="px-3.5 pb-3.5">
                        <input type="range" min="100" max="200" value={combinedDemandValue * 100}
                          onChange={(e) => setCombinedDemandValue(Number(e.target.value) / 100)} className="w-full" />
                        <div className="text-xs text-blue-400 mt-1">+{((combinedDemandValue - 1) * 100).toFixed(0)}% demand</div>
                      </div>
                    )}
                  </div>

                  {/* Capacity toggle */}
                  <div className={`rounded-xl border transition-all ${combinedCapacity ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                    <button
                      onClick={() => setCombinedCapacity(!combinedCapacity)}
                      className="w-full flex items-center gap-3 p-3.5 text-left"
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${combinedCapacity ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600'
                        }`}>
                        {combinedCapacity && '✓'}
                      </div>
                      <Zap size={16} className="text-slate-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-200">Add Chargers</div>
                        <div className="text-xs text-slate-500">Extra chargers at all stations</div>
                      </div>
                    </button>
                    {combinedCapacity && (
                      <div className="px-3.5 pb-3.5">
                        <input type="range" min="1" max="8" value={combinedCapacityValue}
                          onChange={(e) => setCombinedCapacityValue(Number(e.target.value))} className="w-full" />
                        <div className="text-xs text-emerald-400 mt-1">+{combinedCapacityValue} chargers per station</div>
                      </div>
                    )}
                  </div>

                  {/* Pricing toggle */}
                  <div className={`rounded-xl border transition-all ${combinedPricing ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                    <button
                      onClick={() => setCombinedPricing(!combinedPricing)}
                      className="w-full flex items-center gap-3 p-3.5 text-left"
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${combinedPricing ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-600'
                        }`}>
                        {combinedPricing && '✓'}
                      </div>
                      <DollarSign size={16} className="text-slate-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-200">Dynamic Pricing</div>
                        <div className="text-xs text-slate-500">Peak hour multiplier</div>
                      </div>
                    </button>
                    {combinedPricing && (
                      <div className="px-3.5 pb-3.5">
                        <input type="range" min="100" max="250" step="10" value={combinedPricingValue * 100}
                          onChange={(e) => setCombinedPricingValue(Number(e.target.value) / 100)} className="w-full" />
                        <div className="text-xs text-amber-400 mt-1">{combinedPricingValue}x peak pricing</div>
                      </div>
                    )}
                  </div>

                  {!combinedDemand && !combinedCapacity && !combinedPricing && (
                    <p className="text-xs text-slate-600 text-center py-2">
                      Select at least one intervention above
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Apply Button */}
            {activeScenarioType !== 'baseline' && (
              <div className="p-5 border-t border-slate-800">
                {appliedFeedback && (
                  <div className="mb-3 p-3 bg-emerald-500/15 border border-emerald-500/25 rounded-xl animate-pulse">
                    <span className="text-emerald-400 text-sm font-medium">{appliedFeedback}</span>
                  </div>
                )}
                <button
                  onClick={handleApplyScenario}
                  disabled={state.isRunning}
                  className={`group w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all
                    ${state.isRunning
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 bg-[length:200%_100%] text-white hover:bg-right shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]'}`}
                  style={{ backgroundPosition: '0% 50%', transition: 'all 0.3s ease, background-position 0.5s ease' }}
                >
                  <Zap size={16} className="group-hover:animate-pulse" />
                  Apply Scenario & See Impact
                </button>
                <p className="text-xs text-slate-600 mt-2 text-center">
                  Run simulation after applying to see real-time changes
                </p>
              </div>
            )}
          </div>

          {/* Alerts */}
          {state.alerts.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/50">
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Alerts</div>
              <div className="space-y-1.5 max-h-20 overflow-y-auto">
                {state.alerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className={`text-xs px-3 py-2 rounded-lg
                      ${alert.type === 'danger' ? 'bg-red-500/10 text-red-300' :
                        alert.type === 'warning' ? 'bg-amber-500/10 text-amber-300' :
                          'bg-blue-500/10 text-blue-300'}`}
                  >
                    {alert.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Map Panel */}
        <div className="flex-1 relative isolate">
          {/* Map */}
          <div className="h-full w-full">
            <LeafletMap
              stations={state.stations}
              drivers={state.drivers}
              showConnections={true}
              showDrivers={true}
            />
          </div>

          {/* Map Overlay - Info */}
          <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-sm px-4 py-2.5 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-3">
              <MapPin className="text-blue-400" size={16} />
              <div>
                <h2 className="font-semibold text-sm text-white">
                  {dataMode === 'real' ? 'Live Station Network' : 'Simulated Network'}
                </h2>
                <p className="text-xs text-slate-400">
                  {state.stations.filter(s => s.status !== 'offline').length} of {state.stations.length} stations operational
                  {dataMode === 'real' && realStationCount > 0 && ` (${realStationCount} from Open Charge Map)`}
                </p>
              </div>
            </div>
          </div>

          {/* Map Overlay - Legend */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-sm px-3.5 py-2.5 rounded-lg border border-slate-700/50">
            <div className="flex gap-4 text-xs">
              {[
                { color: 'bg-emerald-500', label: 'Operational' },
                { color: 'bg-amber-500', label: 'Low Stock' },
                { color: 'bg-orange-500', label: 'Overloaded' },
                { color: 'bg-red-500', label: 'Emergency' },
                { color: 'bg-cyan-400', label: 'Driver', small: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className={`${item.small ? 'w-2 h-2' : 'w-2.5 h-2.5'} rounded-full ${item.color}`} />
                  <span className="text-slate-400">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Map Overlay - Stats */}
          <div className="absolute top-4 right-4 z-[1000] flex items-center gap-3 bg-slate-900/90 backdrop-blur-sm px-4 py-2.5 rounded-lg border border-slate-700/50 text-sm text-slate-400">
            <div className="flex items-center gap-1.5">
              <Users size={13} />
              {state.drivers.length} drivers
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={13} />
              {state.stations.filter(s => s.status !== 'offline').length} stations
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
