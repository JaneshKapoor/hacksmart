'use client';

import { useSimulation } from '@/hooks/useSimulation';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { FailedRide, FailureReason } from '@/simulation/types';
import {
    AlertTriangle,
    Battery,
    MapPin,
    Clock,
    TrendingDown,
    Download,
} from 'lucide-react';

const reasonColors: Record<FailureReason, string> = {
    critical_battery: 'var(--status-emergency)',
    low_battery: 'var(--status-warning)',
    station_too_far: 'var(--brand-primary)',
    no_stations_available: 'var(--status-emergency)',
    no_inventory: 'var(--status-warning)',
    network_congestion: 'var(--status-warning)',
    excessive_queue: 'var(--status-warning)',
    rerouting_failed: 'var(--brand-primary)',
    multiple_reroutes: 'var(--status-emergency)',
    destination_failed: 'var(--status-emergency)',
    stranded: 'var(--status-emergency)',
};

const reasonLabels: Record<FailureReason, string> = {
    critical_battery: 'Critical Battery',
    low_battery: 'Low Battery',
    station_too_far: 'Station Too Far',
    no_stations_available: 'No Stations',
    no_inventory: 'No Inventory',
    network_congestion: 'Network Congestion',
    excessive_queue: 'Excessive Queue',
    rerouting_failed: 'Reroute Failed',
    multiple_reroutes: 'Multiple Reroutes',
    destination_failed: 'Destination Failed',
    stranded: 'Stranded',
};

function FailedRideRow({ ride }: { ride: FailedRide }) {
    return (
        <tr
            style={{
                borderBottom: '1px solid var(--border-subtle)',
            }}
        >
            <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>
                    Day {ride.simulationDay}
                </div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {ride.hourOfDay.toString().padStart(2, '0')}:00
                </div>
            </td>

            <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <div style={{ fontSize: 'var(--font-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {ride.driverName}
                </div>
            </td>

            <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        fontSize: 'var(--font-xs)',
                        fontWeight: 500,
                        color: reasonColors[ride.failureReason],
                        background: `${reasonColors[ride.failureReason]}15`,
                        borderRadius: '4px',
                    }}
                >
                    <AlertTriangle size={12} />
                    {reasonLabels[ride.failureReason]}
                </span>
            </td>

            <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Battery
                        size={16}
                        color={ride.batteryLevel > 25 ? 'var(--status-warning)' : 'var(--status-emergency)'}
                    />
                    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>
                        {ride.batteryLevel.toFixed(0)}%
                    </span>
                </div>
            </td>

            <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>
                    {ride.failureGeoPosition.lat.toFixed(4)}, {ride.failureGeoPosition.lng.toFixed(4)}
                </span>
            </td>

            <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                {ride.targetStationName ? (
                    <div>
                        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>
                            {ride.targetStationName}
                        </div>
                        {ride.targetStationDistance && (
                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {ride.targetStationDistance.toFixed(1)} units
                            </div>
                        )}
                    </div>
                ) : (
                    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>None</span>
                )}
            </td>

            <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>
                    {ride.travelTime}m
                </span>
            </td>

            <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>
                    {ride.operationalStationsCount}
                </span>
            </td>

            <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <span style={{ fontSize: 'var(--font-sm)', color: ride.wasRerouted ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                    {ride.wasRerouted ? 'Yes' : 'No'}
                </span>
            </td>
        </tr>
    );
}

export default function LastMilePage() {
    const { state, toggleSimulation, reset, setSpeed } = useSimulation();
    const failedRides = state?.failedRides || [];

    const reasonCounts = failedRides.reduce((acc, ride) => {
        acc[ride.failureReason] = (acc[ride.failureReason] || 0) + 1;
        return acc;
    }, {} as Record<FailureReason, number>);

    const avgBatteryLevel = failedRides.length > 0
        ? failedRides.reduce((sum, r) => sum + r.batteryLevel, 0) / failedRides.length
        : 0;

    const reroutedCount = failedRides.filter(r => r.wasRerouted).length;

    const mostCommonReason = failedRides.length > 0
        ? (Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as FailureReason)
        : null;

    const exportToJSON = () => {
        const dataStr = JSON.stringify(failedRides, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `failed-rides-${new Date().toISOString()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportToCSV = () => {
        if (failedRides.length === 0) return;

        const headers = [
            'Timestamp', 'Day', 'Hour', 'Driver ID', 'Driver Name', 'Failure Reason',
            'Battery Level', 'Lat', 'Lng', 'Target Station', 'Target Distance',
            'Travel Time', 'Wait Time', 'Weather', 'Temperature', 'Operational Stations',
            'Network Inventory', 'Network Utilization', 'Avg Wait Time', 'Was Rerouted',
            'Nearby Stations Count'
        ];

        const rows = failedRides.map(r => [
            r.failureTimestamp.toISOString(),
            r.simulationDay,
            r.hourOfDay,
            r.driverId,
            r.driverName,
            r.failureReason,
            r.batteryLevel,
            r.failureGeoPosition.lat,
            r.failureGeoPosition.lng,
            r.targetStationName || 'None',
            r.targetStationDistance || 0,
            r.travelTime,
            r.waitTime,
            r.weatherCondition || 'Unknown',
            r.temperature || 0,
            r.operationalStationsCount,
            r.totalNetworkInventory,
            r.networkUtilization,
            r.avgNetworkWaitTime,
            r.wasRerouted ? 'Yes' : 'No',
            r.nearbyStations.length,
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `failed-rides-${new Date().toISOString()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-primary)' }}>
            <Sidebar activeTab="last-mile" onTabChange={() => {}} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Header state={state} onToggleSimulation={toggleSimulation} onReset={reset} onSpeedChange={setSpeed} />

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                                Last Mile Analytics
                            </h1>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                Comprehensive dataset of failed rides for ML training and analysis
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={exportToCSV}
                                disabled={failedRides.length === 0}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 16px',
                                    background: failedRides.length > 0 ? 'var(--brand-primary)' : 'var(--bg-tertiary)',
                                    color: failedRides.length > 0 ? 'white' : 'var(--text-muted)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: failedRides.length > 0 ? 'pointer' : 'not-allowed',
                                }}
                            >
                                <Download size={16} />
                                Export CSV
                            </button>
                            <button
                                onClick={exportToJSON}
                                disabled={failedRides.length === 0}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 16px',
                                    background: failedRides.length > 0 ? 'var(--brand-primary)' : 'var(--bg-tertiary)',
                                    color: failedRides.length > 0 ? 'white' : 'var(--text-muted)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: failedRides.length > 0 ? 'pointer' : 'not-allowed',
                                }}
                            >
                                <Download size={16} />
                                Export JSON
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                        <div style={{ padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                <TrendingDown size={14} />
                                Total Failed Rides
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--status-emergency)' }}>
                                {failedRides.length}
                            </div>
                        </div>

                        <div style={{ padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                <Battery size={14} />
                                Avg Battery at Failure
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--status-warning)' }}>
                                {avgBatteryLevel.toFixed(0)}%
                            </div>
                        </div>

                        <div style={{ padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                <AlertTriangle size={14} />
                                Reroute Failures
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                                {reroutedCount}
                            </div>
                        </div>

                        <div style={{ padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                Most Common Reason
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {mostCommonReason ? reasonLabels[mostCommonReason] : 'N/A'}
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ flex: 1, overflow: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0 }}>
                                        <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                            Time
                                        </th>
                                        <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                            Driver
                                        </th>
                                        <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                            Reason
                                        </th>
                                        <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                            Battery
                                        </th>
                                        <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                            Location
                                        </th>
                                        <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                            Target Station
                                        </th>
                                        <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                            Travel Time
                                        </th>
                                        <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                            Operational Stations
                                        </th>
                                        <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                            Rerouted
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {failedRides.map((ride, idx) => (
                                        <FailedRideRow key={idx} ride={ride} />
                                    ))}
                                </tbody>
                            </table>

                            {failedRides.length === 0 && (
                                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No failed rides recorded yet. Start the simulation to begin collecting data.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
