'use client';

import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Clock, XCircle, Zap, TrendingUp, DollarSign, Battery, TrendingDown, Minus } from 'lucide-react';
import { KPIMetrics, TimeSeriesPoint } from '@/simulation/types';
import { AnimatedCounter } from '@/components/ui/Slider';
import { Tooltip } from '@/components/ui/Tooltip';

interface KPICardProps {
    label: string;
    value: number;
    baseline: number;
    format: 'time' | 'percent' | 'currency' | 'count';
    icon: 'clock' | 'lost' | 'charger' | 'throughput' | 'cost' | 'battery';
    trend?: number[];
    inverse?: boolean; // if true, lower is better
    isScenarioActive?: boolean;
}

function KPICard({
    label,
    value,
    baseline,
    format,
    icon,
    trend,
    inverse = false,
    isScenarioActive = false,
}: KPICardProps) {
    const formatValue = (val: number) => {
        switch (format) {
            case 'time':
                return `${val.toFixed(1)}m`;
            case 'percent':
                return `${(val * 100).toFixed(1)}%`;
            case 'currency':
                return `₹${(val / 1000).toFixed(0)}K`;
            case 'count':
                return val.toLocaleString();
            default:
                return val.toString();
        }
    };

    const diff = value - baseline;
    const percentChange = baseline !== 0 ? (diff / baseline) * 100 : 0;
    const isBetter = inverse ? diff < 0 : diff > 0;
    const showDelta = isScenarioActive && Math.abs(percentChange) >= 0.5;

    const icons = {
        clock: Clock,
        lost: XCircle,
        charger: Zap,
        throughput: TrendingUp,
        cost: DollarSign,
        battery: Battery,
    };

    const Icon = icons[icon];

    const gradients = {
        clock: 'from-blue-500 to-cyan-400',
        lost: 'from-red-500 to-rose-400',
        charger: 'from-amber-500 to-yellow-400',
        throughput: 'from-emerald-500 to-teal-400',
        cost: 'from-purple-500 to-pink-400',
        battery: 'from-indigo-500 to-violet-400',
    };

    // Generate mini sparkline data
    const sparklineData = useMemo(() => {
        if (trend && trend.length > 0) {
            return trend.map((v, i) => ({ value: v, index: i }));
        }
        // Generate fake trend if no data
        return Array.from({ length: 12 }, (_, i) => ({
            value: baseline + Math.sin(i / 2) * (baseline * 0.1) + Math.random() * (baseline * 0.05),
            index: i,
        }));
    }, [trend, baseline]);

    return (
        <div
            className="
        relative overflow-hidden
        bg-slate-900/80 backdrop-blur-sm
        border border-slate-800/50 hover:border-slate-700
        rounded-xl p-4
        transition-all duration-300
        group
      "
        >
            {/* Gradient accent line */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradients[icon]}`} />

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${gradients[icon]} bg-opacity-20`}>
                        <Icon size={14} className="text-white" />
                    </div>
                    <span className="text-xs font-medium text-slate-400">{label}</span>
                </div>
                {showDelta && (
                    <div
                        className={`
              flex items-center gap-0.5 text-xs font-medium
              ${isBetter ? 'text-emerald-400' : 'text-red-400'}
            `}
                    >
                        {Math.abs(percentChange) < 0.5 ? (
                            <Minus size={12} />
                        ) : isBetter ? (
                            <TrendingUp size={12} />
                        ) : (
                            <TrendingDown size={12} />
                        )}
                        {Math.abs(percentChange).toFixed(1)}%
                    </div>
                )}
            </div>

            {/* Value */}
            <div className="mb-2">
                <div className="text-2xl font-bold text-white tracking-tight">
                    <AnimatedCounter
                        value={value}
                        decimals={format === 'time' || format === 'percent' ? 1 : 0}
                        suffix={format === 'time' ? 'm' : format === 'percent' ? '%' : ''}
                        prefix={format === 'currency' ? '₹' : ''}
                    />
                    {format === 'currency' && <span className="text-lg">K</span>}
                </div>
                {isScenarioActive && (
                    <div className="text-[10px] text-slate-500 mt-0.5">
                        Base: {formatValue(baseline)}
                    </div>
                )}
            </div>

            {/* Sparkline */}
            <div className="h-8 -mx-1 opacity-60 group-hover:opacity-100 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData}>
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={isBetter || !isScenarioActive ? '#10b981' : '#ef4444'}
                            strokeWidth={1.5}
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

interface KPIDashboardProps {
    baseline: KPIMetrics;
    scenario: KPIMetrics;
    isScenarioActive: boolean;
    timeSeriesData?: TimeSeriesPoint[];
    onViewDetails?: () => void;
}

export function KPIDashboard({
    baseline,
    scenario,
    isScenarioActive,
    timeSeriesData,
    onViewDetails,
}: KPIDashboardProps) {
    const kpis: Array<{
        label: string;
        baselineKey: keyof KPIMetrics;
        format: 'time' | 'percent' | 'currency' | 'count';
        icon: 'clock' | 'lost' | 'charger' | 'throughput' | 'cost' | 'battery';
        inverse: boolean;
    }> = [
            { label: 'Avg Wait Time', baselineKey: 'avgWaitTime', format: 'time', icon: 'clock', inverse: true },
            { label: 'Lost Swaps', baselineKey: 'lostSwaps', format: 'count', icon: 'lost', inverse: true },
            { label: 'Charger Util.', baselineKey: 'chargerUtilization', format: 'percent', icon: 'charger', inverse: false },
            { label: 'Throughput/hr', baselineKey: 'cityThroughput', format: 'count', icon: 'throughput', inverse: false },
            { label: 'Op. Cost/day', baselineKey: 'operationalCost', format: 'currency', icon: 'cost', inverse: true },
            { label: 'Idle Inventory', baselineKey: 'idleInventory', format: 'count', icon: 'battery', inverse: true },
        ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-white">KPI Dashboard</h2>
                    <p className="text-[10px] text-slate-500">
                        {isScenarioActive ? 'Comparing baseline vs scenario' : 'Baseline network performance'}
                    </p>
                </div>
                {onViewDetails && (
                    <button
                        onClick={onViewDetails}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                        View Details →
                    </button>
                )}
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-3">
                {kpis.map((kpi) => (
                    <KPICard
                        key={kpi.baselineKey}
                        label={kpi.label}
                        value={isScenarioActive ? (scenario[kpi.baselineKey] as number) : (baseline[kpi.baselineKey] as number)}
                        baseline={baseline[kpi.baselineKey] as number}
                        format={kpi.format}
                        icon={kpi.icon}
                        inverse={kpi.inverse}
                        isScenarioActive={isScenarioActive}
                        trend={timeSeriesData?.map((t) => {
                            if (kpi.baselineKey === 'avgWaitTime') return t.avgWaitTime;
                            if (kpi.baselineKey === 'cityThroughput') return t.throughput;
                            if (kpi.baselineKey === 'lostSwaps') return t.lostSwaps;
                            if (kpi.baselineKey === 'chargerUtilization') return t.utilization;
                            if (kpi.baselineKey === 'operationalCost') return t.cost;
                            return 0;
                        })}
                    />
                ))}
            </div>

            {/* Emergency stats */}
            {isScenarioActive && (scenario.emergencyEvents > 0 || scenario.reroutedDrivers > 0) && (
                <div className="grid grid-cols-2 gap-3">
                    {scenario.reroutedDrivers > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center justify-between">
                            <span className="text-xs text-amber-400">Rerouted Drivers</span>
                            <span className="text-lg font-bold text-amber-400">{scenario.reroutedDrivers}</span>
                        </div>
                    )}
                    {scenario.emergencyEvents > 0 && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center justify-between">
                            <span className="text-xs text-red-400">Emergency Events</span>
                            <span className="text-lg font-bold text-red-400">{scenario.emergencyEvents}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
