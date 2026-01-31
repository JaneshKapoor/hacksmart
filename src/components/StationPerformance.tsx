'use client';

import { Station } from '@/simulation/types';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    Area,
    AreaChart,
} from 'recharts';
import { ChevronUp } from 'lucide-react';

interface StationPerformanceProps {
    stations: Station[];
    history: { time: Date; kpis: { avgWaitTime: number; cityThroughput: number } }[];
    isCollapsed?: boolean;
    onToggle?: () => void;
}

export function StationPerformance({ stations, history, isCollapsed, onToggle }: StationPerformanceProps) {
    // Prepare data for utilization chart
    const utilizationData = stations
        .sort((a, b) => b.utilizationRate - a.utilizationRate)
        .slice(0, 12)
        .map((s) => ({
            name: s.name.length > 20 ? s.name.slice(0, 20) + '...' : s.name,
            utilization: Math.round(s.utilizationRate * 100),
            fullName: s.name,
        }));

    // Prepare data for performance over time
    const performanceData = history.map((h, i) => ({
        time: h.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        throughput: Math.round(h.kpis.cityThroughput),
        waitTime: h.kpis.avgWaitTime,
    }));

    // Custom tooltip styles
    const tooltipStyle = {
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 12px',
        fontSize: '0.75rem',
    };

    return (
        <div
            className="card"
            style={{
                padding: 'var(--space-md)',
                height: isCollapsed ? 'auto' : '320px',
            }}
        >
            <div className="card-header" style={{ marginBottom: 'var(--space-md)' }}>
                <span className="card-title">Station Performance & Analytics</span>
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
                        gridTemplateColumns: '1fr 1fr 1.5fr',
                        gap: 'var(--space-lg)',
                        height: 'calc(100% - 40px)',
                    }}
                >
                    {/* Utilization Comparison Chart */}
                    <div>
                        <h4
                            style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                marginBottom: 'var(--space-sm)',
                            }}
                        >
                            Station Utilization Comparison
                        </h4>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={utilizationData} layout="vertical" margin={{ left: 0, right: 10 }}>
                                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                                    width={100}
                                />
                                <Tooltip
                                    contentStyle={tooltipStyle}
                                    labelStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Bar
                                    dataKey="utilization"
                                    fill="var(--brand-secondary)"
                                    radius={[0, 4, 4, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Performance Over Time */}
                    <div>
                        <h4
                            style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                marginBottom: 'var(--space-sm)',
                            }}
                        >
                            Performance Over Time
                        </h4>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={performanceData} margin={{ left: -20, right: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                                <Tooltip
                                    contentStyle={tooltipStyle}
                                    labelStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="throughput"
                                    stroke="var(--brand-primary)"
                                    fill="var(--brand-primary)"
                                    fillOpacity={0.2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Station Performance Table */}
                    <div style={{ overflow: 'auto' }}>
                        <h4
                            style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                marginBottom: 'var(--space-sm)',
                            }}
                        >
                            Station Performance
                        </h4>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Station</th>
                                    <th>Swaps</th>
                                    <th>Inventory</th>
                                    <th>Utilization</th>
                                    <th>Lost</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stations.slice(0, 10).map((station) => (
                                    <tr key={station.id}>
                                        <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {station.name}
                                        </td>
                                        <td>{station.totalSwaps}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <div
                                                    style={{
                                                        width: '40px',
                                                        height: '4px',
                                                        background: 'var(--bg-tertiary)',
                                                        borderRadius: '2px',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            width: `${(station.currentInventory / station.inventoryCap) * 100}%`,
                                                            height: '100%',
                                                            background: 'var(--brand-primary)',
                                                        }}
                                                    />
                                                </div>
                                                <span style={{ fontSize: '0.7rem' }}>
                                                    {station.currentInventory}/{station.inventoryCap}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--brand-primary)' }}>
                                            {Math.round(station.utilizationRate * 100)}%
                                        </td>
                                        <td>{station.lostSwaps}</td>
                                        <td>
                                            <span className={`badge badge-${station.status}`}>
                                                {station.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
