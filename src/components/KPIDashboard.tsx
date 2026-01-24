'use client';

import { KPIMetrics } from '@/simulation/station';

interface KPIDashboardProps {
    baseline: KPIMetrics;
    scenario: KPIMetrics;
    isScenarioActive: boolean;
}

export function KPIDashboard({ baseline, scenario, isScenarioActive }: KPIDashboardProps) {
    const formatValue = (value: number, type: string) => {
        switch (type) {
            case 'time':
                return `${value.toFixed(1)} min`;
            case 'percent':
                return `${(value * 100).toFixed(1)}%`;
            case 'currency':
                return `$${value.toLocaleString()}`;
            case 'count':
                return value.toLocaleString();
            default:
                return value.toString();
        }
    };

    const getChangeIndicator = (baselineValue: number, scenarioValue: number, inverse: boolean = false) => {
        const diff = scenarioValue - baselineValue;
        const percentChange = baselineValue !== 0 ? (diff / baselineValue) * 100 : 0;

        // For some metrics, lower is better (inverse)
        const isBetter = inverse ? diff < 0 : diff > 0;

        if (Math.abs(percentChange) < 1) return null;

        return (
            <span className={`text-sm font-medium ${isBetter ? 'text-emerald-400' : 'text-red-400'}`}>
                {isBetter ? '↑' : '↓'} {Math.abs(percentChange).toFixed(1)}%
            </span>
        );
    };

    const kpis = [
        {
            id: 'avgWaitTime',
            label: 'Avg Wait Time',
            baseline: baseline.avgWaitTime,
            scenario: scenario.avgWaitTime,
            type: 'time',
            inverse: true, // lower is better
            icon: '⏱️',
            gradient: 'from-blue-500 to-cyan-500',
        },
        {
            id: 'lostSwaps',
            label: 'Lost Swaps',
            baseline: baseline.lostSwaps,
            scenario: scenario.lostSwaps,
            type: 'count',
            inverse: true,
            icon: '❌',
            gradient: 'from-red-500 to-orange-500',
        },
        {
            id: 'chargerUtilization',
            label: 'Charger Utilization',
            baseline: baseline.chargerUtilization,
            scenario: scenario.chargerUtilization,
            type: 'percent',
            inverse: false,
            icon: '⚡',
            gradient: 'from-amber-500 to-yellow-500',
        },
        {
            id: 'cityThroughput',
            label: 'City Throughput',
            baseline: baseline.cityThroughput,
            scenario: scenario.cityThroughput,
            type: 'count',
            inverse: false,
            icon: '🔄',
            gradient: 'from-emerald-500 to-teal-500',
        },
        {
            id: 'operationalCost',
            label: 'Operational Cost',
            baseline: baseline.operationalCost,
            scenario: scenario.operationalCost,
            type: 'currency',
            inverse: true,
            icon: '💰',
            gradient: 'from-purple-500 to-pink-500',
        },
        {
            id: 'idleInventory',
            label: 'Idle Inventory',
            baseline: baseline.idleInventory,
            scenario: scenario.idleInventory,
            type: 'count',
            inverse: true,
            icon: '📦',
            gradient: 'from-indigo-500 to-violet-500',
        },
    ];

    // Emergency KPIs (only shown when scenario is active)
    const emergencyKPIs = isScenarioActive ? [
        {
            id: 'reroutedDrivers',
            label: 'Rerouted Drivers',
            value: scenario.reroutedDrivers,
            type: 'count',
            icon: '🔀',
            gradient: 'from-orange-500 to-red-500',
        },
        {
            id: 'emergencyEvents',
            label: 'Emergency Events',
            value: scenario.emergencyEvents,
            type: 'count',
            icon: '🚨',
            gradient: 'from-red-600 to-rose-600',
        },
    ] : [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">KPI Dashboard</h2>
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-500" />
                        <span className="text-slate-400">Baseline</span>
                    </div>
                    {isScenarioActive && (
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-indigo-500" />
                            <span className="text-slate-400">Scenario</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Main KPIs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {kpis.map((kpi, index) => (
                    <div
                        key={kpi.id}
                        className="kpi-card fade-in"
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        {/* Gradient accent */}
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${kpi.gradient}`} />

                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">{kpi.icon}</span>
                            <span className="text-xs text-slate-400 font-medium">{kpi.label}</span>
                        </div>

                        {/* Values */}
                        <div className="space-y-2">
                            {/* Baseline */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">Base</span>
                                <span className="text-sm font-medium text-slate-400">
                                    {formatValue(kpi.baseline, kpi.type)}
                                </span>
                            </div>

                            {/* Scenario */}
                            {isScenarioActive && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-indigo-400">Scenario</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-white counter">
                                            {formatValue(kpi.scenario, kpi.type)}
                                        </span>
                                        {getChangeIndicator(kpi.baseline, kpi.scenario, kpi.inverse)}
                                    </div>
                                </div>
                            )}

                            {!isScenarioActive && (
                                <div className="text-xl font-bold text-white">
                                    {formatValue(kpi.baseline, kpi.type)}
                                </div>
                            )}
                        </div>

                        {/* Progress bar for utilization */}
                        {kpi.type === 'percent' && (
                            <div className="mt-3">
                                <div className="progress-bar">
                                    <div
                                        className={`progress-bar-fill bg-gradient-to-r ${kpi.gradient}`}
                                        style={{
                                            width: `${(isScenarioActive ? kpi.scenario : kpi.baseline) * 100}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Emergency KPIs */}
            {emergencyKPIs.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                    {emergencyKPIs.map((kpi, index) => (
                        <div
                            key={kpi.id}
                            className="kpi-card fade-in border-red-500/30"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${kpi.gradient}`} />

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{kpi.icon}</span>
                                    <span className="text-sm text-slate-400 font-medium">{kpi.label}</span>
                                </div>
                                <span className="text-2xl font-bold text-white counter">
                                    {formatValue(kpi.value, kpi.type)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Comparison Summary */}
            {isScenarioActive && (
                <div className="glass-card p-4 mt-4">
                    <h3 className="text-sm font-semibold text-white mb-3">Impact Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <ImpactItem
                            label="Wait Time Change"
                            value={(scenario.avgWaitTime - baseline.avgWaitTime).toFixed(1)}
                            unit="min"
                            isGood={scenario.avgWaitTime < baseline.avgWaitTime}
                        />
                        <ImpactItem
                            label="Throughput Change"
                            value={((scenario.cityThroughput - baseline.cityThroughput) / baseline.cityThroughput * 100).toFixed(1)}
                            unit="%"
                            isGood={scenario.cityThroughput > baseline.cityThroughput}
                        />
                        <ImpactItem
                            label="Cost Impact"
                            value={(scenario.operationalCost - baseline.operationalCost).toLocaleString()}
                            unit="$/day"
                            isGood={scenario.operationalCost < baseline.operationalCost}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function ImpactItem({ label, value, unit, isGood }: { label: string; value: string; unit: string; isGood: boolean }) {
    const numValue = parseFloat(value);
    const displayValue = numValue > 0 ? `+${value}` : value;

    return (
        <div className="flex flex-col">
            <span className="text-xs text-slate-400">{label}</span>
            <span className={`text-lg font-bold ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>
                {displayValue} {unit}
            </span>
        </div>
    );
}
