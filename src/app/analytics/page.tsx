'use client';

import { useRouter } from 'next/navigation';
import {
    ArrowLeft, TrendingUp, TrendingDown, Zap, MapPin,
    Play, AlertTriangle, Clock, BarChart3, Info, Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { useSimulation } from '@/hooks/useSimulation';

export default function AnalyticsPage() {
    const router = useRouter();
    const { state, start } = useSimulation();

    if (!state) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Loading Analytics...</p>
                </div>
            </div>
        );
    }

    // Prepare chart data
    const chartData = state.timeSeriesData.map((point) => ({
        time: `${Math.floor(point.time / 60) % 24}:${(point.time % 60).toString().padStart(2, '0')}`,
        waitTime: point.avgWaitTime,
        throughput: point.throughput,
        lostSwaps: point.lostSwaps,
        utilization: point.utilization * 100,
    }));

    // Station performance data sorted by total swaps
    const stationData = state.stations
        .map((s) => ({
            id: s.id,
            name: s.name,
            location: s.location,
            totalSwaps: s.totalSwaps,
            avgWaitTime: s.avgWaitTime.toFixed(1),
            peakQueue: s.peakQueueLength,
            utilization: (s.utilizationRate * 100).toFixed(0),
            lostSwaps: s.lostSwaps,
            status: s.status,
            chargers: s.chargers,
            inventory: s.currentInventory,
            inventoryCap: s.inventoryCap,
        }))
        .sort((a, b) => b.totalSwaps - a.totalSwaps);

    // KPI comparison
    const kpiComparison = [
        { metric: 'Avg Wait Time', baseline: state.baselineKPIs.avgWaitTime, scenario: state.scenarioKPIs.avgWaitTime, unit: 'min', inverse: true, icon: Clock },
        { metric: 'Lost Swaps', baseline: state.baselineKPIs.lostSwaps, scenario: state.scenarioKPIs.lostSwaps, unit: '', inverse: true, icon: AlertTriangle },
        { metric: 'Charger Utilization', baseline: state.baselineKPIs.chargerUtilization * 100, scenario: state.scenarioKPIs.chargerUtilization * 100, unit: '%', inverse: false, icon: Zap },
        { metric: 'City Throughput', baseline: state.baselineKPIs.cityThroughput, scenario: state.scenarioKPIs.cityThroughput, unit: '/hr', inverse: false, icon: TrendingUp },
        { metric: 'Operational Cost', baseline: state.baselineKPIs.operationalCost / 1000, scenario: state.scenarioKPIs.operationalCost / 1000, unit: 'K/day', inverse: true, icon: BarChart3 },
    ];

    // Generate insights
    const insights = [];
    if (state.scenarioKPIs.avgWaitTime > state.baselineKPIs.avgWaitTime * 1.2) {
        insights.push({
            type: 'warning' as const,
            title: 'Wait Time Increasing',
            description: `Average wait time has increased by ${((state.scenarioKPIs.avgWaitTime / state.baselineKPIs.avgWaitTime - 1) * 100).toFixed(0)}%. Consider adding chargers at high-demand stations.`,
        });
    }
    if (state.scenarioKPIs.lostSwaps > state.baselineKPIs.lostSwaps * 1.5) {
        insights.push({
            type: 'danger' as const,
            title: 'High Lost Swaps',
            description: 'Significant increase in abandoned swaps. Network capacity may be insufficient for the current demand.',
        });
    }
    const overloadedStations = state.stations.filter((s) => s.status === 'overloaded');
    if (overloadedStations.length > 0) {
        insights.push({
            type: 'warning' as const,
            title: 'Stations Overloaded',
            description: `${overloadedStations.map(s => s.name).join(', ')} experiencing high demand. Consider load balancing.`,
        });
    }
    const emergencyStations = state.stations.filter((s) => ['fire', 'power_outage', 'charger_failure', 'no_battery'].includes(s.status));
    if (emergencyStations.length > 0) {
        insights.push({
            type: 'danger' as const,
            title: 'Emergency Active',
            description: `${emergencyStations.map(s => `${s.name} (${s.status.replace('_', ' ')})`).join(', ')}. Drivers being rerouted.`,
        });
    }
    if (insights.length === 0) {
        insights.push({
            type: 'success' as const,
            title: 'Network Performing Well',
            description: 'All KPIs within acceptable ranges. The network is operating efficiently.',
        });
    }

    const hasData = chartData.length > 0;
    const hasScenario = state.activeScenario !== null;

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={16} />
                            Control Center
                        </button>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <Activity className="text-purple-400" size={22} />
                                Detailed Analytics
                            </h1>
                            <p className="text-sm text-slate-400">
                                {hasData ? `${chartData.length} data points collected` : 'Run simulation to collect data'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${state.isRunning
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-slate-700 text-slate-400'
                            }`}>
                            {state.isRunning ? '● LIVE' : '○ PAUSED'}
                        </div>
                        {!state.isRunning && !hasData && (
                            <button
                                onClick={() => { start(); router.push('/'); }}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
                            >
                                <Play size={16} />
                                Start Simulation
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content - Full Width */}
            <main className="p-6">
                {/* Usage Guide Banner - Only show if no data */}
                {!hasData && (
                    <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <div className="flex items-start gap-3">
                            <Info className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                            <div>
                                <h3 className="font-medium text-blue-300 mb-1">How to Use Analytics</h3>
                                <ol className="text-sm text-slate-400 space-y-1">
                                    <li>1. Go to <span className="text-blue-400">Control Center</span> → Select a scenario (e.g., Fire, Heavy Rain)</li>
                                    <li>2. Click <span className="text-emerald-400">Apply Scenario</span> → Then click <span className="text-emerald-400">Run Simulation</span></li>
                                    <li>3. Return here to see <span className="text-purple-400">real-time analytics</span> and baseline comparisons</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                )}

                {/* Top Row: Charts */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                    {/* Time Series Chart */}
                    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-white">Performance Over Time</h2>
                                <p className="text-sm text-slate-500">Real-time metrics during simulation</p>
                            </div>
                            {hasData && (
                                <span className="text-xs text-slate-500">
                                    Day {state.day} • {Math.floor(state.time / 60) % 24}:{(state.time % 60).toString().padStart(2, '0')}
                                </span>
                            )}
                        </div>
                        <div className="h-72">
                            {hasData ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="waitGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="throughputGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                                        <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1e293b',
                                                border: '1px solid #334155',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                        <Area type="monotone" dataKey="waitTime" name="Wait Time (min)" stroke="#3b82f6" fill="url(#waitGradient)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="throughput" name="Throughput" stroke="#10b981" fill="url(#throughputGradient)" strokeWidth={2} />
                                        <Line type="monotone" dataKey="utilization" name="Utilization (%)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                    <BarChart3 size={48} className="mb-3 text-slate-700" />
                                    <p className="text-sm">No data yet</p>
                                    <p className="text-xs text-slate-600 mt-1">Run simulation to see performance charts</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* KPI Comparison */}
                    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-white">Baseline vs Scenario</h2>
                                <p className="text-sm text-slate-500">
                                    {hasScenario ? 'Comparing current scenario to baseline' : 'Apply a scenario to see comparison'}
                                </p>
                            </div>
                            {hasScenario && (
                                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                                    {state.activeScenario?.replace('_', ' ').toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div className="space-y-4">
                            {kpiComparison.map((kpi) => {
                                const Icon = kpi.icon;
                                const diff = kpi.scenario - kpi.baseline;
                                const pctChange = kpi.baseline !== 0 ? (diff / kpi.baseline) * 100 : 0;
                                const isBetter = kpi.inverse ? diff < 0 : diff > 0;
                                const showChange = hasScenario && Math.abs(pctChange) >= 1;

                                return (
                                    <div key={kpi.metric} className="flex items-center justify-between py-3 px-4 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-slate-700/50">
                                                <Icon size={16} className="text-slate-400" />
                                            </div>
                                            <span className="text-slate-300 text-sm font-medium">{kpi.metric}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <span className="text-slate-500 text-sm">
                                                    {kpi.baseline.toFixed(1)}{kpi.unit}
                                                </span>
                                                <span className="text-slate-600 mx-2">→</span>
                                                <span className="text-white font-bold">
                                                    {kpi.scenario.toFixed(1)}{kpi.unit}
                                                </span>
                                            </div>
                                            {showChange && (
                                                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isBetter ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {isBetter ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                    {Math.abs(pctChange).toFixed(0)}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Table + Insights */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Station Performance Table - Takes 2 columns */}
                    <div className="xl:col-span-2 bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <MapPin className="text-blue-400" size={18} />
                                    Station Performance
                                </h2>
                                <p className="text-sm text-slate-500">{state.stations.length} stations • Sorted by total swaps</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Station</th>
                                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Total Swaps</th>
                                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Avg Wait</th>
                                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Chargers</th>
                                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Inventory</th>
                                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Utilization</th>
                                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Lost</th>
                                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stationData.map((station, index) => (
                                        <tr
                                            key={station.id}
                                            className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${index === 0 ? 'bg-blue-500/5' : ''
                                                }`}
                                        >
                                            <td className="py-3 px-4">
                                                <div className="text-white font-medium">{station.name}</div>
                                                <div className="text-xs text-slate-500">{station.location}</div>
                                            </td>
                                            <td className="text-right py-3 px-4">
                                                <span className="text-white font-bold">{station.totalSwaps}</span>
                                            </td>
                                            <td className="text-right py-3 px-4 text-slate-300">{station.avgWaitTime}m</td>
                                            <td className="text-right py-3 px-4 text-slate-300">{station.chargers}</td>
                                            <td className="text-right py-3 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${station.inventory / station.inventoryCap < 0.3 ? 'bg-red-500' :
                                                                    station.inventory / station.inventoryCap < 0.5 ? 'bg-amber-500' : 'bg-emerald-500'
                                                                }`}
                                                            style={{ width: `${(station.inventory / station.inventoryCap) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-slate-400">{station.inventory}/{station.inventoryCap}</span>
                                                </div>
                                            </td>
                                            <td className="text-right py-3 px-4">
                                                <span className={`font-medium ${Number(station.utilization) > 90 ? 'text-red-400' :
                                                        Number(station.utilization) > 70 ? 'text-amber-400' : 'text-emerald-400'
                                                    }`}>
                                                    {station.utilization}%
                                                </span>
                                            </td>
                                            <td className="text-right py-3 px-4">
                                                <span className={station.lostSwaps > 0 ? 'text-red-400 font-medium' : 'text-slate-500'}>
                                                    {station.lostSwaps}
                                                </span>
                                            </td>
                                            <td className="text-center py-3 px-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${station.status === 'operational' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        station.status === 'fire' ? 'bg-red-500/20 text-red-400' :
                                                            station.status === 'overloaded' ? 'bg-orange-500/20 text-orange-400' :
                                                                'bg-amber-500/20 text-amber-400'
                                                    }`}>
                                                    {station.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Insights Panel */}
                    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <AlertTriangle className="text-amber-400" size={18} />
                                Insights & Recommendations
                            </h2>
                            <p className="text-sm text-slate-500">AI-generated observations</p>
                        </div>
                        <div className="space-y-4">
                            {insights.map((insight, index) => (
                                <div
                                    key={index}
                                    className={`p-4 rounded-xl border ${insight.type === 'danger' ? 'bg-red-500/10 border-red-500/20' :
                                            insight.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                                                'bg-emerald-500/10 border-emerald-500/20'
                                        }`}
                                >
                                    <h4 className={`font-medium mb-1 ${insight.type === 'danger' ? 'text-red-400' :
                                            insight.type === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                                        }`}>
                                        {insight.title}
                                    </h4>
                                    <p className="text-sm text-slate-400">{insight.description}</p>
                                </div>
                            ))}
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-6 pt-6 border-t border-slate-800">
                            <h3 className="text-sm font-medium text-slate-400 mb-3">Quick Actions</h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => router.push('/')}
                                    className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-left flex items-center gap-2 transition-colors"
                                >
                                    <Play size={14} className="text-emerald-400" />
                                    Go to Control Center
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
