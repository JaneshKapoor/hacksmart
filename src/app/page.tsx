'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSimulation } from '@/hooks/useSimulation';
import { NetworkMap } from '@/components/simulation/NetworkMap';
import { SlideOver } from '@/components/ui/Modal';
import { Station, ScenarioType, SCENARIO_CATEGORIES, WEATHER_OPTIONS, FAILURE_TYPES } from '@/simulation/types';
import {
  Play, Pause, RotateCcw, Zap, MapPin, Clock, Battery, Users,
  TrendingUp, TrendingDown, AlertTriangle, ChevronRight, Info,
  BarChart3, Store, Cloud, DollarSign, ArrowUpRight, Shuffle,
  Activity, Flame
} from 'lucide-react';

export default function ControlCenter() {
  const router = useRouter();
  const { state, start, pause, reset, setSpeed, setScenario, applyInterventions } = useSimulation();
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [activeScenarioType, setActiveScenarioType] = useState<ScenarioType>('baseline');
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  // Scenario parameters
  const [demandMultiplier, setDemandMultiplier] = useState(1.0);
  const [weatherType, setWeatherType] = useState('normal');
  const [failureType, setFailureType] = useState('fire');
  const [chargerChange, setChargerChange] = useState(0);
  const [targetStationId, setTargetStationId] = useState('station-1');
  const [safetyStock, setSafetyStock] = useState(10);
  const [pricingMultiplier, setPricingMultiplier] = useState(1.5);

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Initializing Digital Twin...</p>
        </div>
      </div>
    );
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
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
      feedbackMsg = `✓ Demand increased by ${((demandMultiplier - 1) * 100).toFixed(0)}% (${weatherType.replace('_', ' ')})`;
    } else if (activeScenarioType === 'failures') {
      interventions.push({
        id: `failure-${Date.now()}`,
        type: 'trigger_emergency' as const,
        stationId: targetStationId,
        emergencyType: failureType as 'fire' | 'power_outage' | 'charger_failure' | 'overload' | 'no_battery',
        duration: 120,
      });
      const stationName = state.stations.find(s => s.id === targetStationId)?.name || 'Station';
      feedbackMsg = `✓ ${failureType.replace('_', ' ')} triggered at ${stationName}`;
    } else if (activeScenarioType === 'capacity') {
      interventions.push({
        id: `capacity-${Date.now()}`,
        type: 'modify_chargers' as const,
        stationId: targetStationId,
        value: 12 + chargerChange,
      });
      feedbackMsg = `✓ Chargers ${chargerChange >= 0 ? 'increased' : 'reduced'} by ${Math.abs(chargerChange)} at Central Hub`;
    } else if (activeScenarioType === 'pricing') {
      interventions.push({
        id: `pricing-${Date.now()}`,
        type: 'pricing_change' as const,
        value: pricingMultiplier,
      });
      feedbackMsg = `✓ Dynamic pricing applied (${pricingMultiplier}x during peak hours)`;
    } else if (activeScenarioType === 'inventory') {
      // Simulate inventory rebalancing by adjusting demand
      interventions.push({
        id: `inventory-${Date.now()}`,
        type: 'demand_shift' as const,
        value: 0.9, // Reduced demand due to better stock management
        params: { safetyStock },
      });
      feedbackMsg = `✓ Inventory policy applied (safety stock: ${safetyStock} batteries)`;
    } else if (activeScenarioType === 'station_ops') {
      interventions.push({
        id: `station-${Date.now()}`,
        type: 'add_station' as const,
        position: { x: 55, y: 65 },
        params: { chargers: 8, bays: 40 },
      });
      feedbackMsg = `✓ New station added to network`;
    } else {
      feedbackMsg = `✓ ${SCENARIO_CATEGORIES.find(c => c.type === activeScenarioType)?.label} scenario applied`;
    }

    applyInterventions(interventions);
    setAppliedFeedback(feedbackMsg);

    // Clear feedback after 3 seconds
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
    baseline: <BarChart3 size={18} />,
    station_ops: <Store size={18} />,
    capacity: <Zap size={18} />,
    inventory: <Battery size={18} />,
    demand: <Cloud size={18} />,
    network: <MapPin size={18} />,
    pricing: <DollarSign size={18} />,
    failures: <AlertTriangle size={18} />,
    growth: <ArrowUpRight size={18} />,
    combined: <Shuffle size={18} />,
  };

  const getKPIDelta = (value: number, baseline: number, inverse: boolean) => {
    const diff = value - baseline;
    const pct = baseline !== 0 ? (diff / baseline) * 100 : 0;
    const isBetter = inverse ? diff < 0 : diff > 0;
    return { pct, isBetter };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Full-width Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                Battery<span className="text-blue-400">Smart</span>
              </h1>
              <p className="text-xs text-slate-400">Digital Twin Simulation • What-If Scenario Testing</p>
            </div>
          </div>

          {/* Center: Simulation Controls */}
          <div className="flex items-center gap-6 bg-slate-800/50 px-6 py-3 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2">
              {!state.isRunning ? (
                <button
                  onClick={start}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-400 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  <Play size={16} />
                  Run Simulation
                </button>
              ) : (
                <button
                  onClick={pause}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  <Pause size={16} />
                  Pause
                </button>
              )}
              <button
                onClick={reset}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
                title="Reset Simulation"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            <div className="h-8 w-px bg-slate-600" />

            {/* Time Display */}
            <div className="text-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Simulation Time</div>
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${state.isRunning ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600 text-slate-400'}`}>
                  {state.isRunning ? 'LIVE' : 'PAUSED'}
                </span>
                <span className="text-lg font-bold font-mono">{formatTime(state.time)}</span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-[10px] text-slate-500 uppercase">Day</div>
              <span className="text-lg font-bold">{state.day}</span>
            </div>

            <div className="h-8 w-px bg-slate-600" />

            {/* Speed Control */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Speed:</span>
              {[1, 2, 4, 8].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${state.speed === s ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Right: Status & Navigation */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <MapPin size={14} />
              <span>Delhi NCR</span>
            </div>
            <button
              onClick={() => router.push('/analytics')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm hover:bg-slate-700 transition-colors"
            >
              <Activity size={16} />
              Analytics
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Full Height */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel: Network Map (60%) */}
        <div className="flex-1 p-6">
          <div className="h-full bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden relative">
            {/* Map Header */}
            <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-700">
              <div className="flex items-center gap-3">
                <MapPin className="text-blue-400" size={18} />
                <div>
                  <h2 className="font-semibold text-white">City Network Map</h2>
                  <p className="text-xs text-slate-400">
                    {state.stations.filter(s => s.status === 'operational').length} of {state.stations.length} stations operational • {state.drivers.length} active drivers
                  </p>
                </div>
              </div>
            </div>

            {/* Network Map */}
            <div className="h-full w-full">
              <NetworkMap
                stations={state.stations}
                drivers={state.drivers}
                onStationClick={setSelectedStation}
                showConnections={true}
                showDrivers={true}
              />
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm px-4 py-3 rounded-lg border border-slate-700">
              <div className="text-[10px] text-slate-500 uppercase mb-2">Station Status</div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-slate-300">Operational</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-xs text-slate-300">Low Stock</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-xs text-slate-300">Overloaded</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-slate-300">Emergency</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-xs text-slate-300">Driver</span>
                </div>
              </div>
            </div>

            {/* Click hint */}
            <div className="absolute bottom-4 right-4 bg-blue-500/10 border border-blue-500/30 px-3 py-2 rounded-lg">
              <p className="text-xs text-blue-300">
                <Info size={12} className="inline mr-1" />
                Click on any station for details
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel: Controls & KPIs (40%) */}
        <div className="w-[480px] border-l border-slate-800 bg-slate-900/30 flex flex-col">
          {/* KPI Cards */}
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-400" />
                Key Performance Indicators
              </h2>
              {state.activeScenario && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                  vs Baseline
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {kpiData.map((kpi) => {
                const Icon = kpi.icon;
                const { pct, isBetter } = getKPIDelta(kpi.value, kpi.baseline, kpi.inverse);
                const showDelta = state.activeScenario && Math.abs(pct) >= 0.5;

                return (
                  <div
                    key={kpi.label}
                    className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-lg bg-${kpi.color}-500/20`}>
                        <Icon size={14} className={`text-${kpi.color}-400`} />
                      </div>
                      <span className="text-xs text-slate-400">{kpi.label}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-bold">
                        {kpi.value.toFixed(kpi.unit === '%' || kpi.unit === 'min' ? 1 : 0)}
                        <span className="text-sm text-slate-400 ml-1">{kpi.unit}</span>
                      </div>
                      {showDelta && (
                        <div className={`flex items-center gap-0.5 text-xs font-medium ${isBetter ? 'text-emerald-400' : 'text-red-400'}`}>
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
            <div className="p-6 pb-4">
              <h2 className="font-semibold text-white flex items-center gap-2 mb-1">
                <Shuffle size={18} className="text-purple-400" />
                Scenario Builder
              </h2>
              <p className="text-xs text-slate-400">
                Test "what-if" scenarios by modifying network parameters
              </p>
            </div>

            {/* Scenario Tabs */}
            <div className="px-6 overflow-x-auto">
              <div className="flex gap-1 pb-2">
                {SCENARIO_CATEGORIES.slice(0, 6).map((cat) => (
                  <button
                    key={cat.type}
                    onClick={() => !state.isRunning && handleScenarioChange(cat.type)}
                    disabled={state.isRunning}
                    className={`
                      flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                      transition-all whitespace-nowrap
                      ${activeScenarioType === cat.type
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }
                      ${state.isRunning ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {scenarioIcons[cat.type]}
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {SCENARIO_CATEGORIES.slice(6).map((cat) => (
                  <button
                    key={cat.type}
                    onClick={() => !state.isRunning && handleScenarioChange(cat.type)}
                    disabled={state.isRunning}
                    className={`
                      flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                      transition-all whitespace-nowrap
                      ${activeScenarioType === cat.type
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }
                      ${state.isRunning ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {scenarioIcons[cat.type]}
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scenario Controls */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeScenarioType === 'baseline' && (
                <div className="text-center py-8">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                  <h3 className="text-lg font-medium text-slate-300 mb-2">Baseline Mode</h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto">
                    Current network state without any interventions. Select a scenario above to test changes.
                  </p>
                </div>
              )}

              {activeScenarioType === 'demand' && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-slate-300 font-medium mb-3 block">Weather Condition</label>
                    <div className="grid grid-cols-2 gap-2">
                      {WEATHER_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setWeatherType(opt.value);
                            setDemandMultiplier(opt.multiplier);
                          }}
                          className={`p-3 rounded-xl text-left border transition-all ${weatherType === opt.value
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                        >
                          <Cloud size={16} className="mb-1" />
                          <div className="text-sm font-medium">{opt.label}</div>
                          <div className="text-xs opacity-70">
                            {((opt.multiplier - 1) * 100).toFixed(0)}% demand change
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-300 font-medium mb-2 block">
                      Demand Multiplier: <span className="text-blue-400">{(demandMultiplier * 100).toFixed(0)}%</span>
                    </label>
                    <input
                      type="range"
                      min="80"
                      max="200"
                      value={demandMultiplier * 100}
                      onChange={(e) => setDemandMultiplier(Number(e.target.value) / 100)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {activeScenarioType === 'failures' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400 mb-4">
                    Simulate emergencies to test network resilience and driver rerouting
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {FAILURE_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setFailureType(type.value)}
                        className={`p-3 rounded-xl text-left border transition-all ${failureType === type.value
                          ? 'bg-red-500/20 border-red-500/50'
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                          }`}
                      >
                        <span className="text-2xl mb-1 block">{type.icon}</span>
                        <div className="text-sm font-medium text-slate-200">{type.label}</div>
                      </button>
                    ))}
                  </div>
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mt-4">
                    <p className="text-xs text-red-300">
                      <AlertTriangle size={12} className="inline mr-1" />
                      Central Hub will be affected. Drivers will auto-reroute.
                    </p>
                  </div>
                </div>
              )}

              {activeScenarioType === 'capacity' && (
                <div className="space-y-6">
                  <p className="text-sm text-slate-400">
                    Modify charger capacity at stations to test impact on throughput
                  </p>
                  <div>
                    <label className="text-sm text-slate-300 font-medium mb-2 block">
                      Charger Adjustment: <span className={chargerChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {chargerChange >= 0 ? '+' : ''}{chargerChange}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="-6"
                      max="10"
                      value={chargerChange}
                      onChange={(e) => setChargerChange(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>-6 (reduce)</span>
                      <span>0</span>
                      <span>+10 (add)</span>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-slate-400">
                      Target station: <span className="text-slate-200">Central Hub</span>
                      <br />
                      Current chargers: <span className="text-slate-200">12</span> →
                      <span className="text-blue-400 ml-1">{12 + chargerChange}</span>
                    </p>
                  </div>
                </div>
              )}

              {activeScenarioType === 'pricing' && (
                <div className="space-y-6">
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-slate-300 mb-2">💰 Dynamic Pricing Strategy</p>
                    <p className="text-xs text-slate-500">
                      Increase prices during peak hours to balance demand across stations.
                      Higher prices will reduce demand but increase revenue per swap.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 font-medium mb-2 block">
                      Peak Hour Multiplier: <span className="text-amber-400">{pricingMultiplier}x</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="2.5"
                      step="0.1"
                      value={pricingMultiplier}
                      onChange={(e) => setPricingMultiplier(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>1x (no change)</span>
                      <span>1.5x</span>
                      <span>2.5x (high)</span>
                    </div>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-300">
                      Peak hours: 8 AM - 8 PM. Price affects demand by ~30% elasticity.
                    </p>
                  </div>
                </div>
              )}

              {activeScenarioType === 'inventory' && (
                <div className="space-y-6">
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-slate-300 mb-2">🔋 Inventory Management</p>
                    <p className="text-xs text-slate-500">
                      Set safety stock levels and rebalancing rules to optimize battery availability.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 font-medium mb-2 block">
                      Safety Stock Level: <span className="text-blue-400">{safetyStock} batteries</span>
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="25"
                      value={safetyStock}
                      onChange={(e) => setSafetyStock(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>5 (low)</span>
                      <span>15</span>
                      <span>25 (high)</span>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-blue-300">
                      Batteries will be redistributed when any station falls below safety stock.
                    </p>
                  </div>
                </div>
              )}

              {activeScenarioType === 'station_ops' && (
                <div className="space-y-6">
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-slate-300 mb-2">🏪 Station Operations</p>
                    <p className="text-xs text-slate-500">
                      Add or remove stations to test network capacity changes.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { }}
                      className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-left hover:bg-emerald-500/20 transition-colors"
                    >
                      <span className="text-2xl mb-2 block">➕</span>
                      <span className="text-sm font-medium text-emerald-300">Add Station</span>
                      <span className="text-xs text-slate-500 block mt-1">New 8-charger station</span>
                    </button>
                    <button
                      onClick={() => { }}
                      className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-left hover:bg-red-500/20 transition-colors"
                    >
                      <span className="text-2xl mb-2 block">➖</span>
                      <span className="text-sm font-medium text-red-300">Remove Station</span>
                      <span className="text-xs text-slate-500 block mt-1">Close & reroute</span>
                    </button>
                  </div>
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <p className="text-xs text-emerald-300">
                      Click Apply to add a new station at coordinates (55%, 65%) on the map.
                    </p>
                  </div>
                </div>
              )}

              {['network', 'growth', 'combined'].includes(activeScenarioType) && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">{SCENARIO_CATEGORIES.find(c => c.type === activeScenarioType)?.icon}</div>
                  <h3 className="text-lg font-medium text-slate-300 mb-2">
                    {SCENARIO_CATEGORIES.find(c => c.type === activeScenarioType)?.label}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {SCENARIO_CATEGORIES.find(c => c.type === activeScenarioType)?.description}
                  </p>
                  <p className="text-xs text-slate-600">
                    Advanced controls coming soon. Click Apply to test default settings.
                  </p>
                </div>
              )}
            </div>

            {/* Apply Button */}
            {activeScenarioType !== 'baseline' && (
              <div className="p-6 border-t border-slate-800">
                {/* Success Feedback Toast */}
                {appliedFeedback && (
                  <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center gap-2 animate-pulse">
                    <span className="text-emerald-400 text-sm font-medium">
                      {appliedFeedback}
                    </span>
                  </div>
                )}

                <button
                  onClick={handleApplyScenario}
                  disabled={state.isRunning}
                  className={`
                    w-full py-3 rounded-xl font-medium text-sm 
                    flex items-center justify-center gap-2
                    transition-all
                    ${state.isRunning
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90 shadow-lg shadow-blue-500/25'
                    }
                  `}
                >
                  <Zap size={16} />
                  Apply Scenario & See Impact
                </button>

                <p className="text-[10px] text-slate-600 mt-2 text-center">
                  Click Run Simulation after applying to see real-time changes
                </p>
              </div>
            )}
          </div>

          {/* Alerts Section */}
          {state.alerts.length > 0 && (
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
              <div className="text-xs text-slate-500 uppercase mb-2">Recent Alerts</div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {state.alerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className={`
                      text-xs px-3 py-2 rounded-lg flex items-center gap-2
                      ${alert.type === 'danger' ? 'bg-red-500/10 text-red-300' :
                        alert.type === 'warning' ? 'bg-amber-500/10 text-amber-300' :
                          'bg-blue-500/10 text-blue-300'}
                    `}
                  >
                    {alert.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Station Details SlideOver */}
      <SlideOver
        isOpen={selectedStation !== null}
        onClose={() => setSelectedStation(null)}
        title={selectedStation?.name}
        width="md"
      >
        {selectedStation && (
          <div className="space-y-6">
            <div className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
              ${selectedStation.status === 'operational' ? 'bg-emerald-500/15 text-emerald-400' :
                selectedStation.status === 'fire' ? 'bg-red-500/15 text-red-400' :
                  'bg-amber-500/15 text-amber-400'}
            `}>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              {selectedStation.status.replace('_', ' ').toUpperCase()}
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <MapPin size={16} />
              <span>{selectedStation.location}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Clock size={12} />
                  Wait Time
                </div>
                <div className="text-2xl font-bold">
                  {selectedStation.avgWaitTime.toFixed(1)}<span className="text-sm text-slate-400">m</span>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Users size={12} />
                  Queue
                </div>
                <div className="text-2xl font-bold">{selectedStation.queueLength}</div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Battery Inventory</span>
                <span className="text-white font-medium">
                  {selectedStation.currentInventory} / {selectedStation.inventoryCap}
                </span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${selectedStation.currentInventory / selectedStation.inventoryCap < 0.2 ? 'bg-red-500' :
                    selectedStation.currentInventory / selectedStation.inventoryCap < 0.5 ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}
                  style={{ width: `${(selectedStation.currentInventory / selectedStation.inventoryCap) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
              <div>
                <span className="text-slate-500 text-sm block">Total Swaps</span>
                <span className="text-xl font-bold">{selectedStation.totalSwaps}</span>
              </div>
              <div>
                <span className="text-slate-500 text-sm block">Lost Swaps</span>
                <span className="text-xl font-bold text-red-400">{selectedStation.lostSwaps}</span>
              </div>
              <div>
                <span className="text-slate-500 text-sm block">Chargers</span>
                <span className="text-xl font-bold">{selectedStation.activeChargers}/{selectedStation.chargers}</span>
              </div>
              <div>
                <span className="text-slate-500 text-sm block">Utilization</span>
                <span className={`text-xl font-bold ${selectedStation.utilizationRate > 0.9 ? 'text-red-400' :
                  selectedStation.utilizationRate > 0.7 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                  {(selectedStation.utilizationRate * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
