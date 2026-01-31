'use client';

import { Clock, TrendingDown, Gauge, Activity, ChevronUp } from 'lucide-react';
import { KPIs } from '@/simulation/types';

interface LiveMetricsProps {
    kpis: KPIs;
    isCollapsed?: boolean;
    onToggle?: () => void;
}

interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    unit?: string;
    trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({ icon, label, value, unit, trend }: MetricCardProps) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-md)',
                padding: 'var(--space-md)',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                flex: 1,
                minWidth: '140px',
            }}
        >
            <div
                style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-hover)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    flexShrink: 0,
                }}
            >
                {icon}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span
                    style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}
                >
                    {label}
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                    <span className="metric-value" style={{ fontSize: '1.5rem' }}>
                        {value}
                    </span>
                    {unit && <span className="metric-unit">{unit}</span>}
                </div>
            </div>
        </div>
    );
}

export function LiveMetrics({ kpis, isCollapsed, onToggle }: LiveMetricsProps) {
    return (
        <div className="card" style={{ padding: 'var(--space-md)' }}>
            <div className="card-header" style={{ marginBottom: 'var(--space-md)' }}>
                <span className="card-title">
                    Live Metrics
                </span>
                <button
                    onClick={onToggle}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <ChevronUp
                        size={16}
                        style={{
                            transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0)',
                            transition: 'transform var(--transition-fast)',
                        }}
                    />
                </button>
            </div>

            {!isCollapsed && (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 'var(--space-sm)',
                    }}
                >
                    <MetricCard
                        icon={<Clock size={16} />}
                        label="Avg Wait Time"
                        value={kpis.avgWaitTime.toFixed(1)}
                        unit="min"
                    />
                    <MetricCard
                        icon={<TrendingDown size={16} />}
                        label="Lost Swaps"
                        value={kpis.lostSwaps}
                    />
                    <MetricCard
                        icon={<Gauge size={16} />}
                        label="Charger Utilization"
                        value={kpis.chargerUtilization.toFixed(1)}
                        unit="%"
                    />
                    <MetricCard
                        icon={<Activity size={16} />}
                        label="City Throughput"
                        value={Math.round(kpis.cityThroughput)}
                        unit="/hr"
                    />
                </div>
            )}
        </div>
    );
}
