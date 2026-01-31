'use client';

import { useRouter } from 'next/navigation';
import {
    ArrowLeft, TrendingUp, TrendingDown, Zap, MapPin,
    Play, AlertTriangle, Clock, BarChart3, Info, Activity,
    Download, FileJson, FileSpreadsheet, Users, Battery, DollarSign
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';
import { useSimulation } from '@/hooks/useSimulation';
import { exportStationsCSV, exportTimeSeriesCSV, exportSimulationJSON } from '@/lib/export';

const CHART_TOOLTIP_STYLE = {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontSize: '12px',
};

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

    // Chart data
    const chartData = state.timeSeriesData.map((point) => ({
        time: `${Math.floor(point.time / 60) % 24}:${(point.time % 60).toString().padStart(2, '0')}`,
        waitTime: point.avgWaitTime,
        throughput: point.throughput,
        lostSwaps: point.lostSwaps,
        utilization: point.utilization * 100,
    }));

    // Station comparison data for bar chart
    const stationBarData = state.stations
        .filter(s => s.status !== 'offline')
        .map((s) => ({
            name: s.name.length > 15 ? s.name.slice(0, 15) + '...' : s.name,
            utilization: Math.round(s.utilizationRate * 100),
            waitTime: Number(s.avgWaitTime.toFixed(1)),
            swaps: s.totalSwaps,
        }))
        .sort((a, b) => b.utilization - a.utilization);

    // Station table data
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
        { metric: 'Operational Cost', baseline: state.baselineKPIs.operationalCost / 1000, scenario: state.scenarioKPIs.operationalCost / 1000, unit: 'K/day', inverse: true, icon: DollarSign },
    ];

    // Network health summary
    const operationalCount = state.stations.filter(s => s.status === 'operational' || s.status === 'low_inventory').length;
    const totalChargers = state.stations.reduce((sum, s) => sum + s.chargers, 0);
    const activeChargers = state.stations.reduce((sum, s) => sum + s.activeChargers, 0);
    const totalSwaps = state.stations.reduce((sum, s) => sum + s.totalSwaps, 0);
    const totalInventory = state.stations.reduce((sum, s) => sum + s.currentInventory, 0);
    const totalCapacity = state.stations.reduce((sum, s) => sum + s.inventoryCap, 0);

    // Insights
    const insights: { type: 'danger' | 'warning' | 'success'; title: string; description: string }[] = [];
    if (state.scenarioKPIs.avgWaitTime > state.baselineKPIs.avgWaitTime * 1.2) {
        insights.push({
            type: 'warning',
            title: 'Wait Time Increasing',
            description: `Average wait time increased by ${((state.scenarioKPIs.avgWaitTime / state.baselineKPIs.avgWaitTime - 1) * 100).toFixed(0)}%. Consider adding chargers at high-demand stations.`,
        });
    }
    if (state.scenarioKPIs.lostSwaps > state.baselineKPIs.lostSwaps * 1.5 && state.scenarioKPIs.lostSwaps > 5) {
        insights.push({
            type: 'danger',
            title: 'High Lost Swaps',
            description: 'Significant increase in abandoned swaps. Network capacity may be insufficient for current demand.',
        });
    }
    const overloaded = state.stations.filter((s) => s.status === 'overloaded');
    if (overloaded.length > 0) {
        insights.push({
            type: 'warning',
            title: `${overloaded.length} Station(s) Overloaded`,
            description: `${overloaded.map(s => s.name).join(', ')} experiencing high demand. Consider load balancing or adding capacity.`,
        });
    }
    const emergencyStations = state.stations.filter((s) => s.status === 'fire' || s.status === 'power_outage');
    if (emergencyStations.length > 0) {
        insights.push({
            type: 'danger',
            title: 'Emergency Active',
            description: `${emergencyStations.map(s => `${s.name} (${s.status.replace('_', ' ')})`).join(', ')}. Drivers being rerouted automatically.`,
        });
    }
    const lowInventory = state.stations.filter((s) => s.currentInventory / s.inventoryCap < 0.2 && s.status !== 'offline');
    if (lowInventory.length > 0) {
        insights.push({
            type: 'warning',
            title: 'Low Battery Inventory',
            description: `${lowInventory.length} station(s) below 20% inventory. Rebalancing recommended.`,
        });
    }
    if (state.scenarioKPIs.chargerUtilization > 0.85) {
        insights.push({
            type: 'warning',
            title: 'High Charger Utilization',
            description: `Network charger utilization at ${(state.scenarioKPIs.chargerUtilization * 100).toFixed(0)}%. Approaching capacity limits.`,
        });
    }
    if (insights.length === 0) {
        insights.push({
            type: 'success',
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
                <div className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm"
                        >
                            <ArrowLeft size={14} />
                            Control Center
                        </button>
                        <div>
                            <h1 className="text-lg font-bold flex items-center gap-2">
                                <Activity className="text-purple-400" size={18} />
                                Analytics
                            </h1>
                            <p className="text-[10px] text-slate-500">
                                {hasData ? `${chartData.length} data points · Day ${state.day}` : 'Run simulation to collect data'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Export buttons */}
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => exportStationsCSV(state)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 border border-slate-700/50 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                                title="Export station data as CSV"
                            >
                                <FileSpreadsheet size={13} />
                                Stations CSV
                            </button>
                            {hasData && (
                                <button
                                    onClick={() => exportTimeSeriesCSV(state)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 border border-slate-700/50 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                                    title="Export time series as CSV"
                                >
                                    <Download size={13} />
                                    Time Series
                                </button>
                            )}
                            <button
                                onClick={() => exportSimulationJSON(state)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 border border-slate-700/50 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                                title="Export full simulation snapshot as JSON"
                            >
                                <FileJson size={13} />
                                JSON
                            </button>
                        </div>

                        <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${state.isRunning ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                            {state.isRunning ? 'LIVE' : 'PAUSED'}
                        </div>
                        {!state.isRunning && !hasData && (
                            <button
                                onClick={() => { start(); router.push('/'); }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-medium text-xs hover:opacity-90 transition-opacity"
                            >
                                <Play size={14} />
                                Start Simulation
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="p-5">
                {/* Network Health Summary Strip */}
                <div className="grid grid-cols-6 gap-3 mb-5">
                    {[
                        { label: 'Stations', value: `${operationalCount}/${state.stations.length}`, icon: MapPin, color: 'text-blue-400' },
                        { label: 'Chargers', value: `${activeChargers}/${totalChargers}`, icon: Zap, color: 'text-amber-400' },
                        { label: 'Total Swaps', value: totalSwaps.toLocaleString(), icon: Activity, color: 'text-emerald-400' },
                        { label: 'Active Drivers', value: state.drivers.length.toString(), icon: Users, color: 'text-cyan-400' },
                        { label: 'Battery Stock', value: `${Math.round((totalInventory / totalCapacity) * 100)}%`, icon: Battery, color: 'text-purple-400' },
                        { label: 'Revenue', value: `₹${((state.scenarioKPIs.revenue || 0) / 1000).toFixed(0)}K`, icon: DollarSign, color: 'text-emerald-400' },
                    ].map((item) => {
                        const Icon = item.icon;
                        return (
                            <div key={item.label} className="bg-slate-900/50 rounded-xl border border-slate-800/50 px-4 py-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Icon size={12} className={item.color} />
                                    <span className="text-[10px] text-slate-500">{item.label}</span>
                                </div>
                                <div className="text-lg font-bold tabular-nums">{item.value}</div>
                            </div>
                        );
                    })}
                </div>

                {/* How to use - only if no data */}
                {!hasData && (
                    <div className="mb-5 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <div className="flex items-start gap-3">
                            <Info className="text-blue-400 flex-shrink-0 mt-0.5" size={18} />
                            <div>
                                <h3 className="font-medium text-blue-300 mb-1 text-sm">How to Use Analytics</h3>
                                <ol className="text-xs text-slate-400 space-y-0.5">
                                    <li>1. Go to <span className="text-blue-400">Control Center</span> → Select a scenario</li>
                                    <li>2. Click <span className="text-emerald-400">Apply Scenario</span> → Then <span className="text-emerald-400">Run Simulation</span></li>
                                    <li>3. Return here to see <span className="text-purple-400">real-time analytics</span> and comparisons</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                )}

                {/* Charts Row */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
                    {/* Time Series Chart */}
                    <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-sm font-semibold text-white">Performance Over Time</h2>
                                <p className="text-[10px] text-slate-500">Real-time metrics during simulation</p>
                            </div>
                            {hasData && (
                                <span className="text-[10px] text-slate-500">
                                    Day {state.day} · {Math.floor(state.time / 60) % 24}:{(state.time % 60).toString().padStart(2, '0')}
                                </span>
                            )}
                        </div>
                        <div className="h-64">
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
                                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                                        <Area type="monotone" dataKey="waitTime" name="Wait Time (min)" stroke="#3b82f6" fill="url(#waitGradient)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="throughput" name="Throughput" stroke="#10b981" fill="url(#throughputGradient)" strokeWidth={2} />
                                        <Line type="monotone" dataKey="utilization" name="Utilization (%)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                    <BarChart3 size={40} className="mb-2 text-slate-700" />
                                    <p className="text-xs">No data yet</p>
                                    <p className="text-[10px] text-slate-600 mt-1">Run simulation to see performance charts</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Station Utilization Comparison */}
                    <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-sm font-semibold text-white">Station Utilization Comparison</h2>
                                <p className="text-[10px] text-slate-500">Charger utilization across all stations</p>
                            </div>
                        </div>
                        <div className="h-64">
                            {stationBarData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stationBarData} layout="vertical" margin={{ left: 8, right: 16 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" horizontal={false} />
                                        <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={10} tickLine={false} unit="%" />
                                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} width={100} tickLine={false} />
                                        <Tooltip
                                            contentStyle={CHART_TOOLTIP_STYLE}
                                            formatter={(value) => [`${value}%`, 'Utilization']}
                                        />
                                        <Bar dataKey="utilization" name="Utilization" radius={[0, 4, 4, 0]} barSize={14}>
                                            {stationBarData.map((entry, index) => (
                                                <Cell
                                                    key={index}
                                                    fill={entry.utilization > 90 ? '#ef4444' : entry.utilization > 70 ? '#f59e0b' : '#10b981'}
                                                    fillOpacity={0.8}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                    <BarChart3 size={40} className="mb-2 text-slate-700" />
                                    <p className="text-xs">No station data</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* KPI Comparison + Insights Row */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
                    {/* KPI Comparison */}
                    <div className="xl:col-span-2 bg-slate-900/50 rounded-xl border border-slate-800/50 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-sm font-semibold text-white">Baseline vs Scenario</h2>
                                <p className="text-[10px] text-slate-500">
                                    {hasScenario ? 'Comparing current scenario to baseline' : 'Apply a scenario to see comparison'}
                                </p>
                            </div>
                            {hasScenario && state.activeScenario && (
                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded-full">
                                    {state.activeScenario.type.replace('_', ' ').toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div className="space-y-2.5">
                            {kpiComparison.map((kpi) => {
                                const Icon = kpi.icon;
                                const diff = kpi.scenario - kpi.baseline;
                                const pctChange = kpi.baseline !== 0 ? (diff / kpi.baseline) * 100 : 0;
                                const isBetter = kpi.inverse ? diff < 0 : diff > 0;
                                const showChange = hasScenario && Math.abs(pctChange) >= 1;

                                return (
                                    <div key={kpi.metric} className="flex items-center justify-between py-2.5 px-4 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 rounded-lg bg-slate-700/50">
                                                <Icon size={14} className="text-slate-400" />
                                            </div>
                                            <span className="text-slate-300 text-xs font-medium">{kpi.metric}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <span className="text-slate-500 text-xs">
                                                    {kpi.baseline.toFixed(1)}{kpi.unit}
                                                </span>
                                                <span className="text-slate-600 mx-2">→</span>
                                                <span className="text-white font-bold text-sm">
                                                    {kpi.scenario.toFixed(1)}{kpi.unit}
                                                </span>
                                            </div>
                                            {showChange && (
                                                <span className={`flex items-center gap-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${isBetter ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {isBetter ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                    {Math.abs(pctChange).toFixed(0)}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Insights */}
                    <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-5">
                        <div className="mb-4">
                            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Info className="text-amber-400" size={14} />
                                Insights
                            </h2>
                            <p className="text-[10px] text-slate-500">Auto-generated observations</p>
                        </div>
                        <div className="space-y-3">
                            {insights.map((insight, index) => (
                                <div
                                    key={index}
                                    className={`p-3 rounded-lg border ${
                                        insight.type === 'danger' ? 'bg-red-500/10 border-red-500/20' :
                                        insight.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                                        'bg-emerald-500/10 border-emerald-500/20'
                                    }`}
                                >
                                    <h4 className={`font-medium text-xs mb-0.5 ${
                                        insight.type === 'danger' ? 'text-red-400' :
                                        insight.type === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                                    }`}>
                                        {insight.title}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">{insight.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Station Performance Table */}
                <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                                <MapPin className="text-blue-400" size={14} />
                                Station Performance
                            </h2>
                            <p className="text-[10px] text-slate-500">{state.stations.length} stations · Sorted by total swaps</p>
                        </div>
                        <button
                            onClick={() => exportStationsCSV(state)}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700/50 rounded-lg text-[10px] text-slate-400 hover:text-white transition-colors"
                        >
                            <Download size={11} />
                            Export
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium">Station</th>
                                    <th className="text-right py-2.5 px-3 text-slate-400 font-medium">Swaps</th>
                                    <th className="text-right py-2.5 px-3 text-slate-400 font-medium">Wait</th>
                                    <th className="text-right py-2.5 px-3 text-slate-400 font-medium">Chargers</th>
                                    <th className="text-right py-2.5 px-3 text-slate-400 font-medium">Inventory</th>
                                    <th className="text-right py-2.5 px-3 text-slate-400 font-medium">Utilization</th>
                                    <th className="text-right py-2.5 px-3 text-slate-400 font-medium">Lost</th>
                                    <th className="text-center py-2.5 px-3 text-slate-400 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stationData.map((station, index) => (
                                    <tr
                                        key={station.id}
                                        className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${index === 0 ? 'bg-blue-500/5' : ''}`}
                                    >
                                        <td className="py-2.5 px-3">
                                            <div className="text-white font-medium">{station.name}</div>
                                            <div className="text-[10px] text-slate-500">{station.location}</div>
                                        </td>
                                        <td className="text-right py-2.5 px-3">
                                            <span className="text-white font-bold">{station.totalSwaps}</span>
                                        </td>
                                        <td className="text-right py-2.5 px-3 text-slate-300">{station.avgWaitTime}m</td>
                                        <td className="text-right py-2.5 px-3 text-slate-300">{station.chargers}</td>
                                        <td className="text-right py-2.5 px-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-14 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            station.inventory / station.inventoryCap < 0.3 ? 'bg-red-500' :
                                                            station.inventory / station.inventoryCap < 0.5 ? 'bg-amber-500' : 'bg-emerald-500'
                                                        }`}
                                                        style={{ width: `${(station.inventory / station.inventoryCap) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-slate-400">{station.inventory}/{station.inventoryCap}</span>
                                            </div>
                                        </td>
                                        <td className="text-right py-2.5 px-3">
                                            <span className={`font-medium ${
                                                Number(station.utilization) > 90 ? 'text-red-400' :
                                                Number(station.utilization) > 70 ? 'text-amber-400' : 'text-emerald-400'
                                            }`}>
                                                {station.utilization}%
                                            </span>
                                        </td>
                                        <td className="text-right py-2.5 px-3">
                                            <span className={station.lostSwaps > 0 ? 'text-red-400 font-medium' : 'text-slate-500'}>
                                                {station.lostSwaps}
                                            </span>
                                        </td>
                                        <td className="text-center py-2.5 px-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                                station.status === 'operational' ? 'bg-emerald-500/20 text-emerald-400' :
                                                station.status === 'fire' ? 'bg-red-500/20 text-red-400' :
                                                station.status === 'overloaded' ? 'bg-orange-500/20 text-orange-400' :
                                                station.status === 'maintenance' ? 'bg-blue-500/20 text-blue-400' :
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
            </main>
        </div>
    );
}
