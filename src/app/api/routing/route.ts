import { NextRequest, NextResponse } from 'next/server';

// Module-level cache (1 hour — stations don't move)
let cachedMatrix: { data: RoutingResponse; hash: string; timestamp: number } | null = null;
const CACHE_DURATION_MS = 60 * 60 * 1000;

interface RoutingResponse {
    distances: number[][] | null;
    durations: number[][] | null;
    stationIds: string[];
    fallback: boolean;
}

const FALLBACK: RoutingResponse = {
    distances: null,
    durations: null,
    stationIds: [],
    fallback: true,
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const stations: { id: string; lat: number; lng: number }[] = body.stations;

        if (!stations || stations.length < 2) {
            return NextResponse.json(FALLBACK);
        }

        // Create a hash for cache key
        const hash = stations.map(s => `${s.id}:${s.lat.toFixed(4)},${s.lng.toFixed(4)}`).join('|');

        // Check cache
        if (cachedMatrix && cachedMatrix.hash === hash && Date.now() - cachedMatrix.timestamp < CACHE_DURATION_MS) {
            return NextResponse.json(cachedMatrix.data);
        }

        const apiKey = process.env.ORS_API_KEY;
        if (!apiKey) {
            console.warn('ORS_API_KEY not set, returning fallback routing');
            return NextResponse.json(FALLBACK);
        }

        const locations = stations.map(s => [s.lng, s.lat]); // ORS expects [lng, lat]

        const response = await fetch('https://api.openrouteservice.org/v2/matrix/driving-car', {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                locations,
                metrics: ['distance', 'duration'],
                units: 'm',
            }),
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            console.error('ORS API error:', response.status, await response.text());
            return NextResponse.json(FALLBACK);
        }

        const json = await response.json();

        const data: RoutingResponse = {
            distances: json.distances || null,
            durations: json.durations || null,
            stationIds: stations.map(s => s.id),
            fallback: false,
        };

        cachedMatrix = { data, hash, timestamp: Date.now() };
        return NextResponse.json(data);
    } catch (error) {
        console.error('Routing fetch error:', error);
        return NextResponse.json(FALLBACK);
    }
}
