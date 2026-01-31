'use client';

import { Zap, Clock, Battery } from 'lucide-react';
import { KPIs } from '@/simulation/types';

interface CombinedStatsProps {
    kpis: KPIs;
}

export function CombinedStats({ kpis }: CombinedStatsProps) {
    const inventoryPercent = kpis.totalCapacity > 0 
        ? Math.round((kpis.totalInventory / kpis.totalCapacity) * 100) 
        : 0;

    return (
        <div className="card" style={{ padding: 'var(--space-md)' }}>
            <div className="card-header" style={{ marginBottom: 'var(--space-md)' }}>
                <span className="card-title">Combined</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {/* Active Chargers */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div
                        style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--brand-primary)',
                        }}
                    />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <Zap size={14} color="var(--text-muted)" />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Active Chargers
                            </span>
                        </div>
                    </div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                        {kpis.operationalStations * 8}<span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>/{kpis.totalStations * 8}</span>
                    </span>
                </div>

                {/* Active Wait Time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div
                        style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--brand-secondary)',
                        }}
                    />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <Clock size={14} color="var(--text-muted)" />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Active Wait Time
                            </span>
                        </div>
                    </div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                        {Math.round(kpis.avgWaitTime * kpis.activeDrivers)}<span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}> min</span>
                    </span>
                </div>

                {/* Battery Inventory */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <Battery size={14} color="var(--text-muted)" />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Battery Inventory
                            </span>
                        </div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                            {inventoryPercent}%
                        </span>
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{
                                width: `${inventoryPercent}%`,
                                background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))',
                            }}
                        />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {kpis.totalInventory} / {kpis.totalCapacity} batteries
                    </div>
                </div>
            </div>
        </div>
    );
}
