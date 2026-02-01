import { Station, GeoPosition, ConnectionDetail } from '@/simulation/types';
import { geoToPercent } from '@/lib/geoUtils';

interface OCMStation {
    ID: number;
    AddressInfo: {
        Title: string;
        AddressLine1?: string;
        Town?: string;
        StateOrProvince?: string;
        Latitude: number;
        Longitude: number;
    };
    NumberOfPoints?: number;
    Connections?: {
        ConnectionTypeID?: number;
        ConnectionType?: { Title: string };
        PowerKW?: number;
        Quantity?: number;
    }[];
    OperatorInfo?: {
        Title: string;
    };
    StatusType?: {
        IsOperational: boolean;
        Title: string;
    };
    UsageCost?: string;
}

function getChargerType(connections?: OCMStation['Connections']): 'standard' | 'fast' | 'mixed' {
    if (!connections || connections.length === 0) return 'standard';
    const hasFast = connections.some((c) => (c.PowerKW ?? 0) > 22);
    const hasStandard = connections.some((c) => (c.PowerKW ?? 0) <= 22);
    if (hasFast && hasStandard) return 'mixed';
    if (hasFast) return 'fast';
    return 'standard';
}

function getChargerCount(ocm: OCMStation): number {
    if (ocm.NumberOfPoints && ocm.NumberOfPoints > 0) return ocm.NumberOfPoints;
    if (ocm.Connections) {
        const total = ocm.Connections.reduce((sum, c) => sum + (c.Quantity || 1), 0);
        if (total > 0) return total;
    }
    return Math.floor(Math.random() * 6) + 4; // 4-10 default
}

function extractConnectionDetails(connections?: OCMStation['Connections']): {
    details: ConnectionDetail[];
    maxPowerKW: number;
    minPowerKW: number;
} {
    if (!connections || connections.length === 0) {
        return {
            details: [],
            maxPowerKW: 22, // Default standard charger
            minPowerKW: 22,
        };
    }

    const details: ConnectionDetail[] = connections
        .filter((c) => c.PowerKW && c.PowerKW > 0)
        .map((c) => ({
            type: c.ConnectionType?.Title || 'Unknown',
            powerKW: c.PowerKW || 22,
            quantity: c.Quantity || 1,
        }));

    const powerValues = connections
        .map((c) => c.PowerKW || 0)
        .filter((p) => p > 0);

    return {
        details,
        maxPowerKW: powerValues.length > 0 ? Math.max(...powerValues) : 22,
        minPowerKW: powerValues.length > 0 ? Math.min(...powerValues) : 22,
    };
}

function generateSimulationValues(chargers: number) {
    const inventoryCap = chargers * 4 + Math.floor(Math.random() * 10);
    const currentInventory = Math.floor(inventoryCap * (0.5 + Math.random() * 0.4));
    const chargingBatteries = Math.min(chargers, Math.floor(Math.random() * chargers * 0.8));
    const queueLength = Math.floor(Math.random() * 5);
    const utilizationRate = 0.3 + Math.random() * 0.6;

    return {
        inventoryCap,
        currentInventory,
        chargingBatteries,
        queueLength,
        utilizationRate: Math.min(0.99, utilizationRate),
        avgWaitTime: Math.max(0.5, queueLength * 1.5 + Math.random() * 2),
        totalSwaps: Math.floor(Math.random() * 200) + 50,
        lostSwaps: Math.floor(Math.random() * 10),
        peakQueueLength: queueLength + Math.floor(Math.random() * 5),
    };
}

export function adaptOCMStations(ocmStations: OCMStation[]): Station[] {
    return ocmStations
        .filter((ocm) => ocm.AddressInfo?.Latitude && ocm.AddressInfo?.Longitude)
        .map((ocm, index): Station => {
            const chargers = getChargerCount(ocm);
            const simValues = generateSimulationValues(chargers);
            const position = geoToPercent(ocm.AddressInfo.Latitude, ocm.AddressInfo.Longitude);
            const geoPosition: GeoPosition = {
                lat: ocm.AddressInfo.Latitude,
                lng: ocm.AddressInfo.Longitude,
            };

            const name = ocm.AddressInfo.Title || ocm.OperatorInfo?.Title || `Station ${index + 1}`;
            const location = [ocm.AddressInfo.Town, ocm.AddressInfo.StateOrProvince]
                .filter(Boolean)
                .join(', ') || 'Delhi NCR';

            // Extract connection details and power ratings
            const { details, maxPowerKW, minPowerKW } = extractConnectionDetails(ocm.Connections);

            // Build full address
            const address = [
                ocm.AddressInfo.AddressLine1,
                ocm.AddressInfo.Town,
                ocm.AddressInfo.StateOrProvince
            ]
                .filter(Boolean)
                .join(', ');

            return {
                id: `real-station-${ocm.ID}`,
                name: name.length > 30 ? name.slice(0, 30) + '...' : name,
                location,
                position,
                chargers,
                activeChargers: chargers,
                chargerType: getChargerType(ocm.Connections),
                bays: chargers * 5,
                ...simValues,
                status: ocm.StatusType?.IsOperational === false ? 'offline' : 'operational',
                operatingHours: { start: 0, end: 24 },
                coverageRadius: chargers >= 10 ? 4 : chargers >= 6 ? 3 : 2,
                geoPosition,

                // Additional real-world data
                address: address || undefined,
                operator: ocm.OperatorInfo?.Title,
                usageCost: ocm.UsageCost,
                connectionDetails: details.length > 0 ? details : undefined,
                maxPowerKW,
                minPowerKW,
                isRealStation: true,
            };
        });
}

export async function fetchRealStations(): Promise<Station[]> {
    try {
        const response = await fetch('/api/stations');
        if (!response.ok) throw new Error('API request failed');
        const data = await response.json();
        return adaptOCMStations(data.stations || []);
    } catch (error) {
        console.error('Failed to fetch real stations:', error);
        return [];
    }
}
