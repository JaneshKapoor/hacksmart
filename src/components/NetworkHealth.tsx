'use client';

import { KPIs } from '@/simulation/types';

interface NetworkHealthProps {
    kpis: KPIs;
}

export function NetworkHealth({ kpis }: NetworkHealthProps) {
    // Calculate overall health percentage based on operational stations and utilization
    const operationalRatio = kpis.totalStations > 0 
        ? kpis.operationalStations / kpis.totalStations 
        : 0;
    const utilizationHealth = Math.min(1, kpis.chargerUtilization / 85); // 85% is optimal
    const waitTimeHealth = Math.max(0, 1 - kpis.avgWaitTime / 10); // 10 min is bad
    
    const overallHealth = Math.round((operationalRatio * 0.4 + utilizationHealth * 0.3 + waitTimeHealth * 0.3) * 100);
    
    // Calculate the stroke dasharray for the circular progress
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (overallHealth / 100) * circumference;

    // Sub-metrics
    const statusPercent = Math.round(operationalRatio * 100);
    const autoPercent = Math.round(utilizationHealth * 100);
    const chargeCount = Math.round(kpis.totalInventory * 0.1);

    return (
        <div className="card" style={{ padding: 'var(--space-md)' }}>
            <div className="card-header" style={{ marginBottom: 'var(--space-md)' }}>
                <span className="card-title">Network Health</span>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--space-lg)',
                }}
            >
                {/* Circular Progress */}
                <div className="circular-progress" style={{ width: '140px', height: '140px' }}>
                    <svg width="140" height="140" viewBox="0 0 140 140">
                        {/* Background circle */}
                        <circle
                            cx="70"
                            cy="70"
                            r={radius}
                            fill="none"
                            stroke="var(--bg-tertiary)"
                            strokeWidth="10"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="70"
                            cy="70"
                            r={radius}
                            fill="none"
                            stroke="var(--brand-primary)"
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                        />
                    </svg>
                    <div
                        style={{
                            position: 'absolute',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}
                    >
                        <span style={{ fontSize: '2rem', fontWeight: 700 }}>{overallHealth}%</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</span>
                    </div>
                </div>

                {/* Sub-metrics */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-around',
                        width: '100%',
                        borderTop: '1px solid var(--border-subtle)',
                        paddingTop: 'var(--space-md)',
                    }}
                >
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                            <div
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: 'var(--status-operational)',
                                }}
                            />
                            <span style={{ fontSize: '1rem', fontWeight: 600 }}>{statusPercent}%</span>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Status</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                            <div
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: 'var(--brand-secondary)',
                                }}
                            />
                            <span style={{ fontSize: '1rem', fontWeight: 600 }}>{autoPercent}%</span>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Auto</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                            <div
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: 'var(--text-muted)',
                                }}
                            />
                            <span style={{ fontSize: '1rem', fontWeight: 600 }}>{chargeCount}</span>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Charge</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
