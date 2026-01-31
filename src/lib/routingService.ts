import { RoutingMatrix, Station } from '@/simulation/types';
import { percentToGeo } from '@/lib/geoUtils';

export async function fetchRoutingMatrix(stations: Station[]): Promise<RoutingMatrix> {
    try {
        const stationCoords = stations.map(s => {
            const geo = s.geoPosition || percentToGeo(s.position.x, s.position.y);
            return { id: s.id, lat: geo.lat, lng: geo.lng };
        });

        const response = await fetch('/api/routing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stations: stationCoords }),
        });

        if (!response.ok) throw new Error(`Routing API returned ${response.status}`);
        const data = await response.json();
        return data as RoutingMatrix;
    } catch (error) {
        console.error('Failed to fetch routing matrix:', error);
        return {
            distances: null,
            durations: null,
            stationIds: [],
            fallback: true,
        };
    }
}
