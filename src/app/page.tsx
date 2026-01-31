'use client';

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSimulation } from '@/hooks/useSimulation';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { LiveMetrics } from '@/components/LiveMetrics';
import { Scenarios } from '@/components/Scenarios';
import { NetworkHealth } from '@/components/NetworkHealth';
import { CombinedStats } from '@/components/CombinedStats';
import { StationPerformance } from '@/components/StationPerformance';
import { INITIAL_KPIS } from '@/simulation/types';
import { Loader2 } from 'lucide-react';

// Dynamic import for MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import('@/components/MapView').then(mod => ({ default: mod.MapView })), {
    ssr: false,
    loading: () => (
        <div style={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'var(--bg-primary)',
        }}>
            <Loader2 size={32} className="animate-pulse" color="var(--brand-primary)" />
        </div>
    ),
});

export default function Dashboard() {
    const { state, isLoading, error, toggleSimulation, reset, setSpeed, setScenario } = useSimulation();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [metricsCollapsed, setMetricsCollapsed] = useState(false);
    const [performanceCollapsed, setPerformanceCollapsed] = useState(false);

    // Use initial values while loading
    const kpis = state?.kpis || INITIAL_KPIS;
    const stations = state?.stations || [];
    const drivers = state?.drivers || [];
    const history = state?.history || [];
    const activeScenario = state?.activeScenario || { type: 'baseline' as const, active: true, params: {} };

    return (
        <div
            style={{
                display: 'flex',
                height: '100vh',
                width: '100vw',
                overflow: 'hidden',
                background: 'var(--bg-primary)',
            }}
        >
            {/* Sidebar */}
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header */}
                <Header
                    state={state}
                    onToggleSimulation={toggleSimulation}
                    onReset={reset}
                    onSpeedChange={setSpeed}
                />

                {/* Content Area */}
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        overflow: 'hidden',
                        padding: 'var(--space-md)',
                        gap: 'var(--space-md)',
                    }}
                >
                    {/* Left Panel - Metrics & Controls */}
                    <div
                        style={{
                            width: '320px',
                            flexShrink: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--space-md)',
                            overflow: 'auto',
                        }}
                    >
                        {/* Live Metrics */}
                        <LiveMetrics
                            kpis={kpis}
                            isCollapsed={metricsCollapsed}
                            onToggle={() => setMetricsCollapsed(!metricsCollapsed)}
                        />

                        {/* Scenarios */}
                        <Scenarios
                            activeScenario={activeScenario}
                            onScenarioChange={setScenario}
                        />

                        {/* Network Health */}
                        <NetworkHealth kpis={kpis} />

                        {/* Combined Stats */}
                        <CombinedStats kpis={kpis} />
                    </div>

                    {/* Right Panel - Map & Analytics */}
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--space-md)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Map */}
                        <div
                            style={{
                                flex: 1,
                                borderRadius: 'var(--radius-lg)',
                                overflow: 'hidden',
                                border: '1px solid var(--border-subtle)',
                                minHeight: '300px',
                            }}
                        >
                            {isLoading ? (
                                <div
                                    style={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 'var(--space-md)',
                                        background: 'var(--bg-secondary)',
                                    }}
                                >
                                    <Loader2 size={40} className="animate-pulse" color="var(--brand-primary)" />
                                    <span style={{ color: 'var(--text-muted)' }}>Loading stations...</span>
                                </div>
                            ) : error ? (
                                <div
                                    style={{
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--status-emergency)',
                                    }}
                                >
                                    {error}
                                </div>
                            ) : (
                                <MapView
                                    stations={stations}
                                    drivers={drivers}
                                />
                            )}
                        </div>

                        {/* Station Performance */}
                        <StationPerformance
                            stations={stations}
                            history={history}
                            isCollapsed={performanceCollapsed}
                            onToggle={() => setPerformanceCollapsed(!performanceCollapsed)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
