'use client';

import { useState } from 'react';
import {
    BarChart3, Store, Zap, Battery, TrendingUp, MapPin,
    DollarSign, AlertTriangle, ArrowUpRight, Shuffle, Plus, Minus, Cloud, Calendar, Clock
} from 'lucide-react';
import { ScenarioType, SCENARIO_CATEGORIES, WEATHER_OPTIONS, FAILURE_TYPES, Intervention } from '@/simulation/types';
import { Button, Card, Badge } from '@/components/ui';
import { Slider, Toggle } from '@/components/ui/Slider';

interface ScenarioBuilderProps {
    activeScenario: ScenarioType;
    onScenarioChange: (type: ScenarioType) => void;
    onApplyScenario: (interventions: Intervention[]) => void;
    isRunning: boolean;
}

export function ScenarioBuilder({
    activeScenario,
    onScenarioChange,
    onApplyScenario,
    isRunning,
}: ScenarioBuilderProps) {
    // Scenario parameters state
    const [stationChargers, setStationChargers] = useState(8);
    const [stationBays, setStationBays] = useState(40);
    const [weatherType, setWeatherType] = useState('normal');
    const [demandMultiplier, setDemandMultiplier] = useState(1.0);
    const [selectedStations, setSelectedStations] = useState<string[]>([]);
    const [failureType, setFailureType] = useState('fire');
    const [failureDuration, setFailureDuration] = useState(2);
    const [pricingMultiplier, setPricingMultiplier] = useState(1.0);
    const [safetyStock, setSafetyStock] = useState(10);
    const [rebalanceFrequency, setRebalanceFrequency] = useState(4);
    const [growthRate, setGrowthRate] = useState(20);
    const [growthTimeline, setGrowthTimeline] = useState(12);

    const iconMap: Record<ScenarioType, React.ReactNode> = {
        baseline: <BarChart3 size={16} />,
        station_ops: <Store size={16} />,
        capacity: <Zap size={16} />,
        inventory: <Battery size={16} />,
        demand: <TrendingUp size={16} />,
        network: <MapPin size={16} />,
        pricing: <DollarSign size={16} />,
        failures: <AlertTriangle size={16} />,
        growth: <ArrowUpRight size={16} />,
        combined: <Shuffle size={16} />,
    };

    const handleApply = () => {
        const interventions: Intervention[] = [];

        switch (activeScenario) {
            case 'demand':
                interventions.push({
                    id: `demand-${Date.now()}`,
                    type: 'demand_shift',
                    value: demandMultiplier,
                    params: { weather: weatherType },
                });
                break;
            case 'failures':
                interventions.push({
                    id: `failure-${Date.now()}`,
                    type: 'trigger_emergency',
                    stationId: 'station-1', // Will be enhanced with multi-select
                    emergencyType: failureType as Intervention['emergencyType'],
                    duration: failureDuration * 60,
                });
                break;
            case 'capacity':
                interventions.push({
                    id: `capacity-${Date.now()}`,
                    type: 'modify_chargers',
                    stationId: 'station-1',
                    value: stationChargers,
                });
                break;
            case 'pricing':
                interventions.push({
                    id: `pricing-${Date.now()}`,
                    type: 'pricing_change',
                    value: pricingMultiplier,
                });
                break;
        }

        onApplyScenario(interventions);
    };

    const renderScenarioControls = () => {
        switch (activeScenario) {
            case 'baseline':
                return (
                    <div className="text-center py-8 text-slate-400">
                        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Current network state</p>
                        <p className="text-xs text-slate-500 mt-1">No interventions applied</p>
                    </div>
                );

            case 'station_ops':
                return (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Button variant="secondary" size="sm" className="flex-1">
                                <Plus size={14} /> Add Station
                            </Button>
                            <Button variant="secondary" size="sm" className="flex-1">
                                <Minus size={14} /> Remove Station
                            </Button>
                        </div>
                        <div className="p-3 bg-slate-800/50 rounded-lg text-xs text-slate-400">
                            Click on the map to place a new station, or select an existing station to remove.
                        </div>
                        <Slider
                            label="Chargers"
                            value={stationChargers}
                            onChange={setStationChargers}
                            min={4}
                            max={20}
                            unit=" units"
                        />
                        <Slider
                            label="Battery Bays"
                            value={stationBays}
                            onChange={setStationBays}
                            min={20}
                            max={80}
                            unit=" bays"
                        />
                    </div>
                );

            case 'capacity':
                return (
                    <div className="space-y-4">
                        <p className="text-xs text-slate-400">Modify charger count at selected stations</p>
                        <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="text-xs text-slate-500 mb-2">Select station from map</div>
                            <div className="text-sm text-slate-200">Central Hub (Station 1)</div>
                        </div>
                        <Slider
                            label="New Charger Count"
                            value={stationChargers}
                            onChange={setStationChargers}
                            min={4}
                            max={24}
                            unit=" chargers"
                        />
                        <div className="flex items-center gap-2">
                            <Toggle
                                enabled={stationChargers > 12}
                                onChange={() => setStationChargers(stationChargers > 12 ? 8 : 16)}
                                label="Fast Chargers"
                            />
                        </div>
                    </div>
                );

            case 'inventory':
                return (
                    <div className="space-y-4">
                        <Slider
                            label="Safety Stock Level"
                            value={safetyStock}
                            onChange={setSafetyStock}
                            min={5}
                            max={30}
                            unit=" batteries"
                        />
                        <Slider
                            label="Rebalance Frequency"
                            value={rebalanceFrequency}
                            onChange={setRebalanceFrequency}
                            min={1}
                            max={8}
                            unit=" hours"
                        />
                        <div className="p-3 bg-slate-800/50 rounded-lg text-xs text-slate-400">
                            Batteries will be redistributed when any station drops below {safetyStock} charged batteries.
                        </div>
                    </div>
                );

            case 'demand':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-400 block mb-2">Weather Condition</label>
                            <div className="grid grid-cols-2 gap-2">
                                {WEATHER_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => {
                                            setWeatherType(opt.value);
                                            setDemandMultiplier(opt.multiplier);
                                        }}
                                        className={`
                      p-2 rounded-lg text-xs font-medium text-left
                      border transition-all
                      ${weatherType === opt.value
                                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                                            }
                    `}
                                    >
                                        <Cloud size={14} className="inline mr-1.5" />
                                        {opt.label}
                                        <span className="block text-[10px] text-slate-500 mt-0.5">
                                            {(opt.multiplier * 100 - 100).toFixed(0)}% demand
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Slider
                            label="Demand Multiplier"
                            value={demandMultiplier * 100}
                            onChange={(v) => setDemandMultiplier(v / 100)}
                            min={80}
                            max={200}
                            unit="%"
                        />
                    </div>
                );

            case 'network':
                return (
                    <div className="space-y-4">
                        <p className="text-xs text-slate-400 mb-3">
                            Analyze network topology and coverage gaps
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <button className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-left hover:border-slate-600 transition-colors">
                                <MapPin size={16} className="text-blue-400 mb-1" />
                                <div className="text-xs text-slate-200">Coverage Map</div>
                                <div className="text-[10px] text-slate-500">Show radius overlays</div>
                            </button>
                            <button className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-left hover:border-slate-600 transition-colors">
                                <TrendingUp size={16} className="text-emerald-400 mb-1" />
                                <div className="text-xs text-slate-200">Optimal Locations</div>
                                <div className="text-[10px] text-slate-500">AI suggestions</div>
                            </button>
                        </div>
                    </div>
                );

            case 'pricing':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {['flat', 'time_based'].map((strategy) => (
                                <button
                                    key={strategy}
                                    className={`
                    p-2 rounded-lg text-xs font-medium
                    border transition-all
                    ${strategy === 'flat'
                                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                            : 'bg-slate-800/50 border-slate-700 text-slate-400'
                                        }
                  `}
                                >
                                    {strategy === 'flat' ? 'Flat Pricing' : 'Time-Based'}
                                </button>
                            ))}
                        </div>
                        <Slider
                            label="Peak Hour Multiplier"
                            value={pricingMultiplier * 100}
                            onChange={(v) => setPricingMultiplier(v / 100)}
                            min={100}
                            max={200}
                            unit="%"
                        />
                        <div className="p-3 bg-slate-800/50 rounded-lg text-xs text-slate-400">
                            <Clock size={12} className="inline mr-1" />
                            Peak hours: 8 AM - 8 PM
                        </div>
                    </div>
                );

            case 'failures':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            {FAILURE_TYPES.slice(0, 4).map((type) => (
                                <button
                                    key={type.value}
                                    onClick={() => setFailureType(type.value)}
                                    className={`
                    p-2 rounded-lg text-xs font-medium text-left
                    border transition-all
                    ${failureType === type.value
                                            ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                                        }
                  `}
                                >
                                    <span className="text-lg mr-1.5">{type.icon}</span>
                                    {type.label}
                                </button>
                            ))}
                        </div>
                        <Slider
                            label="Duration"
                            value={failureDuration}
                            onChange={setFailureDuration}
                            min={1}
                            max={8}
                            unit=" hours"
                        />
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300">
                            Drivers will be automatically rerouted to nearest available station.
                        </div>
                    </div>
                );

            case 'growth':
                return (
                    <div className="space-y-4">
                        <Slider
                            label="Annual Growth Rate"
                            value={growthRate}
                            onChange={setGrowthRate}
                            min={5}
                            max={50}
                            unit="% / year"
                        />
                        <Slider
                            label="Projection Timeline"
                            value={growthTimeline}
                            onChange={setGrowthTimeline}
                            min={3}
                            max={36}
                            unit=" months"
                        />
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300">
                            Projected demand in {growthTimeline} months: +{Math.round(growthRate * (growthTimeline / 12))}%
                        </div>
                    </div>
                );

            case 'combined':
                return (
                    <div className="space-y-4">
                        <p className="text-xs text-slate-400">
                            Combine multiple interventions for complex scenario testing
                        </p>
                        <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="text-xs text-slate-500 mb-2">Active Interventions</div>
                            <div className="text-sm text-slate-400 italic">No interventions added yet</div>
                        </div>
                        <Button variant="secondary" size="sm" className="w-full">
                            <Plus size={14} /> Add Intervention
                        </Button>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Card className="h-full" padding="none">
            {/* Tabs */}
            <div className="border-b border-slate-800 overflow-x-auto">
                <div className="flex min-w-max">
                    {SCENARIO_CATEGORIES.map((cat) => (
                        <button
                            key={cat.type}
                            onClick={() => !isRunning && onScenarioChange(cat.type)}
                            disabled={isRunning}
                            className={`
                flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium
                border-b-2 transition-all whitespace-nowrap
                ${activeScenario === cat.type
                                    ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                                }
                ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}
              `}
                        >
                            {iconMap[cat.type]}
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Scenario header */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{SCENARIO_CATEGORIES.find((c) => c.type === activeScenario)?.icon}</span>
                        <h3 className="text-sm font-semibold text-white">
                            {SCENARIO_CATEGORIES.find((c) => c.type === activeScenario)?.label}
                        </h3>
                        {activeScenario !== 'baseline' && (
                            <Badge variant="info" dot>Active</Badge>
                        )}
                    </div>
                    <p className="text-xs text-slate-500">
                        {SCENARIO_CATEGORIES.find((c) => c.type === activeScenario)?.description}
                    </p>
                </div>

                {/* Controls */}
                <div className="min-h-[200px]">
                    {renderScenarioControls()}
                </div>

                {/* Apply button */}
                {activeScenario !== 'baseline' && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                        <Button
                            variant="primary"
                            size="md"
                            className="w-full"
                            onClick={handleApply}
                            disabled={isRunning}
                        >
                            Apply Scenario
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    );
}
