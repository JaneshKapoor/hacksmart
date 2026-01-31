import { SimulationState } from '@/simulation/types';

export function exportStationsCSV(state: SimulationState): void {
    const headers = [
        'Station', 'Location', 'Status', 'Chargers', 'Active Chargers',
        'Inventory', 'Capacity', 'Queue Length', 'Avg Wait (min)',
        'Utilization (%)', 'Total Swaps', 'Lost Swaps', 'Peak Queue',
    ];

    const rows = state.stations.map((s) => [
        s.name,
        s.location,
        s.status,
        s.chargers,
        s.activeChargers,
        s.currentInventory,
        s.inventoryCap,
        s.queueLength,
        s.avgWaitTime.toFixed(2),
        (s.utilizationRate * 100).toFixed(1),
        s.totalSwaps,
        s.lostSwaps,
        s.peakQueueLength,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadFile(csv, 'station-data.csv', 'text/csv');
}

export function exportTimeSeriesCSV(state: SimulationState): void {
    const headers = ['Time', 'Avg Wait (min)', 'Throughput', 'Lost Swaps', 'Utilization (%)', 'Cost'];

    const rows = state.timeSeriesData.map((p) => [
        `${Math.floor(p.time / 60) % 24}:${(p.time % 60).toString().padStart(2, '0')}`,
        p.avgWaitTime.toFixed(2),
        p.throughput,
        p.lostSwaps,
        (p.utilization * 100).toFixed(1),
        p.cost,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadFile(csv, 'timeseries-data.csv', 'text/csv');
}

export function exportSimulationJSON(state: SimulationState): void {
    const snapshot = {
        exportedAt: new Date().toISOString(),
        simulationTime: state.time,
        day: state.day,
        hour: state.hour,
        scenario: state.activeScenario,
        baselineKPIs: state.baselineKPIs,
        scenarioKPIs: state.scenarioKPIs,
        stations: state.stations.map((s) => ({
            id: s.id,
            name: s.name,
            location: s.location,
            status: s.status,
            chargers: s.chargers,
            activeChargers: s.activeChargers,
            currentInventory: s.currentInventory,
            inventoryCap: s.inventoryCap,
            queueLength: s.queueLength,
            avgWaitTime: s.avgWaitTime,
            utilizationRate: s.utilizationRate,
            totalSwaps: s.totalSwaps,
            lostSwaps: s.lostSwaps,
            geoPosition: s.geoPosition,
        })),
        timeSeriesData: state.timeSeriesData,
    };

    const json = JSON.stringify(snapshot, null, 2);
    downloadFile(json, 'simulation-snapshot.json', 'application/json');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
